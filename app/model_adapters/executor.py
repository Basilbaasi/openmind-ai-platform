"""
Model Adapter Executor.

Executes per-model Python adapter code with injected runtime variables.
Each model has its own adapter code that uses standardized variable names:

INPUT VARIABLES (injected before execution):
  - api_key      : str   — The model's provider API key
  - messages     : list  — Full chat history as [{"role": "user", "content": "..."}]
  - user_message : str   — The latest user message text
  - temperature  : float — Sampling temperature
  - max_tokens   : int   — Maximum response tokens
  - top_p        : float — Nucleus sampling parameter

OUTPUT VARIABLE (the adapter code MUST set this):
  - response_text : str  — The model's reply text

PRE-IMPORTED MODULES available to adapter code:
  - requests, base64, json
"""

import base64
import ast
import io
import json
import logging
import os
import sys
import traceback
from contextlib import redirect_stdout

import requests

logger = logging.getLogger(__name__)

# Directory where adapter code files are saved alongside the model ID
ADAPTERS_DIR = os.path.join(os.path.dirname(__file__), "saved")


def validate_adapter_code(adapter_code: str) -> None:
    """Validate the platform adapter contract before a model is deployed.

    Provider payloads may differ, but adapters must consume the same injected
    runtime variables. The platform owns ``stream`` and switches it for each
    request, so user code must not overwrite it.
    """
    try:
        tree = ast.parse(adapter_code)
    except SyntaxError as exc:
        raise ValueError(f"Adapter code has a syntax error on line {exc.lineno}: {exc.msg}") from exc

    referenced_names = {node.id for node in ast.walk(tree) if isinstance(node, ast.Name)}
    missing = {"api_key", "messages", "stream"} - referenced_names
    if missing:
        raise ValueError(
            "Adapter code must use the injected variable(s): " + ", ".join(sorted(missing)) + "."
        )

    for node in ast.walk(tree):
        targets = []
        if isinstance(node, ast.Assign):
            targets = node.targets
        elif isinstance(node, ast.AnnAssign):
            targets = [node.target]
        if any(isinstance(target, ast.Name) and target.id == "stream" for target in targets):
            raise ValueError(
                "Do not assign a value to 'stream'. It is injected by the platform and is True for /chat/stream."
            )

        if isinstance(node, ast.Dict):
            for key, value in zip(node.keys, node.values):
                if isinstance(key, ast.Constant) and key.value == "messages" and not (
                    isinstance(value, ast.Name) and value.id == "messages"
                ):
                    raise ValueError("The provider payload must use 'messages': messages to preserve chat context.")
                if isinstance(key, ast.Constant) and key.value == "stream" and not (
                    isinstance(value, ast.Name) and value.id == "stream"
                ):
                    raise ValueError("The provider payload must use 'stream': stream for platform streaming.")


def ensure_adapters_dir() -> None:
    """Create the saved adapters directory if it doesn't exist."""
    os.makedirs(ADAPTERS_DIR, exist_ok=True)


def save_adapter_file(model_id: str, adapter_code: str) -> str:
    """
    Save a model's adapter code to a Python file named by the model ID.

    Returns the file path.
    """
    ensure_adapters_dir()
    safe_name = model_id.replace("/", "_").replace("\\", "_").replace(" ", "_")
    filepath = os.path.join(ADAPTERS_DIR, f"{safe_name}.py")
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(adapter_code)
    logger.info("Saved adapter code for model '%s' to %s", model_id, filepath)
    return filepath


def get_saved_adapter_code(model_id: str) -> str | None:
    """Return the saved adapter code when a deployed adapter file exists."""
    safe_name = model_id.replace("/", "_").replace("\\", "_").replace(" ", "_")
    filepath = os.path.join(ADAPTERS_DIR, f"{safe_name}.py")
    try:
        with open(filepath, "r", encoding="utf-8") as adapter_file:
            return adapter_file.read()
    except FileNotFoundError:
        return None


def get_env_key_for_model(model_id: str) -> str:
    """Sanitize the model ID to be a valid environment variable name."""
    import re
    sanitized = re.sub(r'[^a-zA-Z0-9_]', '_', model_id).upper()
    return f"MODEL_{sanitized}_API_KEY"


def set_env_var(key: str, value: str) -> None:
    """Set an environment variable in the .env file and os.environ."""
    # Update current process environment
    os.environ[key] = value

    # Update .env file
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
    lines = []
    updated = False

    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

    for i, line in enumerate(lines):
        if line.strip().startswith(f"{key}="):
            lines[i] = f"{key}={value}\n"
            updated = True
            break

    if not updated:
        lines.append(f"{key}={value}\n")

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    logger.info("Saved environment variable '%s' to .env file", key)


def delete_env_var(key: str) -> None:
    """Delete an environment variable from the .env file and os.environ."""
    # Remove from current process environment
    if key in os.environ:
        del os.environ[key]

    # Update .env file
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
    if not os.path.exists(env_path):
        return

    lines = []
    with open(env_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    new_lines = [line for line in lines if not line.strip().startswith(f"{key}=")]

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
    logger.info("Deleted environment variable '%s' from .env file", key)


def get_model_api_key(model_id: str) -> str:
    """Get the API key for a model, prioritizing os.environ or .env file."""
    key = get_env_key_for_model(model_id)
    if key in os.environ:
        return os.environ[key]

    # Fallback: Read directly from .env file
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip().startswith(f"{key}="):
                    return line.strip().split("=", 1)[1]

    return ""


def delete_adapter_file(model_id: str) -> None:
    """Delete a model's saved adapter file.

    Provider keys are stored with the model record and never written to the
    container's .env file. This keeps Docker deployments stateless and avoids
    filesystem-permission failures when deploying or deleting a model.
    """
    ensure_adapters_dir()

    # Standard safe name conversions
    safe_id = model_id.replace("/", "_").replace("\\", "_").replace(" ", "_").replace("-", "_")
    safe_name = model_id.replace("/", "_").replace("\\", "_").replace(" ", "_")

    filenames_to_try = [
        f"{safe_name}.py",
        f"{safe_id}.py",
        f"{model_id}.py",
    ]
    if "nvidia" in model_id.lower() and "ising" in model_id.lower():
        filenames_to_try.append("nvidia_ising.py")

    for filename in filenames_to_try:
        # Check in saved/ folder
        filepath_saved = os.path.join(ADAPTERS_DIR, filename)
        if os.path.exists(filepath_saved):
            try:
                os.remove(filepath_saved)
                logger.info("Deleted adapter file for model '%s' from saved/: %s", model_id, filepath_saved)
            except Exception as e:
                logger.error("Failed to delete saved adapter file: %s", e)

        # Check in parent model_adapters/ folder
        filepath_parent = os.path.join(os.path.dirname(ADAPTERS_DIR), filename)
        if os.path.exists(filepath_parent):
            try:
                os.remove(filepath_parent)
                logger.info("Deleted adapter file for model '%s' from parent/: %s", model_id, filepath_parent)
            except Exception as e:
                logger.error("Failed to delete parent adapter file: %s", e)


def _extract_content_from_json(data) -> str | None:
    """Helper to extract chat content from standard provider JSON formats."""
    if not isinstance(data, dict):
        return None

    # OpenAI / NVIDIA / DeepSeek format: choices[0].message.content
    choices = data.get("choices")
    if choices and isinstance(choices, list) and len(choices) > 0:
        first_choice = choices[0]
        if isinstance(first_choice, dict):
            # Normal chat completion message content
            message = first_choice.get("message")
            if isinstance(message, dict):
                content = message.get("content")
                if content:
                    return str(content)
            # Delta streaming content fallback
            delta = first_choice.get("delta")
            if isinstance(delta, dict):
                content = delta.get("content")
                if content:
                    return str(content)
            # Text completion fallback
            text = first_choice.get("text")
            if text:
                return str(text)

    # Gemini format: candidates[0].content.parts[0].text
    candidates = data.get("candidates")
    if candidates and isinstance(candidates, list) and len(candidates) > 0:
        first_candidate = candidates[0]
        if isinstance(first_candidate, dict):
            content = first_candidate.get("content")
            if isinstance(content, dict):
                parts = content.get("parts")
                if parts and isinstance(parts, list) and len(parts) > 0:
                    text = parts[0].get("text")
                    if text:
                        return str(text)

    # Anthropic / Claude format: content[0].text
    claude_content = data.get("content")
    if claude_content and isinstance(claude_content, list) and len(claude_content) > 0:
        first_item = claude_content[0]
        if isinstance(first_item, dict):
            text = first_item.get("text")
            if text:
                return str(text)

    # Simple direct fields (e.g. Ollama, simple APIs)
    if "content" in data:
        return str(data["content"])
    if "text" in data:
        return str(data["text"])
    if "response" in data:
        return str(data["response"])

    return None


def execute_model_adapter(
    adapter_code: str,
    api_key: str,
    messages: list[dict],
    temperature: float = 0.7,
    max_tokens: int = 1024,
    top_p: float = 0.95,
) -> str:
    """
    Execute a model's adapter code and return the response text.

    The adapter code is exec()'d in a namespace with the standard
    input variables pre-injected. If the code does not set `response_text`,
    the engine automatically captures printed standard output or extracts
    the reply from any `response` object.

    Args:
        adapter_code: The raw Python code string to execute.
        api_key: The model's provider API key.
        messages: Full chat history as a list of role/content dicts.
        temperature: Sampling temperature.
        max_tokens: Maximum number of tokens in the response.
        top_p: Nucleus sampling parameter.

    Returns:
        The model's response text.
    """
    if not adapter_code or not adapter_code.strip():
        return "Error: No adapter code configured for this model. Please add provider code in the model settings."

    # Extract the latest user message
    user_message = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            user_message = msg.get("content", "")
            break

    # Build the execution namespace with injected variables
    exec_globals = {
        "__builtins__": __builtins__,
        # Pre-imported modules the adapter code can use
        "requests": requests,
        "base64": base64,
        "json": json,
        # Input variables — standardized names across all adapters
        "api_key": api_key,
        "messages": messages,
        "user_message": user_message,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "top_p": top_p,
        # Output variable — the adapter can set this directly
        "response_text": "",
    }

    # Redirect stdout to capture prints
    stdout_buffer = io.StringIO()
    try:
        with redirect_stdout(stdout_buffer):
            exec(adapter_code, exec_globals)  # noqa: S102
    except Exception:
        error_trace = traceback.format_exc()
        logger.error(
            "Adapter code execution failed:\n%s",
            error_trace,
        )
        return f"Error executing model adapter code:\n{error_trace}"

    result = exec_globals.get("response_text", "")
    captured_stdout = stdout_buffer.getvalue().strip()

    # ── Intelligent Fallback Extraction ──
    if not result:
        # Fallback 1: Look for a "response" variable in the executed namespace
        response_obj = exec_globals.get("response")
        if response_obj is not None and hasattr(response_obj, "json"):
            try:
                data = response_obj.json()
                extracted = _extract_content_from_json(data)
                if extracted:
                    result = extracted
            except Exception:
                pass

    if not result and captured_stdout:
        # Fallback 2: Try to parse printed output as JSON
        try:
            # Replace single quotes with double quotes for valid JSON parsing
            cleaned_stdout = captured_stdout.replace("'", '"')
            data = json.loads(cleaned_stdout)
            extracted = _extract_content_from_json(data)
            if extracted:
                result = extracted
        except Exception:
            # Fallback 3: If not JSON, use the raw printed text
            result = captured_stdout

    if not result:
        return "Warning: Adapter code executed successfully but no response text could be extracted. Make sure your code sets `response_text` or prints/contains the response."

    return str(result)


def extract_text_from_chunk(printed_line: str) -> str:
    """Return displayable text from one provider streaming event.

    Adapters may print provider-native SSE lines.  This is the boundary where
    those formats are normalised, so provider metadata and private reasoning
    must never leak into the platform's public chat stream.
    """
    printed_line = printed_line.strip()
    if not printed_line:
        return ""

    if printed_line.startswith("data:"):
        printed_line = printed_line[5:].strip()
        if printed_line == "[DONE]":
            return ""

    # OpenAI-compatible providers (including NVIDIA, OpenRouter, DeepSeek).
    # Deliberately read only ``content``: reasoning/thinking deltas are not
    # user-facing answer text and are often sent before content.
    try:
        data = json.loads(printed_line)
        if isinstance(data, dict):
            if "choices" in data and len(data["choices"]) > 0:
                choice = data["choices"][0]
                if "delta" in choice:
                    delta = choice["delta"]
                    content = delta.get("content") if isinstance(delta, dict) else None
                    if content:
                        return str(content)
                if "message" in choice:
                    message = choice["message"]
                    content = message.get("content") if isinstance(message, dict) else None
                    if content:
                        return str(content)

            # Anthropic streaming event: {"type":"content_block_delta",
            # "delta":{"type":"text_delta","text":"..."}}
            delta = data.get("delta")
            if isinstance(delta, dict) and delta.get("type") == "text_delta":
                text = delta.get("text")
                if text:
                    return str(text)

            # Gemini REST streaming event.
            candidates = data.get("candidates")
            if isinstance(candidates, list) and candidates:
                parts = (candidates[0].get("content") or {}).get("parts", [])
                if isinstance(parts, list):
                    return "".join(str(part["text"]) for part in parts if isinstance(part, dict) and part.get("text"))

            # It was valid provider JSON, even if it contained no visible text.
            return ""
    except Exception:
        pass

    # An adapter can intentionally print plain text chunks.  Do not discard
    # them, but never forward malformed structured events as visible text.
    if printed_line.startswith(("{", "[")):
        return ""
    return printed_line


def execute_model_adapter_stream(
    adapter_code: str,
    api_key: str,
    messages: list[dict],
    temperature: float = 0.7,
    max_tokens: int = 1024,
    top_p: float = 0.95,
):
    """
    Execute a model's adapter code in a background thread and yield captured prints in real-time.
    Forces 'stream = True' inside the execution namespace.
    """
    import queue
    import threading

    q = queue.Queue()

    # Custom print function that puts printed strings in the queue
    def custom_print(*args, **kwargs):
        sep = kwargs.get("sep", " ")
        end = kwargs.get("end", "\n")
        msg = sep.join(str(arg) for arg in args) + end
        q.put(msg)

    # Extract the latest user message
    user_message = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            user_message = msg.get("content", "")
            break

    # Build the execution namespace
    exec_globals = {
        "__builtins__": __builtins__,
        "requests": requests,
        "base64": base64,
        "json": json,
        "api_key": api_key,
        "messages": messages,
        "user_message": user_message,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "top_p": top_p,
        "stream": True,  # Force streaming mode so the adapter runs the print loop
        "print": custom_print,  # Override print function
        "response_text": "",
    }

    def run_adapter():
        try:
            exec(adapter_code, exec_globals)  # noqa: S102
        except requests.HTTPError as exc:
            status_code = exc.response.status_code if exc.response is not None else None
            if status_code in (401, 403):
                q.put("Error: The provider rejected this model's API key. Check the key and redeploy the model configuration.")
            elif status_code:
                q.put(f"Error: The provider returned HTTP {status_code}. Check the model ID and provider configuration.")
            else:
                q.put("Error: The provider request failed before a response was received.")
        except requests.RequestException:
            q.put("Error: Could not reach the model provider. Check the provider URL and network connection.")
        except Exception:
            logger.exception("Model adapter execution failed")
            q.put("Error: The model adapter configuration is invalid. Review its adapter code and settings.")
        finally:
            q.put(None)  # Sentinel to end stream

    # Start execution in a background thread
    t = threading.Thread(target=run_adapter)
    t.daemon = True
    t.start()

    full_output = []
    while True:
        try:
            item = q.get(timeout=0.1)
            if item is None:
                break
            full_output.append(item)
            yield item
        except queue.Empty:
            if not t.is_alive() and q.empty():
                break

    # Fallback to response_text if nothing was printed
    response_text = exec_globals.get("response_text", "")
    if response_text and not full_output:
        yield response_text

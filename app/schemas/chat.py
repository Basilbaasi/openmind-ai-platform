from enum import Enum

from pydantic import BaseModel, Field


class RoleEnum(str, Enum):
    system = "system"
    user = "user"
    assistant = "assistant"
    tool = "tool"


class ChatMessage(BaseModel):
    role: RoleEnum = Field(..., description="Role of the message author")
    content: str = Field(..., description="Content of the message")


class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(
        ..., description="A list of previous messages in the conversation"
    )
    model: str = Field("default", description="The ID of the model to use")
    session_id: str | None = Field(
        None, description="Optional session ID to associate this conversation"
    )
    temperature: float = Field(0.7, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: int | None = Field(None, description="Maximum number of tokens to generate")


class ChatResponse(BaseModel):
    id: str = Field(..., description="Unique identifier for the chat completion")
    object: str = Field("chat.completion", description="Object type")
    created: int = Field(..., description="Unix timestamp of when the response was created")
    model: str = Field(..., description="The model used for completion")
    message: ChatMessage = Field(..., description="The generated message")
    finish_reason: str = Field(..., description="Reason why the model stopped generating")
    usage: TokenUsage = Field(..., description="Token usage statistics")
    session_id: str | None = Field(None, description="The session ID, if provided or generated")


class ChatStreamResponse(BaseModel):
    id: str = Field(..., description="Unique identifier for the chat completion")
    object: str = Field("chat.completion.chunk", description="Object type")
    created: int = Field(..., description="Unix timestamp of when the response was created")
    model: str = Field(..., description="The model used for completion")
    chunk: str = Field(..., description="The generated text chunk")
    finish_reason: str | None = Field(
        None,
        description="Reason why the model stopped generating (only present in the final chunk)",
    )
    session_id: str | None = Field(None, description="The session ID, if provided or generated")

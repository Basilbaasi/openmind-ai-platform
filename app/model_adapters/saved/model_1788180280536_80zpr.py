import requests

# Universal HuggingFace local container endpoint
url = "http://host.docker.internal:8001/embed"

headers = {
    "Content-Type": "application/json"
}

if api_key and api_key.strip():
    headers["Authorization"] = f"Bearer {api_key}"

payload = {
    "input": input,
    "input_type": input_type
}

response = requests.post(
    url,
    headers=headers,
    json=payload,
    timeout=60
)

response.raise_for_status()

data = response.json()
embeddings = data.get("embeddings") or [item["embedding"] for item in data.get("data", [])]

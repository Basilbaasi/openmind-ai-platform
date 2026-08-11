import requests

url = "https://integrate.api.nvidia.com/v1/chat/completions"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
    "Accept": "text/event-stream" if stream else "application/json",
}

payload = {
    "model": "thinkingmachines/inkling",
    "messages": messages,
    "temperature": temperature,
    "top_p": top_p,
    "max_tokens": max_tokens,
    "stream": stream,
}

response = requests.post(
    url,
    headers=headers,
    json=payload,
    stream=stream,
)

response.raise_for_status()

if stream:
    for line in response.iter_lines(chunk_size=1, decode_unicode=True):
        if line:
            print(line)
else:
    data = response.json()
    response_text = data["choices"][0]["message"]["content"]

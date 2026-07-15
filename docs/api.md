# OpenMind AI Platform — API Reference

> **Version:** 0.2.0 (API Contract Design)
>
> **Base URL:** `http://localhost:8000`

This document describes every endpoint currently available in the OpenMind AI Platform.

---

## Table of Contents

- [Root Endpoint](#root-endpoint)
- [Health Check](#health-check)
- [Chat Domain](#chat-domain)
- [Models Domain](#models-domain)
- [Sessions Domain](#sessions-domain)
- [API Documentation](#api-documentation)
- [OpenAPI Schema](#openapi-schema)
- [Error Responses](#error-responses)

---

## Root Endpoint

Returns basic information about the API and a link to the interactive documentation.

### Request

```
GET /
```

**Parameters:** None

**Headers:** None required

### Response

| Field | Type | Description |
|-------|------|-------------|
| `message` | `string` | Welcome message including the application name |
| `version` | `string` | Semantic version of the running application |
| `docs_url` | `string` | URL path to the interactive Swagger documentation |

### Status Codes

| Code | Description |
|------|-------------|
| `200 OK` | Successful response |

### Example

**Request:**

```bash
curl -s http://localhost:8000/ | python -m json.tool
```

**Response:**

```json
{
    "message": "Welcome to OpenMind AI Platform",
    "version": "0.1.0",
    "docs_url": "/docs"
}
```

---

## Health Check

Returns the current health status of the service. Used by load balancers, container orchestrators (Kubernetes, Docker), and monitoring tools for liveness probes.

### Request

```
GET /health
```

**Parameters:** None

**Headers:** None required

### Response

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | Current health status (`"healthy"`) |
| `version` | `string` | Semantic version of the running application |
| `environment` | `string` | Deployment environment (`"development"`, `"staging"`, `"production"`) |
| `timestamp` | `string` (ISO 8601) | UTC timestamp of the health check |

### Status Codes

| Code | Description |
|------|-------------|
| `200 OK` | Service is healthy |

### Example

**Request:**

```bash
curl -s http://localhost:8000/health | python -m json.tool
```

**Response:**

```json
{
    "status": "healthy",
    "version": "0.1.0",
    "environment": "development",
    "timestamp": "2026-07-09T12:00:00.000000"
}
```

### Usage in Docker

```yaml
healthcheck:
  test: ["CMD", "curl", "--fail", "--silent", "http://localhost:8000/health"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 10s
```

### Usage in Kubernetes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 30
  timeoutSeconds: 5
  failureThreshold: 3
```

---

## Chat Domain

### POST /chat

Generates a complete chat response (blocking request).

**Request:**

```json
{
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "model": "gpt-4",
  "temperature": 0.7
}
```

**Response (200 OK):**

```json
{
  "id": "chatcmpl-12345",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4",
  "message": {
    "role": "assistant",
    "content": "This is a deterministic mock response from the ChatService."
  },
  "finish_reason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 12,
    "total_tokens": 22
  }
}
```

### POST /chat/stream

Generates a streaming chat response using Server-Sent Events (SSE).

**Response:** Content-Type: `text/event-stream`

```text
data: {"id": "chatcmpl-12345", "object": "chat.completion.chunk", "created": 1677652288, "model": "gpt-4", "chunk": "This ", "finish_reason": null}

data: {"id": "chatcmpl-12345", "object": "chat.completion.chunk", "created": 1677652288, "model": "gpt-4", "chunk": "is ", "finish_reason": null}

data: [DONE]
```

---

## Models Domain

### GET /models

Retrieves the list of available models.

**Response (200 OK):**

```json
{
  "models": [
    {
      "id": "mock-chat-v1",
      "name": "Mock Chat Model Fast",
      "provider": "local",
      "version": "1.0",
      "capabilities": ["chat"],
      "max_context_length": 8192,
      "available": true
    }
  ],
  "total": 1
}
```

---

## Sessions Domain

### POST /sessions

Creates a new conversation session.

**Request:**

```json
{
  "title": "My Session",
  "metadata": {"tag": "important"}
}
```

**Response (201 Created):**

```json
{
  "id": "uuid-string-here",
  "title": "My Session",
  "created_at": "2026-07-15T12:00:00Z",
  "updated_at": "2026-07-15T12:00:00Z",
  "metadata": {"tag": "important"}
}
```

### GET /sessions

Lists existing conversation sessions.

**Response (200 OK):**

```json
{
  "sessions": [
    {
      "id": "uuid-string-here",
      "title": "My Session",
      "created_at": "2026-07-15T12:00:00Z",
      "updated_at": "2026-07-15T12:00:00Z",
      "metadata": {}
    }
  ],
  "total": 1
}
```

### DELETE /sessions/{session_id}

Deletes a conversation session.

**Response (204 No Content):** Empty body.

---

## API Documentation

FastAPI automatically generates interactive API documentation from the route definitions and Pydantic schemas.

### Swagger UI

```
GET /docs
```

Interactive API explorer with a "Try it out" feature for testing endpoints directly in the browser.

### ReDoc

```
GET /redoc
```

Alternative documentation with a clean, three-panel layout optimized for reading.

---

## OpenAPI Schema

Returns the raw OpenAPI 3.1 specification in JSON format. Useful for code generation, API client libraries, and CI validation.

### Request

```
GET /openapi.json
```

### Response

Returns a full OpenAPI 3.1 specification including:
- API metadata (title, version, description)
- Path definitions for all endpoints
- Schema definitions for all request/response models

### Status Codes

| Code | Description |
|------|-------------|
| `200 OK` | Schema returned successfully |

### Example

**Request:**

```bash
curl -s http://localhost:8000/openapi.json | python -m json.tool
```

**Response (abbreviated):**

```json
{
    "openapi": "3.1.0",
    "info": {
        "title": "OpenMind AI Platform",
        "version": "0.1.0",
        "description": "A production-grade AI platform providing intelligent services."
    },
    "paths": {
        "/": { "get": { "..." : "..." } },
        "/health": { "get": { "..." : "..." } }
    }
}
```

---

## Error Responses

The platform uses a standardized `APIError` schema for all HTTP and validation errors.

### 422 Validation Error Example

```json
{
  "error_type": "validation_error",
  "message": "The request payload is invalid.",
  "details": [
    {
      "loc": ["body", "messages"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

### 404 Not Found Example

```json
{
  "error_type": "http_error",
  "message": "Session mock-id not found."
}
```

### 500 Internal Server Error Example

```json
{
  "error_type": "internal_server_error",
  "message": "An unexpected internal error occurred."
}
```

---

## Response Headers

All responses include the following headers:

| Header | Value | Description |
|--------|-------|-------------|
| `content-type` | `application/json` | All endpoints return JSON |
| `access-control-allow-origin` | Configured via `CORS_ORIGINS` | CORS header (default: `*`) |

---

## Rate Limiting

> **Not implemented in v0.1.0.** Rate limiting is planned for Milestone 6 (Production Hardening).

---

## Authentication

> **Not implemented in v0.1.0.** Authentication is planned for Milestone 6 (Production Hardening).

# OpenMind AI Platform — API Reference

> **Version:** 0.1.0 (Backend Foundation)
>
> **Base URL:** `http://localhost:8000`

This document describes every endpoint currently available in the OpenMind AI Platform.

---

## Table of Contents

- [Root Endpoint](#root-endpoint)
- [Health Check](#health-check)
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

### 404 Not Found

Returned when accessing an undefined route.

```json
{
    "detail": "Not Found"
}
```

### 405 Method Not Allowed

Returned when using an unsupported HTTP method on a defined route.

```json
{
    "detail": "Method Not Allowed"
}
```

### 422 Unprocessable Entity

Returned when request validation fails (relevant for future endpoints with request bodies).

```json
{
    "detail": [
        {
            "loc": ["body", "field_name"],
            "msg": "Field required",
            "type": "missing"
        }
    ]
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

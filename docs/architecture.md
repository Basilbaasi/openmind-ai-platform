# OpenMind AI Platform — Architecture

This document describes the system architecture, component relationships, and request flow for the OpenMind AI Platform backend.

> **Scope:** This document reflects the v0.2.0 (API Contract Design) release. Components marked with *(future)* are planned for upcoming milestones.

---

## System Overview

The platform is a **Python FastAPI** application following a layered architecture with clear separation of concerns. Each layer communicates only with the layer directly below it, ensuring testability and modularity.

```mermaid
graph TB
    subgraph Clients
        A[Web Browser]
        B[Mobile App]
        C[CLI / SDK]
    end

    subgraph API["API Layer (FastAPI)"]
        D[CORS Middleware]
        E[Router]
        F[Health Routes]
        G[Chat Routes]
        H[Session & Model Routes]
    end

    subgraph Services["Service Layer"]
        I[Chat Service]
        J[Session & Model Services]
    end

    subgraph Storage["Storage Layer"]
        K[Database<br/><i>future</i>]
        L[Cache<br/><i>future</i>]
    end

    subgraph Core["Core Infrastructure"]
        M[Config<br/>Pydantic Settings]
        N[Logging<br/>structlog]
        O[Lifespan<br/>Startup / Shutdown]
    end

    A & B & C -->|HTTP| D
    D --> E
    E --> F & G & H
    G & H --> I & J
    I & J --> K & L
    M -.->|configures| D & E & F & O
    N -.->|used by| F & O
    O -.->|manages| M & N
```

---

## Request Flow

Every HTTP request passes through the following pipeline:

```mermaid
sequenceDiagram
    participant C as Client
    participant M as CORS Middleware
    participant R as APIRouter
    participant H as Route Handler
    participant S as Settings
    participant Sc as Schema

    C->>M: HTTP Request
    M->>M: Validate CORS headers
    M->>R: Forward request
    R->>H: Route to handler
    H->>S: get_settings()
    S-->>H: Settings (cached)
    H->>Sc: Build response model
    Sc-->>H: Validated response
    H-->>R: Return response
    R-->>M: Response
    M-->>C: HTTP Response + CORS headers
```

### Example: `GET /health`

1. Client sends `GET /health`
2. CORS middleware validates origin headers
3. Router matches the path to `health_check()` handler
4. Handler calls `get_settings()` (returns cached singleton)
5. Handler constructs `HealthResponse` schema with status, version, environment, timestamp
6. Pydantic validates and serializes the response
7. FastAPI returns JSON with `200 OK`

---

## Application Startup

The application uses FastAPI's lifespan context manager for resource lifecycle management:

```mermaid
sequenceDiagram
    participant U as Uvicorn
    participant F as FastAPI
    participant L as Lifespan
    participant C as Config
    participant Log as Logging

    U->>F: Start ASGI app
    F->>L: Enter lifespan context

    rect rgb(34, 139, 34, 0.1)
        Note over L: Startup Phase
        L->>C: get_settings()
        C-->>L: Settings (validated)
        L->>Log: setup_logging(level, format)
        Log-->>L: Logging configured
        L->>L: Log "application_startup"
        Note over L: Future: init DB pool, cache, etc.
    end

    L->>F: yield (app serves requests)

    rect rgb(178, 34, 34, 0.1)
        Note over L: Shutdown Phase
        L->>L: Log "application_shutdown"
        Note over L: Future: close DB, flush telemetry
    end

    L->>F: Context exits
    F->>U: ASGI app stopped
```

---

## Application Factory

The `create_application()` factory function constructs a fully configured FastAPI instance:

```mermaid
flowchart LR
    A[create_application] --> B[Load Settings]
    B --> C[Create FastAPI Instance]
    C --> D[Add CORS Middleware]
    D --> E[Include API Router]
    E --> F[Return app]

    style A fill:#1a1a2e,stroke:#e94560,color:#fff
    style F fill:#1a1a2e,stroke:#0f3460,color:#fff
```

**Why a factory?**

| Benefit | Explanation |
|---------|-------------|
| **Testability** | Tests create fresh app instances — no shared state between test suites |
| **Flexibility** | ASGI servers import and call the factory directly |
| **Clarity** | All wiring (middleware, routers, lifespan) is explicit and centralized |

---

## Folder Architecture

```
openmind-ai-platform/
│
├── app/                          # Application source
│   ├── main.py                   # Application factory (create_application)
│   ├── api/                      # HTTP layer
│   │   ├── router.py             # Central router — aggregates all domain routers
│   │   ├── errors.py             # Global exception handlers
│   │   └── routes/               # Individual route modules
│   │       ├── health.py         # GET / and GET /health handlers
│   │       ├── chat.py           # POST /chat and /chat/stream
│   │       ├── sessions.py       # Session CRUD handlers
│   │       └── models.py         # Model discovery handlers
│   ├── core/                     # Cross-cutting infrastructure
│   │   ├── config.py             # Settings class + get_settings() singleton
│   │   ├── lifespan.py           # Async startup/shutdown lifecycle
│   │   └── logging.py            # structlog configuration
│   ├── schemas/                  # Pydantic DTOs (request/response models)
│   │   ├── health.py             # HealthResponse, RootResponse
│   │   ├── errors.py             # APIError, ErrorDetail
│   │   ├── chat.py               # ChatRequest, ChatResponse, etc.
│   │   ├── sessions.py           # Session schemas
│   │   └── models.py             # Model metadata schemas
│   ├── models/                   # Domain/ORM models (future)
│   ├── services/                 # Business logic
│   │   ├── chat_service.py       # Mock chat generation & streaming
│   │   ├── session_service.py    # Mock session CRUD logic
│   │   └── model_service.py      # Mock model discovery
│   ├── storage/                  # Persistence adapters (future)
│   └── utils/                    # Shared helpers
│
├── tests/                        # Automated test suite
│   ├── conftest.py               # Shared fixtures (app, async_client)
│   ├── test_health.py            # Endpoint tests
│   ├── test_config.py            # Configuration tests
│   └── test_application.py       # App factory & lifecycle tests
│
├── docs/                         # Project documentation
├── scripts/                      # Developer utility scripts
├── docker/                       # Docker-related configs (future)
├── benchmarks/                   # Performance benchmarks (future)
└── .github/workflows/            # CI/CD pipeline definitions
```

---

## Component Relationships

```mermaid
graph LR
    subgraph Entry["Entry Point"]
        main["main.py<br/>create_application()"]
    end

    subgraph Core
        config["config.py<br/>Settings + get_settings()"]
        lifespan["lifespan.py<br/>startup / shutdown"]
        logging["logging.py<br/>setup_logging()"]
    end

    subgraph API
        router["router.py<br/>api_router"]
        health_route["routes/health.py<br/>/ and /health"]
    end

    subgraph Schemas
        health_schema["schemas/health.py<br/>HealthResponse<br/>RootResponse"]
    end

    main -->|imports| config
    main -->|imports| lifespan
    main -->|imports| router
    router -->|includes| health_route
    health_route -->|imports| config
    health_route -->|imports| health_schema
    lifespan -->|imports| config
    lifespan -->|imports| logging

    style main fill:#e94560,stroke:#333,color:#fff
    style config fill:#0f3460,stroke:#333,color:#fff
    style lifespan fill:#0f3460,stroke:#333,color:#fff
    style logging fill:#0f3460,stroke:#333,color:#fff
    style router fill:#16213e,stroke:#333,color:#fff
    style health_route fill:#16213e,stroke:#333,color:#fff
    style health_schema fill:#533483,stroke:#333,color:#fff
```

---

## Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Separation of Concerns** | Each layer (API, Service, Storage) has a single responsibility |
| **Dependency Injection** | Services are injected via FastAPI's `Depends()` |
| **Configuration as Code** | All settings are environment-driven and validated at startup |
| **Fail Fast** | Invalid configuration is caught at startup, not at request time |
| **Testability** | Factory pattern + async client fixtures enable isolated testing |
| **12-Factor Compliance** | Config from env vars, stateless processes, port binding |

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Web Framework | FastAPI 0.115 | Async ASGI framework with auto-docs |
| ASGI Server | Uvicorn 0.34 | High-performance async server |
| Validation | Pydantic 2.11 | Data validation and serialization |
| Configuration | pydantic-settings 2.9 | Type-safe env var loading |
| Logging | structlog 25.4 | Structured logging (JSON + text) |
| HTTP Client | httpx 0.28 | Async HTTP client (for future LLM calls) |
| Testing | pytest 8.4 + pytest-asyncio | Async test framework |
| Linting | Ruff 0.11 | Fast Python linter and formatter |
| Type Checking | mypy 1.16 | Static type analysis |
| Containerization | Docker + Compose | Production deployment |

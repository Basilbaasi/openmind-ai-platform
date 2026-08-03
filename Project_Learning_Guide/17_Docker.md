# 17 — Docker

Dockerfile and docker-compose.yml explained line-by-line.

---

## Dockerfile — Multi-Stage Production Build

The Dockerfile uses a **two-stage build** to keep the final image small and secure.

### Stage 1: Builder (lines 10-23)

```dockerfile
FROM python:3.11-slim AS builder
WORKDIR /build

# Install build tools needed by some wheels (e.g., cryptography)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir --upgrade pip && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt
```

**What this does**:
1. Uses `python:3.11-slim` as base (minimal Debian + Python).
2. Installs `gcc` — needed to compile some Python packages (like `bcrypt`, `cryptography`).
3. Creates a **virtual environment** at `/opt/venv`.
4. Installs ALL Python dependencies into that virtual environment.
5. `--no-cache-dir`: Don't cache pip downloads (saves Docker layer space).

**Why a virtual env in Docker?** To cleanly copy ONLY the installed packages to the next stage, without bringing along build tools, pip cache, or system packages.

### Stage 2: Runtime (lines 26-65)

```dockerfile
FROM python:3.11-slim AS runtime

# Metadata
LABEL maintainer="OpenMind AI Team" version="0.2.0"

# Python optimizations
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1000 appuser && \
    useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser

WORKDIR /app

# Copy virtual-env from builder (THE KEY STEP)
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application source
COPY ./app ./app

# Switch to non-root user
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl --fail --silent http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Line-by-line**:

| Line | Purpose |
|------|---------|
| `PYTHONDONTWRITEBYTECODE=1` | Don't create `.pyc` bytecode files (saves space) |
| `PYTHONUNBUFFERED=1` | Print logs immediately (don't buffer stdout) |
| `curl` | Installed for the `HEALTHCHECK` command |
| Non-root user | **Security**: The app runs as `appuser` (UID 1000), not `root` |
| `COPY --from=builder` | Copies the virtual env from Stage 1 (no gcc, no build tools) |
| `ENV PATH=...` | Makes the virtual env's Python/pip the default |
| `COPY ./app ./app` | Only copies the `app/` directory (not tests, docs, client, etc.) |
| `HEALTHCHECK` | Docker/Kubernetes checks `/health` every 30s. If 3 consecutive failures → container marked unhealthy |
| `CMD` | Default command: run Uvicorn on port 8000 |

### What's NOT in the final image:
- ❌ `gcc` and build tools (only in builder stage)
- ❌ `tests/` directory
- ❌ `client/` directory
- ❌ `docs/`, `scripts/`, `.github/`
- ❌ `.env` file
- ❌ `docker-compose.yml`, `Dockerfile` itself

The `.dockerignore` file excludes all of these from the build context.

---

## docker-compose.yml — Development Stack

Defines three services that work together:

### Service 1: `postgres` — Database

```yaml
postgres:
    image: postgres:16-alpine
    container_name: openmind-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: openmind
      POSTGRES_PASSWORD: openmind
      POSTGRES_DB: openmind
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U openmind -d openmind"]
      interval: 10s
      timeout: 5s
      retries: 5
```

- **Image**: PostgreSQL 16 on Alpine Linux (small image).
- **Port 5432**: Standard PostgreSQL port, mapped to host.
- **Credentials**: user=`openmind`, password=`openmind`, database=`openmind`.
- **Volume**: `pgdata` persists database files across container restarts.
- **Health check**: `pg_isready` verifies PostgreSQL is accepting connections.

### Service 2: `pgadmin` — Database GUI

```yaml
pgadmin:
    image: dpage/pgadmin4:latest
    container_name: openmind-pgadmin
    ports:
      - "5050:80"
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@openmind.ai
      PGADMIN_DEFAULT_PASSWORD: admin
    depends_on:
      postgres:
        condition: service_healthy
```

- **Port 5050**: Access pgAdmin at `http://localhost:5050`.
- **Login**: email=`admin@openmind.ai`, password=`admin`.
- **Depends on**: Only starts after PostgreSQL is healthy.

### Service 3: `api` — FastAPI Backend

```yaml
api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: openmind-api
    ports:
      - "${PORT:-8000}:8000"
    env_file:
      - .env
    environment:
      - ENVIRONMENT=development
      - DATABASE_URL=postgresql+asyncpg://openmind:openmind@postgres:5432/openmind
    volumes:
      - ./app:/app/app          # Live-reload: mount source code
      - ./uploads:/app/uploads  # Persist uploaded files
    command: >
      uvicorn app.main:app
      --host 0.0.0.0
      --port 8000
      --reload
    depends_on:
      postgres:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.0"
```

**Key details**:
- **Builds from Dockerfile** in the project root.
- **`DATABASE_URL`**: Overrides `.env` to point to the Docker PostgreSQL (hostname is `postgres`, the container name).
- **Volume mounts**: `./app:/app/app` means code changes on your host are immediately reflected inside the container (enables `--reload`).
- **Resource limits**: Max 512MB RAM, 1 CPU core.
- **Logging**: JSON file driver, max 10MB per file, max 3 files.

### Volume

```yaml
volumes:
  pgdata:
    driver: local
```

Named volume `pgdata` stores PostgreSQL data. Persists even if containers are destroyed.

---

## Usage Commands

```bash
# Start everything
docker compose up -d

# View logs
docker compose logs -f api

# Stop everything
docker compose down

# Stop and delete all data (including database)
docker compose down -v

# Rebuild after code changes
docker compose up -d --build
```

---

## Network Architecture (Docker)

```
┌─────────────────────────────────────────────┐
│           Docker Network (bridge)            │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ postgres │  │  api     │  │ pgadmin  │  │
│  │ :5432    │◀─│ :8000    │  │ :80      │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│       ▲              ▲              ▲        │
└───────┼──────────────┼──────────────┼────────┘
        │              │              │
   localhost:5432  localhost:8000  localhost:5050
        │              │              │
   ┌────┴──────────────┴──────────────┴────┐
   │           Your Machine (Host)          │
   └────────────────────────────────────────┘
```

Inside Docker, services refer to each other by container name (`postgres`, not `localhost`).

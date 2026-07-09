# Release Checklist — v0.1.0 (Backend Foundation)

Use this checklist to verify all items are complete before creating the GitHub release.

---

## Pre-Release Verification

### Code Quality
- [ ] All tests pass: `pytest tests/ -v --tb=short`
- [ ] Linting is clean: `ruff check app/ tests/`
- [ ] Formatting is clean: `ruff format --check app/ tests/`
- [ ] Type checking passes: `mypy app/ --ignore-missing-imports`
- [ ] No `TODO` or `FIXME` items blocking release
- [ ] No deprecated API usage (e.g., `datetime.utcnow`)

### Documentation
- [ ] `README.md` is professional and complete
- [ ] `docs/architecture.md` has Mermaid diagrams and renders correctly
- [ ] `docs/api.md` documents all current endpoints
- [ ] `docs/phase1-retrospective.md` is complete
- [ ] `CHANGELOG.md` has the v0.1.0 entry
- [ ] `.env.example` is up to date with all config variables
- [ ] All documentation links are valid

### Docker
- [ ] `Dockerfile` builds successfully: `docker build -t openmind-ai-platform:v0.1.0 .`
- [ ] `docker-compose.yml` starts successfully: `docker compose up --build`
- [ ] Health check passes in Docker: `curl http://localhost:8000/health`
- [ ] `.dockerignore` is present and excludes dev files

### CI/CD
- [ ] GitHub Actions CI workflow passes on `main`
- [ ] Lint job runs successfully
- [ ] Test job runs on Python 3.12 and 3.13

### Configuration
- [ ] `APP_VERSION` is set to `0.1.0` in `app/core/config.py`
- [ ] `APP_VERSION` is set to `0.1.0` in `.env.example`
- [ ] Dockerfile label version is `0.1.0`

---

## Create the GitHub Release

### 1. Ensure `main` is up to date
```bash
git checkout main
git pull origin main
```

### 2. Create a signed tag
```bash
git tag -a v0.1.0 -m "v0.1.0 — Backend Foundation"
git push origin v0.1.0
```

### 3. Create GitHub Release
1. Go to **Releases** → **Draft a new release**
2. **Tag:** `v0.1.0`
3. **Title:** `v0.1.0 — Backend Foundation`
4. **Description:** Use the following template:

```markdown
## 🧠 OpenMind AI Platform v0.1.0 — Backend Foundation

The first release of the OpenMind AI Platform establishes the complete backend foundation.

### ✨ Highlights

- **FastAPI Application Factory** with middleware and router wiring
- **Type-safe Configuration** via Pydantic Settings with environment variables
- **Structured Logging** with JSON and text formats via structlog
- **Health Monitoring** endpoint for load balancers and orchestrators
- **Multi-stage Docker Build** with non-root user security
- **CI Pipeline** with linting, formatting, type checking, and testing
- **Comprehensive Test Suite** covering endpoints, configuration, and app lifecycle
- **Full Documentation** including architecture diagrams, API reference, and retrospective

### 📦 Quick Start

\```bash
git clone <TODO: Insert actual repo URL>
cd openmind-ai-platform
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
\```

### 🐳 Docker

\```bash
docker compose up --build
\```

### 📋 Full Changelog

See [CHANGELOG.md](CHANGELOG.md) for the complete list of changes.

### 🛣️ What's Next

**Milestone 2: API Contract Design** — Standardized error handling, chat/session request-response schemas, API versioning, and response envelopes.
```

5. **Pre-release:** No (this is a stable release)
6. Click **Publish release**

---

## Post-Release Verification

- [ ] Release is visible at `<TODO: Insert actual repo releases URL>`
- [ ] Tag `v0.1.0` is visible in the repository
- [ ] README badges show correct status
- [ ] CI passes on the tagged commit
- [ ] Docker image can be built from the tagged commit:
  ```bash
  git checkout v0.1.0
  docker build -t openmind-ai-platform:v0.1.0 .
  ```

---

## Post-Release Housekeeping

- [ ] Update project board/issues: close Milestone 1 items
- [ ] Create Milestone 2 issues for API Contract Design
- [ ] Announce the release (if applicable)
- [ ] Archive this checklist

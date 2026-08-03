# 18 — CI/CD Pipeline

The GitHub Actions workflow explained.

---

## File: `.github/workflows/ci.yml`

This file defines an **automated pipeline** that runs every time you push code or open a pull request.

### Triggers

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
```

- **Runs on**: Push to `main` or `develop` branches, or pull request targeting `main`.
- **Does NOT run on**: Feature branches (unless they have a PR to `main`).

### Job 1: `lint` — Code Quality Checks

```yaml
lint:
    name: Lint & Format
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - uses: actions/cache@v4   # Cache pip to speed up CI
      - run: pip install -r requirements.txt
      - run: ruff format --check app/ tests/    # Step 1: Format check
      - run: ruff check app/ tests/             # Step 2: Lint check
      - run: mypy app/ --ignore-missing-imports # Step 3: Type check
```

**Three checks**:

| Check | Tool | What it does | On failure |
|-------|------|-------------|------------|
| Format | `ruff format --check` | Verifies code formatting (indentation, spacing, etc.) | Fails if any file isn't properly formatted |
| Lint | `ruff check` | Checks for code issues (unused imports, security issues, etc.) | Fails on any lint violation |
| Types | `mypy` | Static type checking | Fails on type errors |

**`ruff` rules** (from `pyproject.toml`):
- `E/W`: PEP 8 style errors and warnings
- `F`: Pyflakes (undefined names, unused imports)
- `I`: isort (import ordering)
- `N`: PEP 8 naming conventions
- `UP`: Pyupgrade (use modern Python syntax)
- `B`: Bugbear (common bug patterns)
- `S`: Bandit (security issues)
- `T20`: No `print()` in production code

**Ignored rules**:
- `S104`: Allow binding to `0.0.0.0` (needed for Docker)
- `B008`: Allow `Depends()` in function defaults (FastAPI pattern)

> **⚠️ Note**: The `lint` job comment says "Set up Python 3.12" but actually uses Python 3.11.

### Job 2: `test` — Run Tests

```yaml
test:
    name: Test (Python ${{ matrix.python-version }})
    runs-on: ubuntu-latest
    needs: lint                            # Only runs if lint passes
    strategy:
      matrix:
        python-version: ["3.11", "3.12"]   # Tests on TWO Python versions
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - run: pip install -r requirements.txt
      - run: pytest tests/ -v --tb=short
```

**Key details**:
- `needs: lint`: Test job ONLY runs after lint passes. If lint fails, tests are skipped.
- `matrix`: Runs the test suite twice — once with Python 3.11, once with Python 3.12.
- `--tb=short`: Show short tracebacks for failures (cleaner CI output).

### Pipeline Flow

```
Push to main/develop
    │
    ├── Job: lint (Python 3.11)
    │       ├── ruff format --check
    │       ├── ruff check
    │       └── mypy
    │       │
    │       ├── If PASS ─────────────────────────┐
    │       └── If FAIL → Pipeline stops ❌      │
    │                                             ▼
    │                              ┌──────────────────────────┐
    │                              │ Job: test (Python 3.11)  │
    │                              │   pytest tests/ -v       │
    │                              └──────────────────────────┘
    │                              ┌──────────────────────────┐
    │                              │ Job: test (Python 3.12)  │
    │                              │   pytest tests/ -v       │
    │                              └──────────────────────────┘
    │
    └── Both test jobs must pass for ✅
```

### Caching

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('requirements.txt') }}
    restore-keys: ${{ runner.os }}-pip-
```

Caches pip downloads between CI runs. The cache key is based on `requirements.txt` — if dependencies change, cache is invalidated and rebuilt.

---

## What's NOT in CI

- ❌ Frontend build/lint/test (no Node.js CI)
- ❌ Docker image build
- ❌ Deployment (no CD)
- ❌ Code coverage reporting
- ❌ Integration tests against PostgreSQL

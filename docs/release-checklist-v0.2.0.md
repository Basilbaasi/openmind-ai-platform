# Release Checklist: v0.2.0 (API Contract Design)

## Pre-Release Validation

- [x] All automated tests pass (`pytest tests/`)
- [x] Linting is clean (`ruff check app/ tests/`)
- [x] Type checking passes (`mypy app/`)
- [x] Docker image builds successfully (`docker compose build`)

## Feature Verification

- [x] **Error Handling:** Invalid payloads return standardized `APIError` responses (422)
- [x] **Models API:** `GET /models` returns mocked model metadata
- [x] **Sessions API:** `POST`, `GET`, and `DELETE` /sessions endpoints function correctly
- [x] **Chat API:** `POST /chat` returns a blocked mock response
- [x] **Chat Stream API:** `POST /chat/stream` yields SSE chunks ending with `[DONE]`

## Documentation

- [x] `README.md` updated with v0.2.0 features
- [x] `docs/architecture.md` updated to reflect the new Service Layer and Domain Routes
- [x] `docs/api.md` includes the new endpoints and error schemas
- [x] `CHANGELOG.md` updated with added features

## Ready for Tagging

- [x] Ensure all code is pushed to the `main` branch
- [ ] Tag the release: `git tag -a v0.2.0 -m "v0.2.0: API Contract Design"`
- [ ] Push the tag: `git push origin v0.2.0`
- [ ] Draft a new release on GitHub using the changelog notes

# Retrospective: Milestone 2 (API Contract Design)

## What Went Well

1. **Service Layer Abstraction:** By strictly decoupling the HTTP routing logic from the business logic via the `Service` classes, we successfully insulated the API from the complexities of future AI integrations.
2. **Standardized Error Handling:** Moving from ad-hoc FastAPI HTTPExceptions to a global `APIError` schema ensures predictability. Frontend developers will have a much easier time parsing errors.
3. **Pydantic Schemas:** Pydantic proved extremely effective at ensuring the shape of the data for complex payloads (like the `messages` array in the ChatRequest) without requiring manual validation code.

## What Could Be Improved

1. **Environment Variables in Tests:** We encountered an issue where tests verifying the default `Settings` values failed if a `.env` file was present with overrides (like `DEBUG=True`). We resolved this by explicitly instantiating `Settings` without an environment file (`_env_file=None`) in the specific test cases. We must remain vigilant about test isolation.

## Technical Debt / Future Considerations

1. **Session Persistence:** Currently, the `SessionService` returns static UUIDs and mocked timestamps. In M5 (Session Management), we must implement an actual persistence layer (likely SQLite/PostgreSQL) without breaking this API contract.
2. **Provider Agnostic Chat:** The `ChatRequest` and `ChatResponse` schemas are intentionally generic. However, when we integrate real LLMs (M4), we may need to handle provider-specific features (like Anthropic's specific tool-use formats vs OpenAI's). We must ensure the `ChatService` handles the translation gracefully to keep the API contract clean.
3. **Rate Limiting:** As discussed in the API documentation, rate limiting is still pending for a future production hardening milestone.

## Conclusion

Milestone 2 successfully established the public-facing API contracts. The frontend team is now unblocked to build the UI against these predictable, mock endpoints, while the backend team can begin integrating actual LLM providers in Milestone 3 and 4.

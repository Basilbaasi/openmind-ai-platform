from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.schemas.errors import APIError, ErrorDetail


def add_exception_handlers(app: FastAPI) -> None:
    """
    Registers global exception handlers for the FastAPI application.

    This ensures that regardless of what exception is thrown inside a route or service,
    the client receives a standard, predictable APIError JSON response.
    """

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """
        Handles Pydantic validation errors when a client sends an invalid payload.
        Converts Pydantic's internal error format into our standard APIError format.
        """
        details = [
            ErrorDetail(
                loc=[str(loc) for loc in err.get("loc", [])],
                msg=err.get("msg", ""),
                type=err.get("type", ""),
            )
            for err in exc.errors()
        ]

        error_response = APIError(
            error_type="validation_error",
            message="The request payload is invalid.",
            details=details,
        )

        return JSONResponse(
            status_code=422,
            content=error_response.model_dump(exclude_none=True),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        """
        Handles standard HTTP exceptions (e.g., raise HTTPException(status_code=404)).
        """
        error_response = APIError(
            error_type="http_error",
            message=str(exc.detail) if exc.detail else "An HTTP error occurred.",
        )

        return JSONResponse(
            status_code=exc.status_code,
            content=error_response.model_dump(exclude_none=True),
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """
        Catch-all for unhandled exceptions (500 Internal Server Error).
        Prevents stack traces from leaking to the client while still returning our standard schema.
        """
        # In a real production scenario, we would log the full stack trace here using structlog.
        error_response = APIError(
            error_type="internal_server_error", message="An unexpected internal error occurred."
        )

        return JSONResponse(
            status_code=500,
            content=error_response.model_dump(exclude_none=True),
        )

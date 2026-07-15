from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """Details about a specific error."""

    loc: list[str] | None = Field(
        default=None, description="Location of the error in the request"
    )
    msg: str = Field(..., description="Human-readable error message")
    type: str = Field(..., description="Error type identifier")


class APIError(BaseModel):
    """
    Standardized API error response schema.

    This ensures that all API errors return a consistent format, making it
    easier for clients to parse and handle errors predictably.
    """

    error_type: str = Field(
        ..., description="High-level error category (e.g., 'validation_error', 'not_found')"
    )
    message: str = Field(
        ..., description="A friendly error message intended for developers or users"
    )
    details: list[ErrorDetail] | None = Field(
        default=None, description="Detailed validation errors if applicable"
    )

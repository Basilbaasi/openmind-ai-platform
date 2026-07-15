"""
Structured logging configuration.

Provides consistent, production-ready logging with support for both
human-readable (text) and machine-parseable (JSON) output formats.
JSON format is recommended for production to enable log aggregation
tools (ELK, Datadog, CloudWatch, etc.).
"""

import logging
import sys
from typing import Literal, cast

import structlog


def setup_logging(
    log_level: str = "INFO",
    log_format: Literal["json", "text"] = "text",
) -> None:
    """
    Configure structured logging for the entire application.

    Args:
        log_level: Minimum severity level to emit (DEBUG, INFO, WARNING, etc.).
        log_format: Output format – 'json' for production, 'text' for development.
    """
    # Shared processors that run for every log event
    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    if log_format == "json":
        renderer: structlog.types.Processor = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer(colors=True)

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
        foreign_pre_chain=shared_processors,
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(log_level.upper())

    # Quieten noisy third-party loggers
    for noisy in ("uvicorn.access", "uvicorn.error", "httpcore", "httpx"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """
    Return a named structured logger.

    Usage:
        logger = get_logger(__name__)
        logger.info("server_started", port=8000)
    """
    return cast(structlog.stdlib.BoundLogger, structlog.get_logger(name))  # type: ignore[no-any-return]

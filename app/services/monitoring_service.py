"""
Monitoring service — returns real system metrics.
"""

import os
import platform
import time
from datetime import UTC, datetime

import psutil

from app.core.config import get_settings

# Track application start time
_start_time = time.time()


class MonitoringService:
    """Returns real runtime system metrics."""

    async def get_status(self) -> dict:
        settings = get_settings()
        uptime_seconds = time.time() - _start_time
        days = int(uptime_seconds // 86400)
        hours = int((uptime_seconds % 86400) // 3600)
        minutes = int((uptime_seconds % 3600) // 60)
        uptime_str = f"{days}d {hours}h {minutes}m"

        cpu_percent = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory()

        # Check database connectivity
        db_healthy = True
        pg_connections = 0
        try:
            from sqlalchemy import text
            from app.core.database import engine

            async with engine.connect() as conn:
                if settings.DATABASE_URL.startswith("sqlite"):
                    await conn.execute(text("SELECT 1"))
                    pg_connections = 1
                else:
                    result = await conn.execute(text("SELECT count(*) FROM pg_stat_activity"))
                    pg_connections = result.scalar_one()
        except Exception:
            db_healthy = False

        return {
            "status": "healthy" if db_healthy else "degraded",
            "uptime": uptime_str,
            "uptime_seconds": int(uptime_seconds),
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
            "timestamp": datetime.now(UTC).isoformat(),
            "cpu": {
                "usage_percent": cpu_percent,
                "count": psutil.cpu_count(),
            },
            "memory": {
                "total_gb": round(mem.total / (1024**3), 1),
                "used_gb": round(mem.used / (1024**3), 1),
                "usage_percent": mem.percent,
            },
            "database": {
                "healthy": db_healthy,
                "active_connections": pg_connections,
            },
            "runtime": {
                "python_version": platform.python_version(),
                "platform": platform.platform(),
                "pid": os.getpid(),
            },
        }

import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("spacetrace.timing")


class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info("%s %s -> %.1fms", request.method, request.url.path, elapsed_ms)
        return response
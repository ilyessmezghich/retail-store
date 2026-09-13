import json
import logging
import sys
from typing import Any

FORMAT_STRING = "%(asctime)s %(levelname)s %(name)s %(message)s"


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        extra = getattr(record, "extra", None)
        if extra:
            payload["extra"] = extra
        return json.dumps(payload)


def configure_logging(level: int = logging.INFO, structured: bool = True) -> None:
    handler: logging.Handler
    if structured:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JsonFormatter())
    else:
        logging.basicConfig(level=level, format=FORMAT_STRING)
        return

    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(level)
    root.addHandler(handler)
    # Silence noisy third-party loggers unless they error.
    for noisy in ("uvicorn.access", "uvicorn.error"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
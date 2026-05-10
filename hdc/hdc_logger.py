import os
from loguru import logger


class HDCLogger:
    """Minimal structured logger for Hossam Desk Companion actions."""

    def __init__(self, log_dir: str = "logs"):
        os.makedirs(log_dir, exist_ok=True)
        log_path = os.path.join(log_dir, "hdc_{time:YYYY-MM-DD}.log")
        logger.add(
            log_path,
            rotation="10 MB",
            retention="14 days",
            level="INFO",
            format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <6} | {extra[component]} | {message}",
            filter=lambda record: record["extra"].get("component", "").startswith("HDC"),
        )

    def info(self, component: str, message: str):
        logger.bind(component=f"HDC|{component}").info(message)

    def warn(self, component: str, message: str):
        logger.bind(component=f"HDC|{component}").warning(message)

    def error(self, component: str, message: str):
        logger.bind(component=f"HDC|{component}").error(message)

    def action(self, component: str, message: str):
        logger.bind(component=f"HDC|{component}|ACTION").info(message)


hdc_logger = HDCLogger()

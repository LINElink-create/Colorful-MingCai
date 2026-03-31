from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from app.core.config import Settings, get_settings


@dataclass
class EmailMessage:
    to_email: str
    subject: str
    text_body: str
    html_body: Optional[str] = None


class EmailService:
    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()

    def is_configured(self) -> bool:
        return self.settings.smtp_enabled

    def send(self, message: EmailMessage) -> None:
        raise NotImplementedError("邮件发送能力框架已预留，待接入 SMTP 实现")

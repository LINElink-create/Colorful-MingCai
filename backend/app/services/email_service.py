from __future__ import annotations

from dataclasses import dataclass
from email.header import Header
from email.message import EmailMessage as MimeEmailMessage
from email.utils import formataddr
import smtplib
import ssl
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
        if not self.is_configured():
            raise RuntimeError("邮件服务未配置")

        smtp_host = self.settings.smtp_host.strip()
        smtp_user = self.settings.smtp_user.strip()
        smtp_password = self.settings.smtp_password
        smtp_from_name = self.settings.smtp_from_name.strip() or smtp_user
        use_implicit_ssl = self.settings.smtp_port == 465 and not self.settings.smtp_use_tls
        ssl_context = ssl.create_default_context()

        mime_message = MimeEmailMessage()
        mime_message["From"] = formataddr(
            (str(Header(smtp_from_name, "utf-8")), smtp_user)
        )
        mime_message["To"] = message.to_email
        mime_message["Subject"] = str(Header(message.subject, "utf-8"))
        mime_message.set_content(message.text_body)

        if message.html_body:
            mime_message.add_alternative(message.html_body, subtype="html")

        if use_implicit_ssl:
            client_context = smtplib.SMTP_SSL(
                smtp_host,
                self.settings.smtp_port,
                timeout=30,
                context=ssl_context,
            )
        else:
            client_context = smtplib.SMTP(smtp_host, self.settings.smtp_port, timeout=30)

        with client_context as client:
            client.ehlo()

            if self.settings.smtp_use_tls and not use_implicit_ssl:
                client.starttls(context=ssl_context)
                client.ehlo()

            client.login(smtp_user, smtp_password)
            client.send_message(mime_message)

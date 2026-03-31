from __future__ import annotations

from typing import Dict, Optional

from app.core.config import Settings


class AccessControlService:
    def __init__(self, settings: Settings):
        self.settings = settings

    def get_platform_quota(self) -> Dict[str, Optional[int]]:
        return {
            "requests_per_minute": self.settings.platform_requests_per_minute,
            "daily_limit": self.settings.platform_daily_limit,
        }

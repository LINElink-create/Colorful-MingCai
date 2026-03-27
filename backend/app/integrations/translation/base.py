from __future__ import annotations

from abc import ABC, abstractmethod


class TranslationProviderClient(ABC):
    @abstractmethod
    async def translate(self, text: str, source_language: str, target_language: str) -> dict[str, str]:
        raise NotImplementedError

from __future__ import annotations

from typing import Dict

import httpx

from app.integrations.translation.base import TranslationProviderClient


LANGUAGE_NAMES = {
    "auto": "自动检测",
    "zh-CHS": "简体中文",
    "en": "英语",
    "ja": "日语",
    "ko": "韩语",
    "fr": "法语",
    "de": "德语",
    "es": "西班牙语",
    "ru": "俄语",
}


class OpenAICompatibleProviderError(Exception):
    def __init__(self, message: str, error_code: str = "provider_error"):
        super().__init__(message)
        self.error_code = error_code


class OpenAICompatibleTranslationClient(TranslationProviderClient):
    def __init__(self, base_url: str, api_key: str, model: str):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model

    async def translate(self, text: str, source_language: str, target_language: str) -> Dict[str, str]:
        query = text.strip()
        if not query:
            raise OpenAICompatibleProviderError("请先选择要翻译的文本", error_code="empty_query")

        if not self.base_url or not self.api_key or not self.model:
            raise OpenAICompatibleProviderError("OpenAI 兼容接口配置不完整", error_code="credentials_missing")

        system_prompt = (
            "You are a translation engine. Translate the user text only. "
            "Do not explain. Preserve line breaks when possible."
        )
        user_prompt = (
            f"Source language: {LANGUAGE_NAMES.get(source_language, source_language)}\n"
            f"Target language: {LANGUAGE_NAMES.get(target_language, target_language)}\n"
            f"Text:\n{query}"
        )

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "temperature": 0.2,
                    },
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                )
                response.raise_for_status()
        except httpx.HTTPStatusError as error:
            raise OpenAICompatibleProviderError(
                f"OpenAI 兼容接口请求失败（{error.response.status_code}）",
                error_code="http_error",
            ) from error
        except httpx.RequestError as error:
            raise OpenAICompatibleProviderError("OpenAI 兼容接口网络连接失败", error_code="network_error") from error

        try:
            payload = response.json()
        except ValueError as error:
            raise OpenAICompatibleProviderError("OpenAI 兼容接口返回了无法解析的响应", error_code="invalid_json") from error

        choices = payload.get("choices") or []
        first_choice = choices[0] if choices else None
        message = first_choice.get("message") if isinstance(first_choice, dict) else None
        translated_text = (message or {}).get("content", "").strip() if isinstance(message, dict) else ""

        if not translated_text:
            raise OpenAICompatibleProviderError("OpenAI 兼容接口未返回有效译文", error_code="empty_translation")

        return {
            "translated_text": translated_text,
            "detected_source_language": source_language,
            "target_language": target_language,
            "provider": "openai_compatible",
        }

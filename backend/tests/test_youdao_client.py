from __future__ import annotations

from unittest.mock import patch

import pytest

from app.integrations.translation.youdao import (
    YoudaoProviderError,
    YoudaoTranslationClient,
    build_youdao_sign_input,
)


class DummyResponse:
    def __init__(self, status_code: int, payload: dict):
        self.status_code = status_code
        self._payload = payload

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise RuntimeError("status error")

    def json(self) -> dict:
        return self._payload


class DummyAsyncClient:
    def __init__(self, response: DummyResponse):
        self.response = response

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url: str, data: dict, headers: dict):
        return self.response


def test_build_youdao_sign_input_short_text_keeps_original() -> None:
    assert build_youdao_sign_input("short text") == "short text"


def test_build_youdao_sign_input_long_text_uses_prefix_length_suffix() -> None:
    text = "abcdefghijklmnopqrstuvwxyz1234567890"
    assert build_youdao_sign_input(text) == "abcdefghij361234567890"


@pytest.mark.asyncio
async def test_translate_returns_parsed_youdao_result() -> None:
    response = DummyResponse(
        200,
        {
            "errorCode": "0",
            "translation": ["你好，世界"],
            "l": "en2zh-CHS",
        },
    )

    with patch("app.integrations.translation.youdao.httpx.AsyncClient", return_value=DummyAsyncClient(response)):
        client = YoudaoTranslationClient(app_key="demo-key", app_secret="demo-secret")
        result = await client.translate("hello world", "auto", "zh-CHS")

    assert result["translated_text"] == "你好，世界"
    assert result["detected_source_language"] == "en"
    assert result["target_language"] == "zh-CHS"
    assert result["provider"] == "youdao"


@pytest.mark.asyncio
async def test_translate_raises_provider_error_for_youdao_error_code() -> None:
    response = DummyResponse(
        200,
        {
            "errorCode": "202",
        },
    )

    with patch("app.integrations.translation.youdao.httpx.AsyncClient", return_value=DummyAsyncClient(response)):
        client = YoudaoTranslationClient(app_key="demo-key", app_secret="demo-secret")

        with pytest.raises(YoudaoProviderError) as error:
            await client.translate("hello world", "auto", "zh-CHS")

    assert error.value.error_code == "202"
    assert "签名校验失败" in str(error.value)

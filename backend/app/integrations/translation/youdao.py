from __future__ import annotations

import hashlib
from time import time
from typing import Dict, Optional, Tuple
from uuid import uuid4

import httpx

from app.integrations.translation.base import TranslationProviderClient


YOUDAO_TRANSLATE_API = "https://openapi.youdao.com/api"

YOUDAO_ERROR_MESSAGES = {
    "101": "有道翻译缺少必填参数",
    "102": "有道翻译不支持当前语言类型",
    "108": "有道翻译应用 ID 无效",
    "111": "有道翻译开发者账号无效",
    "113": "选中文本不能为空",
    "202": "有道翻译签名校验失败，请检查应用 ID 与应用密钥",
    "203": "当前服务端 IP 不在有道翻译的允许列表中",
    "206": "有道翻译时间戳无效",
    "207": "有道翻译请求被判定为重复请求，请稍后重试",
    "302": "有道翻译查询失败",
    "401": "有道翻译账户余额不足",
    "411": "有道翻译访问频率受限，请稍后重试",
}


class YoudaoProviderError(Exception):
    def __init__(self, message: str, error_code: str = "provider_error"):
        super().__init__(message)
        self.error_code = error_code


def build_youdao_sign_input(text: str) -> str:
    if len(text) <= 20:
        return text

    return "{prefix}{length}{suffix}".format(
        prefix=text[:10],
        length=len(text),
        suffix=text[-10:],
    )


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def get_youdao_error_message(error_code: str) -> str:
    return YOUDAO_ERROR_MESSAGES.get(error_code, "有道翻译请求失败，错误码 {code}".format(code=error_code))


def parse_language_pair(language_pair: str, source_language: str, target_language: str) -> Tuple[str, str]:
    separator_index = language_pair.find("2")
    if separator_index < 0:
        return source_language, target_language

    return language_pair[:separator_index], language_pair[separator_index + 1 :]


class YoudaoTranslationClient(TranslationProviderClient):
    def __init__(self, app_key: str, app_secret: str):
        self.app_key = app_key
        self.app_secret = app_secret

    async def translate(self, text: str, source_language: str, target_language: str) -> Dict[str, str]:
        query = text.strip()

        if not query:
            raise YoudaoProviderError("请先选择要翻译的文本", error_code="empty_query")

        if not self.app_key or not self.app_secret:
            raise YoudaoProviderError("有道翻译平台凭据未配置", error_code="credentials_missing")

        salt = uuid4().hex
        current_time = str(int(time()))
        sign = sha256_hex(
            "{app_key}{sign_input}{salt}{current_time}{app_secret}".format(
                app_key=self.app_key,
                sign_input=build_youdao_sign_input(query),
                salt=salt,
                current_time=current_time,
                app_secret=self.app_secret,
            )
        )

        request_body = {
            "q": query,
            "from": source_language,
            "to": target_language,
            "appKey": self.app_key,
            "salt": salt,
            "sign": sign,
            "signType": "v3",
            "curtime": current_time,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    YOUDAO_TRANSLATE_API,
                    data=request_body,
                    headers={"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"},
                )
                response.raise_for_status()
        except httpx.HTTPStatusError as error:
            raise YoudaoProviderError(
                "有道翻译网络请求失败（{status_code}）".format(status_code=error.response.status_code),
                error_code="http_error",
            ) from error
        except httpx.RequestError as error:
            raise YoudaoProviderError("有道翻译网络连接失败", error_code="network_error") from error

        try:
            payload = response.json()
        except ValueError as error:
            raise YoudaoProviderError("有道翻译返回了无法解析的响应", error_code="invalid_json") from error

        error_code = str(payload.get("errorCode", "303"))
        if error_code != "0":
            raise YoudaoProviderError(get_youdao_error_message(error_code), error_code=error_code)

        translations = payload.get("translation") or []
        translated_text = "\n".join(item for item in translations if item).strip()
        if not translated_text:
            raise YoudaoProviderError("有道翻译未返回有效结果", error_code="empty_translation")

        detected_source_language, detected_target_language = parse_language_pair(
            str(payload.get("l", "")),
            source_language,
            target_language,
        )

        return {
            "translated_text": translated_text,
            "detected_source_language": detected_source_language,
            "target_language": detected_target_language,
            "provider": "youdao",
        }

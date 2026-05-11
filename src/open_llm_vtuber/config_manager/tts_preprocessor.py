# config_manager/translate.py
from typing import Literal, Optional, Dict, ClassVar
from pydantic import ValidationInfo, Field, model_validator
from .i18n import I18nMixin, Description

# --- Sub-models for specific Translator providers ---


class DeepLXConfig(I18nMixin):
    """Configuration for DeepLX translation service."""

    deeplx_target_lang: str = Field(..., alias="deeplx_target_lang")
    deeplx_api_endpoint: str = Field(..., alias="deeplx_api_endpoint")

    DESCRIPTIONS: ClassVar[Dict[str, Description]] = {
        "deeplx_target_lang": Description(
            en="Target language code for DeepLX translation",
            zh="DeepLX 翻译的目标语言代码",
        ),
        "deeplx_api_endpoint": Description(
            en="API endpoint URL for DeepLX service", zh="DeepLX 服务的 API 端点 URL"
        ),
    }


class TencentConfig(I18nMixin):
    """Configuration for tencent translation service."""

    secret_id: str = Field(..., description="Tencent Secret ID")
    secret_key: str = Field(..., description="Tencent Secret Key")
    region: str = Field(..., description="Region for Tencent Service")
    source_lang: str = Field(
        ..., description="Source language code for tencent translation"
    )
    target_lang: str = Field(
        ..., description="Target language code for tencent translation"
    )

    DESCRIPTIONS: ClassVar[Dict[str, Description]] = {
        "secret_id": Description(en="Tencent Secret ID", zh="腾讯服务的Secret ID"),
        "secret_key": Description(en="Tencent Secret Key", zh="腾讯服务的Secret Key"),
        "region": Description(en="Region for Tencent Service", zh="腾讯服务使用的区域"),
        "source_lang": Description(
            en="Source language code for tencent translation", zh="腾讯翻译的源语言代码"
        ),
        "target_lang": Description(
            en="Target language code for tencent translation",
            zh="腾讯翻译的目标语言代码",
        ),
    }


class GeminiTranslateConfig(I18nMixin):
    """Configuration for Gemini-backed translation."""

    api_key: str = Field(..., alias="api_key")
    target_lang: str = Field(..., alias="target_lang")
    source_lang: Optional[str] = Field(None, alias="source_lang")
    model: str = Field("gemini-2.5-flash-lite", alias="model")

    DESCRIPTIONS: ClassVar[Dict[str, Description]] = {
        "api_key": Description(en="Google AI Studio API key", zh="Google AI Studio API 密钥"),
        "target_lang": Description(
            en="Target language (free-form, e.g. 'Arabic', 'Japanese')",
            zh="目标语言（自由文本，如 'Arabic', 'Japanese'）",
        ),
        "source_lang": Description(
            en="Optional source language hint; leave empty for auto-detect",
            zh="可选源语言提示；留空则自动检测",
        ),
        "model": Description(
            en="Gemini model used for translation",
            zh="用于翻译的 Gemini 模型",
        ),
    }


# --- Main TranslatorConfig model ---


class TranslatorConfig(I18nMixin):
    """Configuration for translation services."""

    translate_audio: bool = Field(..., alias="translate_audio")
    translate_provider: Literal["deeplx", "tencent", "gemini"] = Field(
        ..., alias="translate_provider"
    )
    deeplx: Optional[DeepLXConfig] = Field(None, alias="deeplx")
    tencent: Optional[TencentConfig] = Field(None, alias="tencent")
    gemini: Optional[GeminiTranslateConfig] = Field(None, alias="gemini")

    DESCRIPTIONS: ClassVar[Dict[str, Description]] = {
        "translate_audio": Description(
            en="Enable audio translation (requires a translation backend)",
            zh="启用音频翻译（需要翻译后端）",
        ),
        "translate_provider": Description(
            en="Translation service provider to use", zh="要使用的翻译服务提供者"
        ),
        "deeplx": Description(
            en="Configuration for DeepLX translation service", zh="DeepLX 翻译服务配置"
        ),
        "tencent": Description(
            en="Configuration for TenCent translation service", zh="腾讯 翻译服务配置"
        ),
        "gemini": Description(
            en="Configuration for Gemini translation", zh="Gemini 翻译配置"
        ),
    }

    @model_validator(mode="after")
    def check_translator_config(cls, values: "TranslatorConfig", info: ValidationInfo):
        translate_audio = values.translate_audio
        translate_provider = values.translate_provider

        if translate_audio:
            if translate_provider == "deeplx" and values.deeplx is None:
                raise ValueError(
                    "DeepLX configuration must be provided when translate_audio is True and translate_provider is 'deeplx'"
                )
            elif translate_provider == "tencent" and values.tencent is None:
                raise ValueError(
                    "Tencent configuration must be provided when translate_audio is True and translate_provider is 'tencent'"
                )
            elif translate_provider == "gemini" and values.gemini is None:
                raise ValueError(
                    "Gemini configuration must be provided when translate_audio is True and translate_provider is 'gemini'"
                )

        return values


class TTSPreprocessorConfig(I18nMixin):
    """Configuration for TTS preprocessor."""

    remove_special_char: bool = Field(..., alias="remove_special_char")
    ignore_brackets: bool = Field(default=True, alias="ignore_brackets")
    ignore_parentheses: bool = Field(default=True, alias="ignore_parentheses")
    ignore_asterisks: bool = Field(default=True, alias="ignore_asterisks")
    ignore_angle_brackets: bool = Field(default=True, alias="ignore_angle_brackets")
    translator_config: TranslatorConfig = Field(..., alias="translator_config")

    DESCRIPTIONS: ClassVar[Dict[str, Description]] = {
        "remove_special_char": Description(
            en="Remove special characters from the input text",
            zh="从输入文本中删除特殊字符",
        ),
        "translator_config": Description(
            en="Configuration for translation services", zh="翻译服务的配置"
        ),
    }

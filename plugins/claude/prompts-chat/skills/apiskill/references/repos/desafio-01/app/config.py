import logging
import warnings

from pydantic import Field
from pydantic_settings import BaseSettings

APP_VERSION = "1.0.0"

_INSECURE_DEFAULTS = {
    "api_password": "changeme",
    "secret_key": "super-secret-key-change-in-production",
}


class Settings(BaseSettings):
    headless: bool = True
    max_concurrent: int = 5
    port: int = 8000
    host: str = "0.0.0.0"

    # OAuth 2.0
    api_username: str = "admin"
    api_password: str = Field(default="changeme", min_length=8)
    secret_key: str = Field(
        default="super-secret-key-change-in-production", min_length=16
    )
    token_expire_minutes: int = 60

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()

# Alerta no startup se credenciais padrão estiverem em uso
for _field, _default in _INSECURE_DEFAULTS.items():
    if getattr(settings, _field) == _default:
        warnings.warn(
            f"SEGURANÇA: '{_field}' está com valor padrão inseguro. "
            "Defina via variável de ambiente antes de usar em produção.",
            stacklevel=1,
        )
        logging.getLogger(__name__).warning(
            "Credencial '%s' com valor padrão — altere em produção!", _field
        )

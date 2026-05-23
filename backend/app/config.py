import logging

from pydantic import model_validator
from pydantic_settings import BaseSettings

_WEAK_API_KEY = "change-me-in-production"
_WEAK_JWT_SECRET = "change-me-jwt-secret"


class Settings(BaseSettings):
    api_key: str = _WEAK_API_KEY
    db_path: str = "/data/catalog.duckdb"
    cors_origins: str = "http://localhost:5173"
    log_level: str = "info"
    auth_read_endpoints: bool = False
    enable_test_data_endpoint: bool = False
    # SMTP configuration for sending access-request emails
    smtp_host: str = "localhost"
    smtp_port: int = 25
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = "no-reply@datacat.local"
    default_user_email: str = "user@example.com"
    jwt_secret: str = _WEAK_JWT_SECRET

    model_config = {"env_file": ".env", "extra": "ignore"}

    @model_validator(mode="after")
    def warn_weak_secrets(self) -> "Settings":
        weak = []
        if self.api_key == _WEAK_API_KEY:
            weak.append("API_KEY")
        if self.jwt_secret == _WEAK_JWT_SECRET:
            weak.append("JWT_SECRET")
        if weak:
            logging.getLogger("datacat").warning(
                "⚠️  Insecure default values detected for: %s. "
                "Set strong secrets via environment variables before deploying to production.",
                ", ".join(weak),
            )
        return self


settings = Settings()

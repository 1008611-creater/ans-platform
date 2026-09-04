from pydantic import Field
from pydantic_settings import BaseSettings


class WorkflowSettings(BaseSettings):
    """Configurações do workflow de hyperautomação."""

    # API (Parte 1)
    api_base_url: str = "http://localhost:8000"
    api_username: str = "admin"
    api_password: str = Field(default="changeme", min_length=8)

    # Google Cloud — Service Account
    google_credentials_path: str = Field(
        default="credentials.json",
        description="Caminho para o JSON do service account",
    )
    google_drive_folder_id: str = Field(
        ..., description="ID da pasta no Google Drive"
    )
    google_sheets_id: str = Field(
        ..., description="ID da planilha Google Sheets"
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "env_prefix": "WORKFLOW_",
    }

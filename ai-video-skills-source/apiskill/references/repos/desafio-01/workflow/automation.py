"""
Parte 2 — Hyperautomation: workflow automatizado.

Fluxo:
  1. Autentica na API (OAuth 2.0) e executa a consulta
  2. Salva o JSON no Google Drive com padrão [UUID]_[DATETIME].json
  3. Atualiza Google Sheets centralizado com resumo + link do arquivo

Uso:
  python -m workflow.automation --termo "LUCCA HABAEB"
  python -m workflow.automation --termo "MARIA OLIVEIRA" --filtro
"""

import argparse
import json
import logging
import uuid
from datetime import datetime, timezone
from io import BytesIO

import httpx
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

from workflow.config import WorkflowSettings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/spreadsheets",
]


def get_google_credentials(settings: WorkflowSettings) -> Credentials:
    """Carrega credenciais do service account."""
    return Credentials.from_service_account_file(
        settings.google_credentials_path, scopes=SCOPES
    )


def consultar_api(settings: WorkflowSettings, termo: str, filtro: bool) -> dict:
    """Autentica na API e executa a consulta."""
    base = settings.api_base_url

    # 1. Obter token
    logger.info("Autenticando na API...")
    resp = httpx.post(
        f"{base}/api/token",
        data={
            "username": settings.api_username,
            "password": settings.api_password,
        },
    )
    resp.raise_for_status()
    token = resp.json()["access_token"]

    # 2. Executar consulta
    logger.info("Executando consulta: %s", termo[:3] + "***")
    resp = httpx.post(
        f"{base}/api/consulta",
        json={"termo": termo, "filtro_beneficiario": filtro},
        headers={"Authorization": f"Bearer {token}"},
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def salvar_no_drive(
    creds: Credentials, folder_id: str, resultado: dict
) -> tuple[str, str]:
    """Salva o JSON no Google Drive e retorna (file_id, web_link)."""
    drive = build("drive", "v3", credentials=creds)

    unique_id = uuid.uuid4().hex[:8]
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"{unique_id}_{timestamp}.json"

    json_bytes = json.dumps(resultado, ensure_ascii=False, indent=2).encode("utf-8")
    media = MediaIoBaseUpload(BytesIO(json_bytes), mimetype="application/json")

    metadata = {"name": filename, "parents": [folder_id]}
    file = drive.files().create(
        body=metadata, media_body=media, fields="id,webViewLink"
    ).execute()

    file_id = file["id"]
    web_link = file["webViewLink"]

    # Tornar acessível via link
    drive.permissions().create(
        fileId=file_id,
        body={"role": "reader", "type": "anyone"},
    ).execute()

    logger.info("Arquivo salvo no Drive: %s → %s", filename, web_link)
    return file_id, web_link


def atualizar_sheets(
    creds: Credentials,
    spreadsheet_id: str,
    resultado: dict,
    drive_link: str,
):
    """Adiciona uma linha no Google Sheets com o resumo da consulta."""
    sheets = build("sheets", "v4", credentials=creds)

    dados = resultado.get("dados") or {}
    unique_id = uuid.uuid4().hex[:8]
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    row = [
        unique_id,
        dados.get("nome", "—"),
        dados.get("cpf", "—"),
        timestamp,
        "Sucesso" if resultado.get("sucesso") else "Erro",
        drive_link,
    ]

    sheets.spreadsheets().values().append(
        spreadsheetId=spreadsheet_id,
        range="A:F",
        valueInputOption="RAW",
        body={"values": [row]},
    ).execute()

    logger.info("Sheets atualizado: %s — %s", unique_id, dados.get("nome", "—"))


def run(termo: str, filtro: bool = False):
    """Executa o workflow completo."""
    settings = WorkflowSettings()

    # 1. Consultar API
    resultado = consultar_api(settings, termo, filtro)
    logger.info(
        "Consulta: sucesso=%s, nome=%s",
        resultado.get("sucesso"),
        (resultado.get("dados") or {}).get("nome"),
    )

    # 2. Salvar no Google Drive
    creds = get_google_credentials(settings)
    _file_id, drive_link = salvar_no_drive(
        creds, settings.google_drive_folder_id, resultado
    )

    # 3. Atualizar Google Sheets
    atualizar_sheets(creds, settings.google_sheets_id, resultado, drive_link)

    logger.info("Workflow concluído com sucesso!")
    return resultado, drive_link


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Workflow de hyperautomação — Portal da Transparência"
    )
    parser.add_argument("--termo", required=True, help="CPF, NIS ou nome")
    parser.add_argument(
        "--filtro", action="store_true", help="Filtrar por beneficiário"
    )
    args = parser.parse_args()

    result, link = run(args.termo, args.filtro)
    print(json.dumps({"drive_link": link, "sucesso": result["sucesso"]}, indent=2))

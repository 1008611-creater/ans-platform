"""
Testes da API.

Para rodar: pip install -r requirements-dev.txt && pytest tests/ -v
"""

import pytest
from fastapi.testclient import TestClient

from app.config import APP_VERSION, settings
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers(client):
    """Obtém token JWT via OAuth2 password flow."""
    resp = client.post(
        "/api/token",
        data={
            "username": settings.api_username,
            "password": settings.api_password,
        },
    )
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ── Health (público) ────────────────────────────────────────────────────────

def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["version"] == APP_VERSION


# ── OAuth 2.0 ──────────────────────────────────────────────────────────────

def test_token_sucesso(client):
    """Credenciais corretas retornam access_token."""
    resp = client.post(
        "/api/token",
        data={
            "username": settings.api_username,
            "password": settings.api_password,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_token_credenciais_invalidas(client):
    """Credenciais erradas retornam 401."""
    resp = client.post(
        "/api/token",
        data={"username": "hacker", "password": "123"},
    )
    assert resp.status_code == 401


def test_consulta_sem_token(client):
    """Requisição sem token retorna 401."""
    resp = client.post("/api/consulta", json={"termo": "TESTE"})
    assert resp.status_code == 401


# ── Consulta (autenticada) ─────────────────────────────────────────────────

def test_consulta_sem_termo(client, auth_headers):
    """Termo vazio deve retornar 422 (validação Pydantic)."""
    resp = client.post(
        "/api/consulta", json={"termo": ""}, headers=auth_headers
    )
    assert resp.status_code == 422


def test_consulta_termo_excede_max(client, auth_headers):
    """Termo com mais de 200 caracteres retorna 422."""
    resp = client.post(
        "/api/consulta", json={"termo": "A" * 201}, headers=auth_headers
    )
    assert resp.status_code == 422


def test_consulta_bot_nao_inicializado(client, auth_headers):
    """Sem lifespan, o bot é None → 503."""
    resp = client.post(
        "/api/consulta",
        json={"termo": "12345678900", "filtro_beneficiario": True},
        headers=auth_headers,
    )
    assert resp.status_code == 503

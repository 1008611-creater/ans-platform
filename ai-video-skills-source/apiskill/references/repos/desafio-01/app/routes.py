import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from app.auth import authenticate, get_current_user
from app.config import APP_VERSION
from app.schemas import ConsultaRequest, ConsultaResponse, HealthResponse
from app.scraper import mask_termo

logger = logging.getLogger(__name__)

router = APIRouter()

CONSULTA_TIMEOUT = 120  # segundos — wall-clock máximo por consulta


# ── OAuth 2.0 ───────────────────────────────────────────────────────────────

@router.post(
    "/token",
    summary="Obter token de acesso (OAuth 2.0 Password Flow)",
    description=(
        "Envia `username` e `password` via form-data e recebe um JWT Bearer token. "
        "Use o token no header `Authorization: Bearer <token>` para acessar os "
        "endpoints protegidos."
    ),
)
async def login(token_response: dict = Depends(authenticate)):
    return token_response


# ── Endpoints protegidos ────────────────────────────────────────────────────

@router.post(
    "/consulta",
    response_model=ConsultaResponse,
    summary="Consultar pessoa no Portal da Transparência",
    description=(
        "Busca por CPF, NIS ou nome no Portal da Transparência do Governo Federal. "
        "Retorna dados do panorama, benefícios sociais e screenshot em Base64. "
        "**Requer autenticação via Bearer token** (obter em `/api/token`)."
    ),
)
async def consultar_pessoa(
    body: ConsultaRequest,
    request: Request,
    _user: str = Depends(get_current_user),
) -> ConsultaResponse:
    scraper = getattr(request.app.state, "scraper", None)
    if scraper is None:
        raise HTTPException(status_code=503, detail="Bot não inicializado")

    logger.info(
        "Consulta recebida: termo=%s, filtro=%s, user=%s",
        mask_termo(body.termo),
        body.filtro_beneficiario,
        _user,
    )

    try:
        resultado = await asyncio.wait_for(
            scraper.consultar(
                termo=body.termo,
                filtro_beneficiario=body.filtro_beneficiario,
            ),
            timeout=CONSULTA_TIMEOUT,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Consulta excedeu o tempo limite. Tente novamente.",
        )

    return ConsultaResponse(**resultado)


# ── Health (público) ────────────────────────────────────────────────────────

@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Verificar saúde da API",
)
async def health_check() -> HealthResponse:
    return HealthResponse(version=APP_VERSION)

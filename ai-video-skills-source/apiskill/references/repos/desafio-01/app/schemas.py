from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field


class ConsultaRequest(BaseModel):
    """Parâmetros de entrada para consulta no Portal da Transparência."""

    termo: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Nome completo, CPF (com ou sem formatação) ou NIS",
        examples=["12345678900", "123.456.789-00", "FULANO DE TAL"],
    )
    filtro_beneficiario: bool = Field(
        default=False,
        description="Filtrar apenas beneficiários de programa social",
    )


class BeneficioDetalhe(BaseModel):
    """Detalhes de um benefício social."""

    programa: str = Field(..., description="Nome do programa social")
    valor: Optional[str] = Field(None, description="Valor do benefício")
    competencia: Optional[str] = Field(None, description="Mês/ano de competência")
    parcela: Optional[str] = Field(None, description="Número da parcela")
    observacao: Optional[str] = Field(None, description="Observações adicionais")


class DadosPessoa(BaseModel):
    """Dados extraídos da pessoa consultada."""

    nome: Optional[str] = Field(None, description="Nome completo")
    cpf: Optional[str] = Field(None, description="CPF (parcialmente mascarado)")
    nis: Optional[str] = Field(None, description="NIS")
    localidade: Optional[str] = Field(None, description="Cidade/UF")
    relacoes: Optional[dict] = Field(
        None, description="Relações com o Governo Federal (seção → bool)"
    )
    detalhes: Optional[dict] = Field(None, description="Detalhes adicionais extraídos")


class ConsultaResponse(BaseModel):
    """Resposta da consulta ao Portal da Transparência."""

    sucesso: bool = Field(..., description="Se a consulta retornou dados com sucesso")
    dados: Optional[DadosPessoa] = Field(None, description="Dados da pessoa")
    beneficios: Optional[list[BeneficioDetalhe]] = Field(
        None, description="Benefícios sociais encontrados"
    )
    evidencia_base64: Optional[str] = Field(
        None, description="Screenshot da tela do panorama em Base64 (PNG)"
    )
    erro: Optional[str] = Field(None, description="Mensagem de erro, se houver")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Data/hora da consulta (ISO 8601)",
    )


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"

# Desafio 01 — Bot de Consulta ao Portal da Transparência

> Resolução do [Desafio 01 — Full Stack Python (RPA & Hyperautomation)](https://github.com/mostqi/desafios-fullstack-python/tree/main/desafio-01) da MOST.

Bot de automação (RPA) em Python que consulta dados de pessoas físicas no [Portal da Transparência](https://portaldatransparencia.gov.br) do Governo Federal, extraindo informações do panorama, benefícios sociais e evidências em screenshot.

## Como funciona

O bot automatiza um navegador Chromium (via Playwright) para simular a navegação humana no Portal da Transparência:

```
Usuário → API REST (FastAPI) → Playwright (Chromium headless) → Portal da Transparência
                                        ↓
                                Extrai dados + screenshot
                                        ↓
                              Retorna JSON estruturado
```

**Passo a passo do fluxo interno:**

1. Recebe uma requisição autenticada (OAuth 2.0 JWT) com o termo de busca
2. Abre o Chromium em modo headless com técnicas anti-detecção
3. Navega até a página de busca de pessoas físicas do portal
4. Preenche o campo de busca (CPF, NIS ou nome) e aplica filtros opcionais
5. Executa a busca e aguarda os resultados
6. Verifica erros (0 resultados, CPF inválido, etc.)
7. Clica no primeiro resultado → abre a página de panorama da pessoa
8. Extrai dados: nome, CPF, localidade, relações com o Governo Federal
9. Expande as seções do panorama e extrai tabelas de dados
10. Captura screenshot full-page e codifica em Base64
11. Navega pelos programas sociais (Auxílio Brasil, Auxílio Emergencial, Bolsa Família) e extrai detalhes
12. Retorna tudo como JSON estruturado

## Arquitetura

```
FastAPI (API REST + Swagger + OAuth 2.0)
  ├─ POST /api/token          ← OAuth 2.0 Password Flow (JWT)
  ├─ POST /api/consulta       ← Requer Bearer token
  │    └─ PortalTransparenciaScraper (Playwright)
  │         ├─ Busca por CPF, NIS ou Nome
  │         ├─ Extrai dados do Panorama
  │         ├─ Captura screenshot → Base64
  │         └─ Extrai detalhes de benefícios
  └─ GET  /api/health          ← Público
```

### Decisões técnicas

| Decisão | Justificativa |
|---------|---------------|
| **Playwright** | Recomendado pelo desafio. API async nativa, suporte headless robusto e boa compatibilidade com sites governamentais (CloudFront/WAF). |
| **FastAPI** | Framework Python mais performático para APIs async. Swagger/OpenAPI gerado automaticamente. |
| **OAuth 2.0 + JWT (PyJWT)** | Autenticação via Password Flow com tokens JWT. Credenciais e chave secreta configuráveis via variáveis de ambiente. Comparação timing-safe (`hmac`). |
| **Pydantic v2** | Validação de entrada/saída tipada com schemas JSON automáticos. Garante `max_length`, `min_length` nos inputs. |
| **Semáforo + Contextos isolados** | Cada consulta roda em seu próprio browser context, permitindo execução concorrente segura com controle de limite (`MAX_CONCURRENT`). |
| **Anti-detecção** | User-agent real, remoção de `navigator.webdriver`, flags do Chromium para evitar bloqueio pelo CloudFront do portal. |
| **Docker** | Reprodutibilidade: Playwright + Chromium empacotados. `.dockerignore` para não vazar `.env`. Container roda como usuário não-root. |

### Desafios encontrados

1. **Bloqueio CloudFront (403)**: O Portal da Transparência usa CloudFront com WAF que bloqueia Chromium headless padrão. Resolvido com user-agent real e remoção de flags de automação.
2. **Falsos positivos em `relações`**: O texto "Sanções", "Cartões" etc. aparecia no footer do site. Resolvido escopando a busca apenas ao texto da seção Panorama.
3. **Seções dinâmicas**: O portal carrega dados via accordion/AJAX. Resolvido expandindo todas as seções antes de extrair dados e capturar screenshot.

## Setup

### Pré-requisitos

- Python 3.11+
- pip

### Instalação

```bash
git clone https://github.com/fabrds/desafio-01.git
cd desafio-01

# Criar virtualenv
python -m venv .venv
source .venv/bin/activate  # Linux/macOS

# Instalar dependências
pip install -r requirements.txt

# Instalar browser do Playwright
playwright install chromium

# Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais (API_PASSWORD, SECRET_KEY)
```

### Executar

```bash
uvicorn app.main:app --port 8000
```

A API estará disponível em `http://localhost:8000`.

Documentação interativa (Swagger): **http://localhost:8000/docs**

### Docker

```bash
docker build -t portal-bot .
docker run -p 8000:8000 --env-file .env portal-bot
```

## API

### Autenticação (OAuth 2.0)

A API utiliza **OAuth 2.0 Password Flow** com tokens JWT. O endpoint `/api/consulta` requer autenticação.

```bash
# 1. Obter token
curl -X POST http://localhost:8000/api/token \
  -d "username=admin&password=changeme"

# Response: { "access_token": "eyJhbG...", "token_type": "bearer" }

# 2. Usar token nas consultas
curl -X POST http://localhost:8000/api/consulta \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbG..." \
  -d '{"termo": "JOSE DA SILVA"}'
```

As credenciais são configuráveis via variáveis de ambiente (`API_USERNAME`, `API_PASSWORD`, `SECRET_KEY`).

---

### `POST /api/consulta`

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `termo` | string (1–200 chars) | Sim | CPF, NIS ou nome completo |
| `filtro_beneficiario` | boolean | Não | Filtrar por beneficiário de programa social |

**Response (sucesso):**

```json
{
  "sucesso": true,
  "dados": {
    "nome": "JOSE JOSE DA SILVA",
    "cpf": "***.457.578-**",
    "nis": null,
    "localidade": "SÃO JOSÉ DOS CAMPOS - SP",
    "relacoes": {
      "Recebimentos de recursos": true,
      "Servidor": false,
      "Benefícios ao Cidadão": false
    },
    "detalhes": {}
  },
  "beneficios": null,
  "evidencia_base64": "iVBORw0KGgoAAAANSUhEUg...",
  "erro": null,
  "timestamp": "2026-03-17T18:00:00+00:00"
}
```

**Response (sucesso com benefícios):**

```json
{
  "sucesso": true,
  "dados": {
    "nome": "MARIA OLIVEIRA DE OLIVEIRA",
    "cpf": "***.206.620-**",
    "localidade": "VARGEM - RS"
  },
  "beneficios": [
    {
      "programa": "Auxílio Emergencial",
      "valor": "R$ 5.250,00",
      "competencia": "10/2024",
      "parcela": null,
      "observacao": null
    }
  ],
  "evidencia_base64": "iVBORw0KGgo...",
  "erro": null
}
```

**Response (erro — 0 resultados):**

```json
{
  "sucesso": false,
  "dados": null,
  "beneficios": null,
  "evidencia_base64": null,
  "erro": "Foram encontrados 0 resultados para a busca: '***.***.***-**'."
}
```

### `GET /api/health`

```json
{ "status": "ok", "version": "1.0.0" }
```

## Cenários de teste

| Cenário | Input | Resultado |
|---------|-------|-----------|
| Sucesso (Nome) | `JOSE DA SILVA` | Nome, CPF, localidade, relações, screenshot |
| Sucesso + Filtro | `MARIA OLIVEIRA` + filtro | Dados + Auxílio Emergencial R$ 5.250,00 |
| Erro (CPF) | `09912082699` | `"Foram encontrados 0 resultados..."` (CPF mascarado) |
| Sem token | Qualquer | `401 Not authenticated` |
| Token inválido | Qualquer | `401 Token inválido ou expirado` |
| Termo vazio | `""` | `422` (validação Pydantic) |
| Termo longo | 201+ chars | `422` (max_length) |

## Testes

```bash
# Instalar dependências de desenvolvimento
pip install -r requirements-dev.txt

# Rodar testes
pytest tests/ -v
```

```
tests/test_api.py::test_health                          PASSED
tests/test_api.py::test_token_sucesso                   PASSED
tests/test_api.py::test_token_credenciais_invalidas     PASSED
tests/test_api.py::test_consulta_sem_token              PASSED
tests/test_api.py::test_consulta_sem_termo              PASSED
tests/test_api.py::test_consulta_termo_excede_max       PASSED
tests/test_api.py::test_consulta_bot_nao_inicializado   PASSED
```

## Concorrência

O bot suporta execução concorrente:

- **Semáforo** (`asyncio.Semaphore`): limita consultas simultâneas (padrão: 5, configurável via `MAX_CONCURRENT`)
- **Contextos isolados**: cada consulta cria um browser context separado (cookies, storage, sessão próprios)
- **Browser compartilhado**: uma única instância do Chromium é reutilizada
- **Wall-clock timeout**: cada consulta tem limite de 120s para evitar travamento

```python
import asyncio, httpx

async def consulta_concorrente():
    headers = {"Authorization": "Bearer <token>"}
    async with httpx.AsyncClient() as client:
        tasks = [
            client.post(
                "http://localhost:8000/api/consulta",
                json={"termo": nome},
                headers=headers,
                timeout=120,
            )
            for nome in ["JOSE SILVA", "MARIA SANTOS", "JOAO OLIVEIRA"]
        ]
        results = await asyncio.gather(*tasks)
        for r in results:
            print(r.json()["dados"]["nome"])
```

## Segurança

- **OAuth 2.0**: toda consulta requer Bearer token JWT
- **Comparação timing-safe**: `hmac.compare_digest` para credenciais
- **CPF mascarado**: dados sensíveis nunca aparecem em logs ou respostas de erro
- **Variáveis de ambiente**: credenciais via `.env` (gitignored)
- **Startup warning**: alerta se credenciais padrão estiverem em uso
- **Docker**: container roda como usuário não-root, `.dockerignore` protege `.env`
- **Input validation**: `max_length=200` no termo, Pydantic valida todos os inputs

## Parte 2 — Hyperautomation (Bônus)

Workflow automatizado que integra a API (Parte 1) com Google Drive e Google Sheets.

### Fluxo

```
workflow/automation.py
  ├─ 1. Autentica na API (OAuth 2.0 → JWT)
  ├─ 2. Executa consulta (POST /api/consulta)
  ├─ 3. Salva JSON no Google Drive ([UUID]_[DATETIME].json)
  └─ 4. Atualiza Google Sheets com resumo + link do arquivo
```

### Setup do Google Cloud

1. Crie um projeto no [Google Cloud Console](https://console.cloud.google.com/)
2. Ative as APIs: **Google Drive API** e **Google Sheets API**
3. Crie um **Service Account** e baixe o JSON de credenciais (`credentials.json`)
4. Crie uma pasta no Google Drive e compartilhe com o email do service account
5. Crie uma planilha Google Sheets com headers: `ID | Nome | CPF | Timestamp | Status | Link Drive`
6. Compartilhe a planilha com o email do service account
7. Configure as variáveis no `.env`:

```bash
WORKFLOW_GOOGLE_CREDENTIALS_PATH=credentials.json
WORKFLOW_GOOGLE_DRIVE_FOLDER_ID=<id-da-pasta>     # extrair da URL da pasta
WORKFLOW_GOOGLE_SHEETS_ID=<id-da-planilha>         # extrair da URL da planilha
```

### Executar

```bash
# Certifique-se que a API (Parte 1) está rodando
uvicorn app.main:app --port 8000 &

# Executar workflow
python -m workflow.automation --termo "JOSE DA SILVA"
python -m workflow.automation --termo "MARIA OLIVEIRA" --filtro
```

**Output:**

```json
{
  "drive_link": "https://drive.google.com/file/d/1abc.../view",
  "sucesso": true
}
```

### Justificativa da plataforma

O desafio recomenda Make.com/Zapier/Activepieces. Optei por **implementação em Python** porque:

| Critério | Low-code (Make/Zapier) | Python (escolhido) |
|----------|----------------------|---------------------|
| Demonstrável | Requer conta + acesso à plataforma | Roda localmente, código versionado |
| Testável | Difícil de testar automaticamente | Pode ser testado com mocks |
| Reprodutível | Depende de export/import da plataforma | `git clone` + `pip install` |
| Integração com Parte 1 | HTTP request genérico | Reutiliza configs e autenticação |

### Alternativa no-code: n8n

Para uma abordagem no-code/low-code, a plataforma mais viável seria o [**n8n**](https://n8n.io/) — open source, self-hosted, e com free tier generoso. O workflow equivalente seria:

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  HTTP Request│───→│ HTTP Request │───→│ Google Drive  │───→│Google Sheets │
│  POST /token │    │POST /consulta│    │  Upload File  │    │ Append Row   │
│  (OAuth 2.0) │    │ (Bearer JWT) │    │  [UUID].json  │    │ ID,Nome,CPF  │
└─────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

**Por que n8n e não Make/Zapier:**

| Critério | Make.com / Zapier | n8n |
|----------|-------------------|-----|
| Open source | Proprietário | MIT License |
| Self-hosted | Apenas cloud | Docker / local / cloud |
| Free tier | Limitado (100-500 ops/mês) | Ilimitado (self-hosted) |
| Custo em produção | Pago por operação | Gratuito self-hosted |
| Privacidade | Dados passam pela plataforma | Dados ficam no seu servidor |
| Integração Google | Nativo | Nativo (Drive + Sheets nodes) |
| Webhook trigger | Sim | Sim (para automação por evento) |

**Setup rápido do n8n:**

```bash
# Rodar n8n localmente via Docker
docker run -p 5678:5678 n8nio/n8n

# Abrir http://localhost:5678 e criar o workflow com 4 nós:
# 1. HTTP Request → POST /api/token (form-data: username + password)
# 2. HTTP Request → POST /api/consulta (Bearer token do passo anterior)
# 3. Google Drive → Upload File (JSON do resultado)
# 4. Google Sheets → Append Row (ID, Nome, CPF, Timestamp, Link)
```

O n8n também suporta **triggers por webhook ou cron**, permitindo automatizar consultas periódicas sem intervenção manual.

## Estrutura do projeto

```
desafio-01/
├── app/                        # Parte 1 — API + Bot
│   ├── __init__.py
│   ├── main.py                 # FastAPI + lifespan
│   ├── auth.py                 # OAuth 2.0 (JWT + hmac)
│   ├── config.py               # Configurações
│   ├── schemas.py              # Modelos Pydantic
│   ├── scraper.py              # Bot Playwright
│   └── routes.py               # Endpoints da API
├── workflow/                   # Parte 2 — Hyperautomation
│   ├── __init__.py
│   ├── automation.py           # Workflow: API → Drive → Sheets
│   └── config.py               # Configurações do workflow
├── tests/
│   └── test_api.py             # 7 testes
├── requirements.txt
├── requirements-dev.txt
├── .env.example
├── .gitignore
├── .dockerignore
├── Dockerfile
└── README.md
```

## Variáveis de ambiente

### Parte 1 — API

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `HEADLESS` | `true` | Executar browser sem janela |
| `MAX_CONCURRENT` | `5` | Consultas simultâneas máximas |
| `PORT` | `8000` | Porta da API |
| `API_USERNAME` | `admin` | Usuário para autenticação |
| `API_PASSWORD` | `changeme` | Senha (altere em produção!) |
| `SECRET_KEY` | — | Chave para assinar JWT (altere em produção!) |
| `TOKEN_EXPIRE_MINUTES` | `60` | Validade do token em minutos |

### Parte 2 — Workflow

| Variável | Descrição |
|----------|-----------|
| `WORKFLOW_API_BASE_URL` | URL da API (padrão: `http://localhost:8000`) |
| `WORKFLOW_GOOGLE_CREDENTIALS_PATH` | Caminho do JSON do service account |
| `WORKFLOW_GOOGLE_DRIVE_FOLDER_ID` | ID da pasta no Google Drive |
| `WORKFLOW_GOOGLE_SHEETS_ID` | ID da planilha Google Sheets |

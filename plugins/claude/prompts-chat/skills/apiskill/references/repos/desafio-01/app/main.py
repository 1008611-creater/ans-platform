import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

import app.routes as routes_module
from app.config import APP_VERSION, settings
from app.scraper import PortalTransparenciaScraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    bot = PortalTransparenciaScraper(
        headless=settings.headless,
        max_concurrent=settings.max_concurrent,
    )
    await bot.start()
    app.state.scraper = bot
    yield
    await bot.stop()
    app.state.scraper = None


app = FastAPI(
    title="Portal da Transparência — Bot de Consulta",
    description=(
        "API para automação de consultas de pessoas físicas no "
        "Portal da Transparência do Governo Federal.\n\n"
        "Suporta busca por **CPF**, **NIS** ou **nome**, com extração "
        "de dados do panorama, benefícios sociais e captura de evidência "
        "em Base64.\n\n"
        "**Autenticação**: OAuth 2.0 Password Flow — obtenha token em "
        "`POST /api/token`."
    ),
    version=APP_VERSION,
    lifespan=lifespan,
)

app.include_router(routes_module.router, prefix="/api", tags=["Consulta"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
    )

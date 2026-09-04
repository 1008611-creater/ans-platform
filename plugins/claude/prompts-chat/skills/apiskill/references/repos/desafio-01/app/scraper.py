import asyncio
import base64
import logging
import re
from datetime import datetime, timezone
from typing import Optional

from playwright.async_api import Page, TimeoutError as PlaywrightTimeout
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------
BASE_URL = "https://portaldatransparencia.gov.br"
SEARCH_URL = f"{BASE_URL}/pessoa-fisica/busca/lista"
TIMEOUT = 60_000  # ms

WAIT_OVERLAY_MS = 400
WAIT_SHORT_MS = 500
WAIT_MEDIUM_MS = 1_500
WAIT_LONG_MS = 2_000
WAIT_NAV_MS = 3_000

MAX_TABELAS = 5
MAX_LINHAS_POR_TABELA = 10

PROGRAMAS_ALVO = [
    "Auxílio Brasil",
    "Auxílio Emergencial",
    "Bolsa Família",
]

SECOES_PANORAMA = {
    "Recebimentos de recursos": r"recebimentos?\s+de\s+recursos",
    "Benefícios ao Cidadão": r"benef[ií]cios?\s+ao\s+cidad[ãa]o",
    "Servidor": r"\bservidor\b",
    "Sanções": r"\bsan[çc][õo]es?\b",
    "Imóveis Funcionais": r"im[oó]veis?\s+funcionais?",
    "Cartões de Pagamento": r"cart[õo]es?\s+de\s+pagamento",
}


# ---------------------------------------------------------------------------
# Helpers públicos
# ---------------------------------------------------------------------------
def resposta_erro(mensagem: str) -> dict:
    return {
        "sucesso": False,
        "dados": None,
        "beneficios": None,
        "evidencia_base64": None,
        "erro": mensagem,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def mask_termo(termo: str) -> str:
    """Mascara dados sensíveis para log (CPF → ***...***)."""
    digitos = termo.replace(".", "").replace("-", "")
    if re.match(r"^\d{11}$", digitos):
        return "***.***.***-**"
    return f"{termo[:3]}***" if len(termo) > 3 else "***"


# ---------------------------------------------------------------------------
# Scraper
# ---------------------------------------------------------------------------
class PortalTransparenciaScraper:
    """Bot Playwright para consultas no Portal da Transparência.

    - Execução headless com anti-detecção
    - Concorrência via semáforo + browser contexts isolados
    - Captura de evidência (screenshot → Base64)
    """

    def __init__(self, headless: bool = True, max_concurrent: int = 5):
        self.headless = headless
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._playwright = None
        self._browser = None

    # -- lifecycle -----------------------------------------------------------

    async def start(self):
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=self.headless,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-features=IsolateOrigins,site-per-process",
            ],
        )
        logger.info("Browser inicializado (headless=%s)", self.headless)

    async def stop(self):
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        logger.info("Browser encerrado")

    # -- public API ----------------------------------------------------------

    async def consultar(
        self, termo: str, filtro_beneficiario: bool = False
    ) -> dict:
        """Executa consulta completa no portal (thread-safe via semáforo)."""
        if self._browser is None:
            return resposta_erro("Browser não inicializado.")
        async with self._semaphore:
            context = await self._browser.new_context(
                viewport={"width": 1920, "height": 1080},
                locale="pt-BR",
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/131.0.0.0 Safari/537.36"
                ),
            )
            page = await context.new_page()
            await page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['pt-BR', 'pt', 'en-US', 'en']
                });
            """)
            try:
                return await self._executar_consulta(
                    page, termo, filtro_beneficiario
                )
            except PlaywrightTimeout as exc:
                logger.error("Timeout na consulta '%s': %s", mask_termo(termo), exc)
                return resposta_erro(
                    "Tempo limite excedido durante a consulta. Tente novamente."
                )
            except Exception as exc:
                logger.error(
                    "Erro na consulta '%s': %s",
                    mask_termo(termo), exc, exc_info=True,
                )
                return resposta_erro(f"Erro durante a consulta: {exc}")
            finally:
                await context.close()

    # -- fluxo principal -----------------------------------------------------

    async def _executar_consulta(
        self, page: Page, termo: str, filtro_beneficiario: bool
    ) -> dict:
        # 1. Navegar para a página de busca
        await page.goto(SEARCH_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        campo = page.locator("#termo")
        await campo.wait_for(state="visible", timeout=TIMEOUT)
        logger.info("Página de busca carregada")

        await self._dismiss_overlays(page)

        # 2. Preencher termo de busca
        await campo.fill(termo)
        logger.info("Termo preenchido: %s", mask_termo(termo))

        # 3. Aplicar filtro de beneficiário (se solicitado)
        if filtro_beneficiario:
            await self._aplicar_filtro_beneficiario(page)

        # 4. Executar busca
        await page.evaluate("buscar()")
        logger.info("Busca executada")

        # 5. Aguardar carregamento dos resultados
        try:
            await page.wait_for_selector(
                "#resultados a, #countResultados, .alert", timeout=15_000
            )
        except PlaywrightTimeout:
            logger.warning("Timeout aguardando resultados — continuando verificação")
        await page.wait_for_timeout(WAIT_LONG_MS)

        # 6. Verificar erros / resultados vazios
        erro = await self._verificar_erros(page, termo)
        if erro:
            return erro

        # 7. Navegar para a página da pessoa (primeiro resultado)
        if not await self._navegar_para_pessoa(page):
            return resposta_erro(
                "Não foi possível acessar os dados da pessoa encontrada."
            )

        # 8. Extrair dados do panorama (já expande seções)
        dados = await self._extrair_panorama(page)

        # 9. Capturar screenshot → Base64 (após expandir seções)
        evidencia = await self._capturar_screenshot(page)

        # 10. Extrair detalhes de benefícios (seções já expandidas)
        beneficios = await self._extrair_beneficios(page)

        return {
            "sucesso": True,
            "dados": dados,
            "beneficios": beneficios,
            "evidencia_base64": evidencia,
            "erro": None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # -- etapas auxiliares ---------------------------------------------------

    async def _dismiss_overlays(self, page: Page):
        """Fecha banners de cookie e modais."""
        for selector in (
            "button:has-text('Aceitar')",
            "button:has-text('Entendi')",
            "button:has-text('OK')",
            "button:has-text('Fechar')",
            ".cookie-banner button",
            "#cookie-bar button",
        ):
            try:
                btn = page.locator(selector).first
                if await btn.is_visible(timeout=WAIT_MEDIUM_MS):
                    await btn.click()
                    await page.wait_for_timeout(WAIT_OVERLAY_MS)
                    break
            except Exception:
                continue

    async def _aplicar_filtro_beneficiario(self, page: Page):
        """Expande o painel de filtros e marca 'Beneficiário de Programa Social'."""
        try:
            btn = page.locator("#btnConsultarPF")
            if await btn.is_visible(timeout=3000):
                cls = await btn.get_attribute("class") or ""
                if "collapsed" in cls:
                    await btn.click()
                    await page.wait_for_timeout(WAIT_SHORT_MS)

            cb = page.locator("#beneficiarioProgramaSocial")
            await cb.wait_for(state="visible", timeout=5000)
            if not await cb.is_checked():
                await cb.check()
            logger.info("Filtro de beneficiário aplicado")
        except Exception as exc:
            logger.warning("Não foi possível aplicar filtro: %s", exc)

    async def _verificar_erros(self, page: Page, termo: str) -> Optional[dict]:
        """Retorna dict de erro se a busca não trouxe resultados."""
        try:
            count_el = page.locator("#countResultados")
            if await count_el.is_visible(timeout=5000):
                txt = (await count_el.text_content() or "").strip()
                if txt == "0":
                    return resposta_erro(
                        f"Foram encontrados 0 resultados para a busca: "
                        f"'{mask_termo(termo)}'."
                    )

            for msg in (
                "Não foi possível retornar",
                "Nenhum resultado encontrado",
                "CPF inválido",
                "NIS inválido",
            ):
                el = page.get_by_text(msg).first
                try:
                    if await el.is_visible(timeout=1000):
                        full = (await el.text_content() or msg).strip()
                        return resposta_erro(full)
                except Exception:
                    continue

            res = page.locator("#resultados")
            if await res.is_visible(timeout=3000):
                html = (await res.inner_html()).strip()
                if not html:
                    return resposta_erro(
                        f"Foram encontrados 0 resultados para a busca: "
                        f"'{mask_termo(termo)}'."
                    )
        except Exception as exc:
            logger.warning("Erro ao verificar resultados: %s", exc)

        return None

    async def _navegar_para_pessoa(self, page: Page) -> bool:
        """Clica no primeiro resultado e aguarda carregamento da página."""
        try:
            link = page.locator("#resultados a").first
            await link.wait_for(state="visible", timeout=10_000)

            logger.debug("Navegando para: %s", await link.get_attribute("href"))

            await link.click()
            await page.wait_for_load_state("domcontentloaded", timeout=TIMEOUT)
            await page.wait_for_timeout(WAIT_NAV_MS)
            return True
        except Exception as exc:
            logger.error("Falha ao navegar para pessoa: %s", exc)
            return False

    # -- extração do panorama (decomposta) -----------------------------------

    async def _extrair_panorama(self, page: Page) -> dict:
        """Extrai dados da seção Panorama da pessoa."""
        dados: dict = {
            "nome": None,
            "cpf": None,
            "nis": None,
            "localidade": None,
            "relacoes": {},
            "detalhes": {},
        }
        try:
            await page.wait_for_load_state("domcontentloaded")
            await self._extrair_campos_basicos(page, dados)
            await self._detectar_relacoes(page, dados)
            await self._expandir_secoes(page, dados)
            dados["detalhes"] = await self._extrair_tabelas(page)
            logger.info("Panorama extraído: nome=%s", dados["nome"])
        except Exception as exc:
            logger.error("Erro ao extrair panorama: %s", exc)
        return dados

    async def _extrair_campos_basicos(self, page: Page, dados: dict):
        """Extrai nome, CPF, localidade via labels e NIS via regex."""
        for campo in ("Nome", "CPF", "Localidade"):
            try:
                label = page.get_by_text(campo, exact=True).first
                if await label.is_visible(timeout=WAIT_LONG_MS):
                    parent = label.locator("..")
                    texto = (await parent.text_content() or "").strip()
                    valor = texto.replace(campo, "", 1).strip()
                    if valor:
                        dados[campo.lower()] = valor
            except Exception:
                continue

        body = await page.text_content("body") or ""
        nis_match = re.search(r"NIS[:\s]*([\d\.\-]+)", body)
        if nis_match:
            dados["nis"] = nis_match.group(1).strip()

    async def _detectar_relacoes(self, page: Page, dados: dict):
        """Detecta quais seções de relação existem no panorama."""
        body = await page.text_content("body") or ""
        # Escopa ao texto do panorama para evitar falsos positivos
        panorama_match = re.search(
            r"Panorama da rela[çc][ãa]o.*?(?=Compartilhe|gov\.br|\Z)",
            body, re.DOTALL | re.IGNORECASE,
        )
        panorama_text = panorama_match.group() if panorama_match else ""

        for nome_secao, padrao in SECOES_PANORAMA.items():
            dados["relacoes"][nome_secao] = bool(
                re.search(padrao, panorama_text, re.IGNORECASE)
            )

    async def _expandir_secoes(self, page: Page, dados: dict):
        """Expande accordions e seções clicáveis para revelar tabelas."""
        # Botões com aria-expanded
        botoes = page.locator(
            "button[aria-expanded], [class*='collaps'], "
            "[role='button'][aria-expanded]"
        )
        for i in range(await botoes.count()):
            try:
                btn = botoes.nth(i)
                if await btn.get_attribute("aria-expanded") == "false":
                    await btn.click()
                    await page.wait_for_timeout(WAIT_MEDIUM_MS)
            except Exception:
                continue

        # Fallback: clicar pelo texto das seções detectadas
        for nome_secao in SECOES_PANORAMA:
            if not dados["relacoes"].get(nome_secao):
                continue
            try:
                el = page.get_by_text(nome_secao, exact=False).first
                if await el.is_visible(timeout=1000):
                    await el.click()
                    await page.wait_for_timeout(WAIT_MEDIUM_MS)
            except Exception:
                continue

    async def _extrair_tabelas(self, page: Page) -> dict:
        """Extrai dados de todas as tabelas visíveis após expansão."""
        detalhes: dict = {}
        tables = page.locator("table")
        n = await tables.count()
        for i in range(min(n, MAX_TABELAS)):
            try:
                tbl = tables.nth(i)
                headers = [
                    h.strip() for h in await tbl.locator("th").all_text_contents()
                ]
                rows_data = []
                for row in (await tbl.locator("tbody tr").all())[:MAX_LINHAS_POR_TABELA]:
                    cells = [
                        c.strip() for c in await row.locator("td").all_text_contents()
                    ]
                    if cells:
                        rows_data.append(
                            dict(zip(headers, cells)) if headers else cells
                        )
                if rows_data:
                    detalhes[f"tabela_{i + 1}"] = rows_data
            except Exception:
                continue
        return detalhes

    # -- screenshot ----------------------------------------------------------

    async def _capturar_screenshot(self, page: Page) -> Optional[str]:
        """Captura screenshot full-page e retorna como string Base64."""
        try:
            png = await page.screenshot(full_page=True, type="png")
            b64 = base64.b64encode(png).decode("utf-8")
            logger.info("Screenshot capturado (%d bytes)", len(png))
            return b64
        except Exception as exc:
            logger.error("Falha ao capturar screenshot: %s", exc)
            return None

    # -- extração de benefícios ----------------------------------------------

    async def _extrair_beneficios(self, page: Page) -> Optional[list[dict]]:
        """Extrai detalhes dos programas sociais.

        As seções já foram expandidas por _extrair_panorama.
        """
        beneficios: list[dict] = []
        url_panorama = page.url

        for programa in PROGRAMAS_ALVO:
            try:
                el = page.get_by_text(programa, exact=False).first
                if not await el.is_visible(timeout=WAIT_LONG_MS):
                    continue

                beneficio = {
                    "programa": programa,
                    "valor": None,
                    "competencia": None,
                    "parcela": None,
                    "observacao": None,
                }

                # Tenta clicar para ver detalhes
                try:
                    await el.click()
                    await page.wait_for_timeout(WAIT_LONG_MS)
                    await page.wait_for_load_state("domcontentloaded")
                except Exception:
                    pass

                # Extrai de tabelas
                tabelas = await self._ler_tabelas_raw(page)
                self._preencher_beneficio_de_tabelas(tabelas, beneficio)

                # Fallback: regex no body (leitura única)
                if not (beneficio["valor"] and beneficio["competencia"]):
                    body = await page.text_content("body") or ""
                    prog_esc = re.escape(programa)
                    if not beneficio["valor"]:
                        match_val = re.search(
                            rf"{prog_esc}.*?R\$\s*([\d\.,]+)",
                            body, re.DOTALL | re.IGNORECASE,
                        )
                        if match_val:
                            beneficio["valor"] = f"R$ {match_val.group(1)}"
                    if not beneficio["competencia"]:
                        match_comp = re.search(
                            rf"{prog_esc}.*?(\d{{2}}/\d{{4}})",
                            body, re.DOTALL | re.IGNORECASE,
                        )
                        if match_comp:
                            beneficio["competencia"] = match_comp.group(1)

                beneficios.append(beneficio)
                logger.info("Benefício extraído: %s", programa)

                # Volta ao panorama se navegou para outra página
                if page.url != url_panorama:
                    try:
                        await page.goto(
                            url_panorama,
                            wait_until="domcontentloaded",
                            timeout=TIMEOUT,
                        )
                        await page.wait_for_timeout(WAIT_MEDIUM_MS)
                    except Exception:
                        pass

            except Exception as exc:
                logger.warning("Erro ao extrair '%s': %s", programa, exc)

        return beneficios or None

    # -- helpers internos ----------------------------------------------------

    async def _ler_tabelas_raw(self, page: Page) -> list[list[list[str]]]:
        """Lê todas as tabelas visíveis e retorna como lista de linhas."""
        resultado = []
        tables = page.locator("table")
        for i in range(await tables.count()):
            tbl = tables.nth(i)
            linhas = []
            for row in (await tbl.locator("tr").all())[:20]:
                cells = await row.locator("td, th").all_text_contents()
                if cells:
                    linhas.append([c.strip() for c in cells])
            if linhas:
                resultado.append(linhas)
        return resultado

    @staticmethod
    def _preencher_beneficio_de_tabelas(
        tabelas: list[list[list[str]]], beneficio: dict
    ):
        """Preenche campos do benefício a partir de dados tabulares.

        Mapeia colunas por header quando disponível, senão usa regex.
        """
        for linhas in tabelas:
            if not linhas:
                continue

            headers = [h.lower().strip() for h in linhas[0]]
            data_rows = linhas[1:] if len(linhas) > 1 else []

            for row in data_rows:
                for idx, cell in enumerate(row):
                    cell = cell.strip()
                    if not cell:
                        continue
                    header = headers[idx] if idx < len(headers) else ""

                    if not beneficio["valor"] and (
                        "valor" in header or re.match(r"R\$", cell)
                    ):
                        beneficio["valor"] = cell

                    if not beneficio["competencia"] and (
                        "compet" in header
                        or "mês" in header
                        or re.match(r"\d{2}/\d{4}", cell)
                    ):
                        beneficio["competencia"] = cell

                    # Precedência explícita: regex AND header check
                    if not beneficio["parcela"] and (
                        "parcela" in header
                        or (re.match(r"^\d{1,2}$", cell) and "parcela" in " ".join(headers))
                    ):
                        beneficio["parcela"] = cell

                    if not beneficio["observacao"] and (
                        "obs" in header or "situação" in header
                    ):
                        beneficio["observacao"] = cell

                if any(beneficio[k] for k in ("valor", "competencia")):
                    break

            # Fallback genérico por regex
            if not any(beneficio[k] for k in ("valor", "competencia")):
                for row in linhas:
                    for cell in row:
                        cell = cell.strip()
                        if not beneficio["valor"] and re.match(r"R\$", cell):
                            beneficio["valor"] = cell
                        if not beneficio["competencia"] and re.match(
                            r"\d{2}/\d{4}", cell
                        ):
                            beneficio["competencia"] = cell

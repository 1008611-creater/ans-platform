import http from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createAnsPointsClient, AnsPointsError, ANS_ORIGIN } from '../src/index.js';

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const opaqueToken = () => randomBytes(32).toString('base64url');
const equalToken = (left, right) => typeof left === 'string' && typeof right === 'string'
  && left.length === right.length && timingSafeEqual(Buffer.from(left), Buffer.from(right));

/** Memory is explicitly demo-only. Production must replace sessions/orders/entitlements with durable storage. */
export function createDemoServer({ appOrigin = 'http://localhost:3000', client, listingId, tierId, pricePoints } = {}) {
  const origin = new URL(appOrigin);
  if (origin.origin !== appOrigin || origin.username || origin.password || !['http:', 'https:'].includes(origin.protocol)) throw new Error('Invalid demo APP_ORIGIN.');
  if (origin.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)) throw new Error('Remote demo requires HTTPS.');
  const secure = origin.protocol === 'https:';
  const configured = Boolean(client && listingId && Number.isFinite(pricePoints) && pricePoints > 0 && secure);
  const sessions = new Map();
  const orders = new Map();
  const entitlements = new Map();

  function html(res, status, title, content) {
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
      'Content-Security-Policy': `default-src 'none'; style-src 'unsafe-inline'; form-action 'self' ${ANS_ORIGIN}; base-uri 'none'; frame-ancestors 'none'`,
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    res.end(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><style>body{max-width:680px;margin:3rem auto;padding:0 1rem;font:16px/1.8 system-ui;color:#203047;background:#f6f8fb}article{background:white;padding:2rem;border-radius:16px}button,a{font:inherit}button{padding:.6rem 1rem;border-radius:8px;border:0;background:#224edf;color:white;cursor:pointer}p{overflow-wrap:anywhere}</style><article><h1>${escapeHtml(title)}</h1>${content}</article></html>`);
  }
  const form = (session, action, label) => `<form method="post" action="${action}"><input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}"><button>${escapeHtml(label)}</button></form>`;
  const homeLink = '<p><a href="/">返回演示站点</a></p>';

  function getSession(req, res) {
    const cookie = (req.headers.cookie ?? '').split(';').map((v) => v.trim()).find((v) => v.startsWith('ans_demo_session='));
    const token = cookie?.slice('ans_demo_session='.length);
    if (token && sessions.has(token)) return sessions.get(token);
    const id = opaqueToken();
    const session = { localUserId: randomUUID(), csrf: opaqueToken(), reference: null };
    sessions.set(id, session);
    res.setHeader('Set-Cookie', `ans_demo_session=${id}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`);
    return session;
  }

  async function readForm(req) {
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 4096) throw new Error('FORM_TOO_LARGE');
      chunks.push(chunk);
    }
    return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
  }

  function receiptMatches(order, data) {
    return data.reference === order.reference && data.listingId === order.listingId
      && data.tierId === order.tierId && data.pricePoints === order.pricePoints
      && (order.checkoutId === null || data.id === order.checkoutId);
  }

  async function reconcile(session) {
    const order = session.reference && orders.get(session.reference);
    if (!order || order.localUserId !== session.localUserId || !order.checkoutId) return null;
    const data = await client.getCheckout(order.checkoutId);
    if (!receiptMatches(order, data)) throw new Error('RECEIPT_MISMATCH');
    // Keep the first paid identity/order binding. An unexpected replacement cannot grant access.
    if ((order.ansUserId && data.ansUserId !== order.ansUserId)
        || (order.orderId && data.orderId !== order.orderId)) throw new Error('RECEIPT_MISMATCH');
    if (data.status === 'paid' && data.entitlementActive) {
      if (!data.orderId || !data.ansUserId) throw new Error('RECEIPT_MISMATCH');
      order.ansUserId = data.ansUserId;
      order.orderId = data.orderId;
      // Upsert by the local purchase reference; repeated callbacks cannot grant twice.
      entitlements.set(order.reference, { localUserId: session.localUserId, active: true });
    } else {
      // paidAt alone is never a grant: dispute/refund/pending must suspend this entitlement.
      entitlements.set(order.reference, { localUserId: session.localUserId, active: false });
    }
    return data;
  }

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', appOrigin);
      const session = getSession(req, res);
      if (req.method === 'GET' && url.pathname === '/') {
        const text = '<p>这是仅用于阅读和本地联调的服务端演示：内存演示会话没有真实账号认证；重启会丢失订单和权益。生产项目必须接自己的登录、数据库和权益系统。</p>';
        html(res, 200, 'ANS 积分接入演示', text + (configured
          ? `<p>当前真实商品档次需要 ${escapeHtml(pricePoints)} ANS 积分。创建结算单后前往 ANS 登录并明确确认支付。</p>${form(session, '/checkout', '创建或继续同一结算单')}<p><a href="/return">查询当前结算结果</a></p><p><a href="/protected">访问受保护功能</a></p>`
          : '<p>尚未配置真实服务端凭据、商品、价格或 HTTPS 返回来源，不能创建结算单。请按 README 设置环境变量，再使用自己的 HTTPS 站点与真实 ANS 商品联调。</p>'));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/return') {
        // Ignore status/paid/orderId query parameters: they are not payment evidence.
        const reference = url.searchParams.get('reference');
        if (reference && reference !== session.reference) { html(res, 403, '结算单不属于当前会话', homeLink); return; }
        html(res, 200, '返回商户', '<p>回跳只表示浏览器回来了。点击下方按钮，由本服务器读取 ANS 权威回执。</p>' + form(session, '/verify', '查询实际支付与权益') + homeLink);
        return;
      }
      if (req.method === 'GET' && url.pathname === '/protected') {
        if (!configured) { html(res, 503, '演示尚未配置', homeLink); return; }
        const data = await reconcile(session);
        const entitlement = session.reference && entitlements.get(session.reference);
        if (data?.entitlementActive !== true || entitlement?.active !== true || entitlement.localUserId !== session.localUserId) {
          html(res, 403, '当前没有有效积分购买权益', homeLink); return;
        }
        html(res, 200, '受保护功能已授权', '<p>本次访问已重新核对服务器回执，积分购买权益有效。这里接入你自己项目的实际功能。</p>' + homeLink);
        return;
      }
      if (req.method !== 'POST' || !['/checkout', '/verify'].includes(url.pathname)) { html(res, 404, '页面不存在', homeLink); return; }
      if (req.headers.origin !== appOrigin || (req.headers['content-type'] ?? '').split(';')[0] !== 'application/x-www-form-urlencoded') {
        html(res, 403, '请从演示站点发起操作', homeLink); return;
      }
      const body = await readForm(req);
      if (!equalToken(body.get('csrf'), session.csrf)) { html(res, 403, '会话校验失败', homeLink); return; }
      if (!configured) { html(res, 503, '演示尚未配置', homeLink); return; }
      if (url.pathname === '/checkout') {
        // Create and bind locally BEFORE sending. An unknown network outcome retains this reference.
        if (!session.reference) {
          session.reference = randomUUID();
          orders.set(session.reference, { reference: session.reference, localUserId: session.localUserId,
            listingId, tierId: tierId ?? null, pricePoints, checkoutId: null, ansUserId: null, orderId: null,
            returnUrl: `${appOrigin}/return?reference=${session.reference}` });
        }
        const order = orders.get(session.reference);
        const data = await client.createCheckout({ reference: order.reference,
          ...(order.tierId === null ? {} : { tierId: order.tierId }), returnUrl: order.returnUrl }, { maxAttempts: 2 });
        if (!receiptMatches(order, data)) throw new Error('RECEIPT_MISMATCH');
        order.checkoutId = data.id;
        res.writeHead(303, { Location: data.checkoutUrl, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
        res.end();
        return;
      }
      const data = await reconcile(session);
      html(res, 200, data?.entitlementActive ? '权益已生效' : '尚无有效购买权益',
        `<p>实际结算状态：${escapeHtml(data?.status ?? '未创建')}。${data?.entitlementActive ? '可访问项目功能。' : '未付款、退款或争议中的订单不会授权。'}</p><p><a href="/protected">访问受保护功能</a></p>${homeLink}`);
    } catch (error) {
      // Never print upstream body, fetch errors, request URLs, credential or opaque account identifiers.
      const uncertain = error instanceof AnsPointsError && error.uncertain;
      html(res, 503, '暂时无法核对结算', `<p>${uncertain ? '请求结果暂时不确定；请继续原结算单，不要新建购买。' : '请检查服务器配置或稍后重试；暂不授权功能。'}</p>${homeLink}`);
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const apiKey = process.env.ANS_MERCHANT_KEY;
  let client;
  if (apiKey) client = createAnsPointsClient({ apiKey });
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid demo port.');
  const server = createDemoServer({ appOrigin: process.env.APP_ORIGIN ?? `http://localhost:${port}`, client,
    listingId: process.env.ANS_LISTING_ID, tierId: process.env.ANS_TIER_ID || undefined,
    pricePoints: Number(process.env.ANS_EXPECTED_PRICE_POINTS) });
  server.listen(port, '127.0.0.1', () => console.log('ANS demo started. See README for server-side configuration and HTTPS setup.'));
}

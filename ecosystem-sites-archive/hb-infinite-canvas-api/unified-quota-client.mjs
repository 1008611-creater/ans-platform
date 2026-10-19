const inflight = new Map();
const completed = new Map();

function normalizeEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  if (!value.includes("@")) throw new Error("UNIFIED_QUOTA_EMAIL_INVALID");
  return value;
}

function normalizeAmount(amount) {
  const value = Number(amount);
  if (!Number.isInteger(value) || value === 0) throw new Error("UNIFIED_QUOTA_AMOUNT_INVALID");
  return value;
}

function normalizeReference(reference) {
  const value = String(reference || "").trim();
  if (!value || value.length > 180) throw new Error("UNIFIED_QUOTA_REFERENCE_INVALID");
  return value;
}

export function createUnifiedQuotaClient({ endpoint, token, fetchImpl = fetch }) {
  if (!endpoint || !token) throw new Error("UNIFIED_QUOTA_MISCONFIGURED");

  async function postBridge(payload) {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    let body = null;
    try { body = await response.json(); } catch { body = null; }
    return { ok: response.ok, status: response.status, body };
  }

  async function write(input) {
    const email = normalizeEmail(input.email);
    const amount = normalizeAmount(input.amount);
    const reference = normalizeReference(input.reference);
    const reason = String(input.reason || "unified_quota");
    const key = `${email}\n${reference}`;
    const cached = completed.get(key);
    if (cached) return { ...cached, duplicate: true };
    const pending = inflight.get(key);
    if (pending) return { ...(await pending), duplicate: true };

    const request = (async () => {
      const baseRef = "hb:" + reference.replace(/:(reserve|settle|refund)$/, "");
      let payload;
      if (amount < 0) {
        payload = {
          operation: "reserve",
          email,
          refId: reference.endsWith(":settle") ? baseRef + ":extra" : baseRef,
          refType: "canvas-task",
          costPoints: Math.abs(amount),
          note: reason === "task_reservation" ? "无限画布 AIGC 任务预扣" : "无限画布 AIGC 任务结算补扣",
        };
      } else {
        payload = {
          operation: "settle",
          email,
          refId: baseRef,
          refType: "canvas-task",
          costPoints: amount,
          actualCostPoints: 0,
          success: false,
          note: reason === "task_refund" ? "无限画布 AIGC 任务退回积分" : "无限画布 AIGC 积分差额退回",
        };
      }

      let res = await postBridge(payload);
      if (res.status === 404 && res.body?.error === "account_unavailable") {
        await postBridge({ operation: "auth", mode: "oidc", email });
        res = await postBridge(payload);
      }

      if (res.status === 402 || res.body?.error === "insufficient_points") {
        const err = new Error("UNIFIED_QUOTA_402");
        err.code = "CREDITS_INSUFFICIENT";
        err.balance = Number(res.body?.balance ?? 0);
        throw err;
      }

      if (!res.ok) throw new Error(`UNIFIED_QUOTA_${res.status}`);
      const balance = Number(res.body?.balance ?? res.body?.quota);
      if (!Number.isFinite(balance)) throw new Error("UNIFIED_QUOTA_INVALID");
      return { balance, amount, reference, authority: "ans" };
    })();

    inflight.set(key, request);
    try {
      const result = await request;
      completed.set(key, result);
      return result;
    } finally {
      inflight.delete(key);
    }
  }

  return { apply: write };
}

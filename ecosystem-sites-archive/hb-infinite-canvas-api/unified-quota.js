export async function callAnsBridge(payload) {
    const endpoint = process.env.ANS_QUOTA_BRIDGE_URL || process.env.NEW_API_QUOTA_URL;
    const token = process.env.ANS_QUOTA_BRIDGE_KEY || process.env.NEW_API_QUOTA_TOKEN;
    if (!endpoint || !token) return null;
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "accept": "application/json",
            "content-type": "application/json",
            "authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
    });
    let body = null;
    try { body = await response.json(); } catch { body = null; }
    return { ok: response.ok, status: response.status, body };
}

export async function readUnifiedQuota(email) {
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized) return null;
    let res = await callAnsBridge({ operation: "balance", email: normalized });
    if (!res) return null;
    if (res.status === 404 && res.body?.error === "account_unavailable") {
        const provisioned = await callAnsBridge({ operation: "auth", mode: "oidc", email: normalized });
        if (provisioned && provisioned.ok && provisioned.body) {
            return {
                balance: Number(provisioned.body.balance ?? 0),
                ledger: [],
                authority: "ans",
                source: "ans",
                ansUserId: provisioned.body.user?.id || null,
            };
        }
    }
    if (!res.ok) throw new Error(`UNIFIED_QUOTA_${res.status}`);
    const balance = Number(res.body?.balance ?? res.body?.quota ?? 0);
    if (!Number.isFinite(balance)) throw new Error("UNIFIED_QUOTA_INVALID");
    return {
        balance,
        ledger: Array.isArray(res.body?.ledger) ? res.body.ledger : [],
        authority: "ans",
        source: "ans",
        ansUserId: res.body?.user?.id || null,
    };
}

export async function authWithAns({ mode, email, password, name }) {
    return callAnsBridge({ operation: "auth", mode, email, password, name });
}

export async function redeemWithAns({ email, code }) {
    return callAnsBridge({ operation: "redeem", email, code });
}

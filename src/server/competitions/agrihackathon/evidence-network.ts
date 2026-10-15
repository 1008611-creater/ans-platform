import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpsRequest } from "node:https";
import { createHash } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { evidenceFail, EvidenceRetryError } from "./evidence-config";
import { agriMaterialUrlSchema, type agriRepositoryRefSchema } from "@/contracts/agri-submissions";
import type { z } from "zod";
export function publicEvidenceIP(value: string) {
    if (isIP(value) === 4) {
        const a = value.split(".").map(Number);
        return !(a[0] === 0 || a[0] === 10 || a[0] === 127 || a[0] >= 224 || a[0] === 169 && a[1] === 254 || a[0] === 172 && a[1] >= 16 && a[1] <= 31 || a[0] === 192 && (a[1] === 168 || a[1] === 0 || a[1] === 2 || a[1] === 88 && a[2] === 99) || a[0] === 100 && a[1] >= 64 && a[1] <= 127 || a[0] === 198 && (a[1] === 18 || a[1] === 19 || a[1] === 51 && a[2] === 100) || a[0] === 203 && a[1] === 0 && a[2] === 113);
    }
    if (isIP(value) !== 6)
        return false;
    const lower = value.toLowerCase();
    const [left, right = ""] = lower.split("::");
    const a = left ? left.split(":") : [], b = right ? right.split(":") : [];
    const groups = [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill("0"), ...b].map(x => parseInt(x, 16));
    const first = groups[0], second = groups[1];
    return first >= 0x2000 && first < 0x4000 && first !== 0x3fff && first !== 0x2002 && !(first === 0x2001 && (second < 0x200 || second === 0xdb8));
}
export function allowedEvidenceURL(raw: string, hosts: ReadonlySet<string>) { const url = new URL(agriMaterialUrlSchema.parse(raw)); if (url.port || isIP(url.hostname) || url.hostname.startsWith("[") || !hosts.has(url.hostname) || url.hostname.endsWith(".") || url.protocol !== "https:")
    return evidenceFail("AGRI_EVIDENCE_SOURCE_NOT_ALLOWED", 400); return url; }
export function evidenceHttpHosts() { const values = (process.env.ANS_AGRI_EVIDENCE_HTTP_HOSTS || "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean); if (values.some(h => !/^([a-z0-9-]+\.)+[a-z]{2,63}$/.test(h) || h.includes("*")))
    return evidenceFail("AGRI_EVIDENCE_CONFIG_INVALID", 503); return new Set(values); }
/** Resolve EVERY address before opening a socket; TCP lookup is pinned, TLS verifies the original host. */
export async function pinnedEvidenceGET(raw: string, hosts: ReadonlySet<string>, signal: AbortSignal, redirects = 0): Promise<{
    response: IncomingMessage;
    finalUrl: string;
}> {
    const url = allowedEvidenceURL(raw, hosts);
    signal.throwIfAborted();
    let dnsTimer: ReturnType<typeof setTimeout> | undefined;
    let rejectAbort: () => void = () => { };
    const addresses = await Promise.race([lookup(url.hostname, { all: true, verbatim: true }), new Promise<never>((_, reject) => { dnsTimer = setTimeout(() => reject(new Error("AGRI_EVIDENCE_DNS_TIMEOUT")), 10000); rejectAbort = () => reject(signal.reason); signal.addEventListener("abort", rejectAbort, { once: true }); })]).finally(() => { clearTimeout(dnsTimer); signal.removeEventListener("abort", rejectAbort); });
    signal.throwIfAborted();
    if (!addresses.length || addresses.some(a => !publicEvidenceIP(a.address)))
        return evidenceFail("AGRI_EVIDENCE_SOURCE_NOT_ALLOWED", 400);
    const chosen = addresses[0];
    const response = await new Promise<IncomingMessage>((resolve, reject) => {
        const req = httpsRequest(url, { method: "GET", agent: false, family: chosen.family, servername: url.hostname, rejectUnauthorized: true, signal,
            headers: { "user-agent": "ANS-Agri-Evidence/1.0", "accept": "*/*", "accept-encoding": "identity" },
            lookup: ((_host: string, _options: unknown, callback: (error: Error | null, address: string, family: number) => void) => callback(null, chosen.address, chosen.family)) as import("node:net").LookupFunction }, res => { clearTimeout(headerTimer); if (res.socket.remoteAddress !== chosen.address) {
            res.destroy();
            reject(new Error("AGRI_EVIDENCE_CONNECTION_MISMATCH"));
            return;
        } res.setTimeout(15000, () => res.destroy(new Error("AGRI_EVIDENCE_IDLE_TIMEOUT"))); resolve(res); });
        const headerTimer = setTimeout(() => req.destroy(new Error("AGRI_EVIDENCE_HEADER_TIMEOUT")), 10000);
        req.once("error", e => { clearTimeout(headerTimer); reject(e); });
        req.end();
    });
    if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0)) {
        const location = response.headers.location;
        response.destroy();
        if (!location || redirects <= 0)
            return evidenceFail("AGRI_EVIDENCE_REDIRECT_REJECTED", 400);
        return pinnedEvidenceGET(new URL(location, url).href, hosts, signal, redirects - 1);
    }
    if (response.statusCode === 429 || response.statusCode === 503) {
        const raw = response.headers["retry-after"], seconds = typeof raw === "string" ? (/^\d+$/.test(raw) ? Number(raw) : Math.ceil((Date.parse(raw) - Date.now()) / 1000)) : 30;
        response.destroy();
        throw new EvidenceRetryError(Number.isFinite(seconds) ? Math.min(600, Math.max(1, seconds)) : 30);
    }
    if (response.statusCode !== 200) {
        response.destroy();
        return evidenceFail("AGRI_EVIDENCE_SOURCE_UNAVAILABLE", 502);
    }
    if (response.headers["content-encoding"] && response.headers["content-encoding"] !== "identity") {
        response.destroy();
        return evidenceFail("AGRI_EVIDENCE_ENCODING_UNSUPPORTED", 415);
    }
    return { response, finalUrl: url.href };
}
const githubHosts = new Set(["api.github.com", "codeload.github.com"]);
export function githubRepository(raw: string) { const url = allowedEvidenceURL(raw, new Set(["github.com"])); const match = /^\/([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9_.-]{1,100})\/?$/.exec(url.pathname); if (!match || match[2] === "." || match[2] === "..")
    return evidenceFail("AGRI_EVIDENCE_REPOSITORY_INVALID", 400); return { owner: match[1], repo: match[2].replace(/\.git$/, ""), url: url.href }; }
async function githubJSON(path: string, signal: AbortSignal) { const { response } = await pinnedEvidenceGET("https://api.github.com" + path, githubHosts, signal); const parts: Buffer[] = []; let size = 0; try {
    for await (const b of response) {
        size += b.length;
        if (size > 1024 ** 2)
            return evidenceFail("AGRI_EVIDENCE_SOURCE_TOO_LARGE", 413);
        parts.push(b);
    }
    const body = Buffer.concat(parts).toString("utf8");
    return { value: JSON.parse(body) as Record<string, unknown>, bodyHash: createHash("sha256").update(body).digest("hex") };
}
finally {
    response.destroy();
} }
export async function resolveGithubEvidence(raw: string, ref: z.infer<typeof agriRepositoryRefSchema>, signal: AbortSignal) {
    const repo = githubRepository(raw), prefix = `/repos/${repo.owner}/${repo.repo}`;
    const proof: Array<{
        type: string;
        sha: string;
        bodyHash: string;
    }> = [];
    let sha = ref.value.toLowerCase();
    if (ref.kind === "TAG") {
        const resolved = await githubJSON(prefix + "/git/ref/tags/" + encodeURIComponent(ref.value), signal);
        let object = resolved.value.object as {
            type?: string;
            sha?: string;
        } | undefined;
        proof.push({ type: object?.type ?? "unknown", sha: object?.sha ?? "", bodyHash: resolved.bodyHash });
        let depth = 0;
        while (object?.type === "tag" && depth++ < 3) {
            if (typeof object.sha !== "string" || !/^[a-f0-9]{40}$/i.test(object.sha))
                return evidenceFail("AGRI_EVIDENCE_REF_UNRESOLVED", 422);
            const tag = await githubJSON(prefix + "/git/tags/" + object.sha, signal);
            object = tag.value.object as typeof object;
            proof.push({ type: object?.type ?? "unknown", sha: object?.sha ?? "", bodyHash: tag.bodyHash });
        }
        if (object?.type !== "commit" || typeof object.sha !== "string")
            return evidenceFail("AGRI_EVIDENCE_REF_UNRESOLVED", 422);
        sha = object.sha.toLowerCase();
    }
    if (!/^[a-f0-9]{40}$/.test(sha))
        return evidenceFail("AGRI_EVIDENCE_REF_UNRESOLVED", 422);
    const commit = await githubJSON(prefix + "/commits/" + sha, signal);
    if (commit.value.sha !== sha)
        return evidenceFail("AGRI_EVIDENCE_REF_UNRESOLVED", 422);
    proof.push({ type: "commit", sha, bodyHash: commit.bodyHash });
    return { sha, proof, resolvedAt: new Date().toISOString(), archiveUrl: `https://codeload.github.com/${repo.owner}/${repo.repo}/tar.gz/${sha}` };
}
export function githubArchiveGET(url: string, signal: AbortSignal) { return pinnedEvidenceGET(url, new Set(["codeload.github.com"]), signal); }

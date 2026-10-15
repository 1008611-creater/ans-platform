// @vitest-environment node
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), https: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));
vi.mock("node:https", () => ({ request: mocks.https }));
import { pinnedEvidenceGET, publicEvidenceIP, resolveGithubEvidence } from "@/server/competitions/agrihackathon/evidence-network";
import { evidenceAfterCutoff } from "@/server/competitions/agrihackathon/evidence-config";
import { readSameOriginJson } from "@/server/http/json";
beforeEach(() => { vi.clearAllMocks(); mocks.lookup.mockResolvedValue([{ address: "8.8.8.8", family: 4 }]); });
function respond(status = 200, headers: Record<string, string> = {}, text = "bytes", address = "8.8.8.8") {
    const stream = Readable.from([Buffer.from(text)]) as Readable & {
        statusCode: number;
        headers: Record<string, string>;
        socket: {
            remoteAddress: string;
        };
        setTimeout: () => void;
    };
    Object.assign(stream, { statusCode: status, headers, socket: { remoteAddress: address }, setTimeout: () => { } });
    return stream;
}
function responseQueue(values: ReturnType<typeof respond>[]) { mocks.https.mockImplementation((_url, options, receive) => { const request = new EventEmitter() as EventEmitter & {
    end: () => void;
    destroy: (error: Error) => void;
}; request.end = () => { options.lookup("captured.test", {}, (e: Error | null, address: string, family: number) => { expect(e).toBeNull(); expect(address).toBe("8.8.8.8"); expect(family).toBe(4); receive(values.shift()); }); }; request.destroy = e => request.emit("error", e); return request; }); }
describe("bounded private evidence network", () => {
    it("uses the adopted inclusive or exclusive cutoff convention at the exact boundary", () => {
        const cutoff = new Date("2026-10-15T00:00:00.000Z");
        expect(evidenceAfterCutoff(new Date(cutoff.getTime()-1), cutoff, false)).toBe(false);
        expect(evidenceAfterCutoff(cutoff, cutoff, false)).toBe(true);
        expect(evidenceAfterCutoff(cutoff, cutoff, true)).toBe(false);
        expect(evidenceAfterCutoff(new Date(cutoff.getTime()+1), cutoff, true)).toBe(true);
    });
    it("pins the validated address to actual connection, retains TLS hostname, and sends no cookies or authorization", async () => { responseQueue([respond()]); const r = await pinnedEvidenceGET("https://captured.test/demo", new Set(["captured.test"]), AbortSignal.timeout(2000)); expect(r.finalUrl).toBe("https://captured.test/demo"); const options = mocks.https.mock.calls[0][1]; expect(options).toMatchObject({ agent: false, servername: "captured.test", rejectUnauthorized: true, family: 4 }); expect(options.headers).not.toHaveProperty("authorization"); expect(options.headers).not.toHaveProperty("cookie"); r.response.destroy(); });
    it("rejects one private answer among otherwise public DNS records before opening a socket", async () => { mocks.lookup.mockResolvedValue([{ address: "8.8.8.8", family: 4 }, { address: "10.0.0.2", family: 4 }]); await expect(pinnedEvidenceGET("https://captured.test/", new Set(["captured.test"]), AbortSignal.timeout(2000))).rejects.toThrow("AGRI_EVIDENCE_SOURCE_NOT_ALLOWED"); expect(mocks.https).not.toHaveBeenCalled(); });
    it("rejects unexpected connected IP and disallowed redirect without following it", async () => { responseQueue([respond(200, {}, "x", "127.0.0.1")]); await expect(pinnedEvidenceGET("https://captured.test/", new Set(["captured.test"]), AbortSignal.timeout(2000))).rejects.toThrow("CONNECTION_MISMATCH"); vi.clearAllMocks(); mocks.lookup.mockResolvedValue([{ address: "8.8.8.8", family: 4 }]); responseQueue([respond(302, { location: "https://private.test/x" })]); await expect(pinnedEvidenceGET("https://captured.test/", new Set(["captured.test"]), AbortSignal.timeout(2000), 2)).rejects.toThrow("SOURCE_NOT_ALLOWED"); expect(mocks.https).toHaveBeenCalledTimes(1); });
    it("revalidates DNS after every permitted redirect and rejects content encodings", async () => { responseQueue([respond(302, { location: "/next" }), respond(200, { "content-encoding": "gzip" })]); await expect(pinnedEvidenceGET("https://captured.test/", new Set(["captured.test"]), AbortSignal.timeout(2000), 2)).rejects.toThrow("ENCODING_UNSUPPORTED"); expect(mocks.lookup).toHaveBeenCalledTimes(2); });
    it("resolves annotated tags to a repo-validated fixed commit without executing or extracting code", async () => { const sha = "a".repeat(40); responseQueue([respond(200, {}, JSON.stringify({ object: { type: "tag", sha: "b".repeat(40) } })), respond(200, {}, JSON.stringify({ object: { type: "commit", sha } })), respond(200, {}, JSON.stringify({ sha }))]); const result = await resolveGithubEvidence("https://github.com/fixture/repo", { kind: "TAG", value: "v1" }, AbortSignal.timeout(2000)); expect(result.archiveUrl).toBe("https://codeload.github.com/fixture/repo/tar.gz/" + sha); expect(result.proof).toHaveLength(3); expect(result.proof.every(p => /^[a-f0-9]{64}$/.test(p.bodyHash))).toBe(true); });
    it.each(["0.0.0.0", "127.0.0.1", "169.254.169.254", "::ffff:192.168.1.1", "2001:db8::1", "ff02::1", "2002:7f00:1::1"])("rejects reserved address %s", ip => expect(publicEvidenceIP(ip)).toBe(false));
    it("enforces the 32KiB actual stream limit without trusting Content-Length", async () => { const request = new Request("https://fixture.test/evidence", { method: "POST", headers: { "sec-fetch-site": "same-origin", "content-type": "application/json" }, body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('"' + "x".repeat(32769) + '"')); c.close(); } }), duplex: "half" } as RequestInit); await expect(readSameOriginJson(request, 32768)).rejects.toThrow("REQUEST_TOO_LARGE"); });
});

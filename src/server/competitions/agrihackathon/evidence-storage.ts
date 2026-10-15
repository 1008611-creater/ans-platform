import { constants } from "node:fs";
import { mkdir, lstat, realpath, open, link, unlink, statfs, readFile, readdir } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { S3Client, GetObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, GetBucketAclCommand, GetBucketPolicyStatusCommand, GetPublicAccessBlockCommand, GetBucketVersioningCommand, ListMultipartUploadsCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { evidenceConfig, evidenceFail } from "./evidence-config";
export interface StoredEvidence {
    key: string;
    backend: "local_private" | "s3_private";
    namespaceVersion: 1;
    sha256: string;
    byteLength: number;
    mime: string;
}
function validKey(key: string) { if (!/^agri-evidence\/v1\/[A-Za-z0-9_-]{1,80}\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.bin$/.test(key))
    return evidenceFail("AGRI_EVIDENCE_KEY_INVALID", 400); return key; }
export function evidenceObjectKey(edition: string, request: string, object: string) { return validKey(`agri-evidence/v1/${edition}/${request}/${object}.bin`); }
function s3() { return new S3Client({ region: process.env.ANS_AGRI_EVIDENCE_S3_REGION || "auto", endpoint: process.env.ANS_AGRI_EVIDENCE_S3_ENDPOINT, forcePathStyle: !!process.env.ANS_AGRI_EVIDENCE_S3_ENDPOINT, credentials: { accessKeyId: process.env.ANS_AGRI_EVIDENCE_S3_ACCESS_KEY_ID!, secretAccessKey: process.env.ANS_AGRI_EVIDENCE_S3_SECRET_ACCESS_KEY! } }); }
const bucket = () => process.env.ANS_AGRI_EVIDENCE_S3_BUCKET!;
async function localRoot() { const c = evidenceConfig(); if (!c.directory)
    return evidenceFail("AGRI_EVIDENCE_STORAGE_NOT_CONFIGURED", 503); const st = await lstat(c.directory).catch(() => null); if (!st?.isDirectory() || st.isSymbolicLink() || await realpath(c.directory) !== c.directory)
    return evidenceFail("AGRI_EVIDENCE_STORAGE_NOT_CONFIGURED", 503); if (process.platform === "linux") {
    if ((st.mode & 0o077) !== 0 || st.uid !== process.getuid?.())
        return evidenceFail("AGRI_EVIDENCE_STORAGE_UNSAFE", 503);
    const mounts = (await readFile("/proc/self/mountinfo", "utf8")).trim().split("\n").map(line => { const [before, after] = line.split(" - "); return { point: before.split(" ")[4].replace(/\\040/g, " ").replace(/\\134/g, "\\"), type: after?.split(" ")[0] }; }).filter(m => c.directory === m.point || c.directory!.startsWith(m.point + sep)).sort((a, b) => b.point.length - a.point.length);
    const actual = mounts[0];
    if (!actual || actual.point === "/" || ["overlay", "tmpfs", "ramfs"].includes(actual.type))
        return evidenceFail("AGRI_EVIDENCE_STORAGE_NOT_DURABLE", 503);
} return c.directory; }
async function localPath(key: string, make = false) { const root = await localRoot(); const target = resolve(root, validKey(key)); if (!target.startsWith(root + sep))
    return evidenceFail("AGRI_EVIDENCE_KEY_INVALID", 400); let current = root; for (const part of key.split("/").slice(0, -1)) {
    current = resolve(current, part);
    if (make)
        await mkdir(current, { mode: 0o700 }).catch(e => { if (e.code !== "EEXIST")
            throw e; });
    const st = await lstat(current);
    if (st.isSymbolicLink() || !st.isDirectory())
        return evidenceFail("AGRI_EVIDENCE_STORAGE_UNSAFE", 503);
} return target; }
export async function evidenceCapacity(reserved: number) { const c = evidenceConfig(); if (reserved > c.quota)
    return evidenceFail("AGRI_EVIDENCE_STORAGE_CAPACITY_REQUIRED", 503); if (c.mode === "local_private") {
    const root = await localRoot(), fs = await statfs(root, { bigint: true });
    const free = Number(fs.bavail * fs.bsize), total = Number(fs.blocks * fs.bsize);
    if (free - reserved < c.minFree || (total - free + reserved) / total >= c.maxUsedRatio)
        return evidenceFail("AGRI_EVIDENCE_STORAGE_CAPACITY_REQUIRED", 503);
}
else {
    const client = s3(), signal = AbortSignal.timeout(10000);
    try {
        const [acl, policy, block, versioning] = await Promise.all([client.send(new GetBucketAclCommand({ Bucket: bucket() }), { abortSignal: signal }), client.send(new GetBucketPolicyStatusCommand({ Bucket: bucket() }), { abortSignal: signal }), client.send(new GetPublicAccessBlockCommand({ Bucket: bucket() }), { abortSignal: signal }), client.send(new GetBucketVersioningCommand({ Bucket: bucket() }), { abortSignal: signal })]);
        if (versioning.Status)
            return evidenceFail("AGRI_EVIDENCE_VERSIONED_BUCKET_UNSUPPORTED", 503);
        if (acl.Grants?.some(g => g.Grantee?.URI?.includes("AllUsers") || g.Grantee?.URI?.includes("AuthenticatedUsers")) || policy.PolicyStatus?.IsPublic !== false || !block.PublicAccessBlockConfiguration?.BlockPublicAcls || !block.PublicAccessBlockConfiguration?.BlockPublicPolicy || !block.PublicAccessBlockConfiguration?.IgnorePublicAcls || !block.PublicAccessBlockConfiguration?.RestrictPublicBuckets)
            return evidenceFail("AGRI_EVIDENCE_STORAGE_NOT_PRIVATE", 503);
    }
    catch (e) {
        if (e instanceof Error && e.message.startsWith("AGRI_"))
            throw e;
        return evidenceFail("AGRI_EVIDENCE_STORAGE_PRIVACY_UNVERIFIED", 503);
    }
    finally {
        client.destroy();
    }
} }
function detectedMime(prefix: Buffer, expected: string) {
    if (expected === "DEMO_VIDEO") {
        if (prefix.length >= 12 && prefix.subarray(4, 8).toString() === "ftyp")
            return "video/mp4";
        if (prefix.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])))
            return "video/webm";
        return evidenceFail("AGRI_EVIDENCE_MEDIA_INVALID", 415);
    }
    if (expected === "REPOSITORY") {
        if (prefix[0] === 0x1f && prefix[1] === 0x8b)
            return "application/gzip";
        if (prefix.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 3, 4])))
            return "application/zip";
        return evidenceFail("AGRI_EVIDENCE_MEDIA_INVALID", 415);
    }
    return expected === "DEMO_DOCUMENT" ? "application/octet-stream" : "application/octet-stream";
}
/** Stream raw bytes, hold at most one 5 MiB S3 part. Original contents are never decoded/reencoded. */
export async function storeEvidence(key: string, source: AsyncIterable<Uint8Array>, limit: number, kind: string, signal: AbortSignal, check: (progress: number) => Promise<void>): Promise<StoredEvidence> {
    validKey(key);
    const c = evidenceConfig(), hash = createHash("sha256");
    let length = 0, prefix = Buffer.alloc(0), checked = 0;
    const client = c.mode === "s3_private" ? s3() : null;
    let uploadId: string | undefined, temporary: string | undefined;
    let file: Awaited<ReturnType<typeof open>> | undefined;
    let succeeded = false;
    const parts: Array<{
        ETag: string;
        PartNumber: number;
    }> = [];
    let pending = Buffer.alloc(0);
    try {
        if (client) {
            uploadId = (await client.send(new CreateMultipartUploadCommand({ Bucket: bucket(), Key: key, ContentType: "application/octet-stream" }), { abortSignal: signal })).UploadId;
            if (!uploadId)
                return evidenceFail("AGRI_EVIDENCE_STORAGE_FAILED", 503);
        }
        else {
            const target = await localPath(key, true);
            temporary = target + "." + randomUUID() + ".part";
            file = await open(temporary, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
        }
        for await (const value of source) {
            signal.throwIfAborted();
            const b = Buffer.from(value);
            length += b.length;
            if (length > limit)
                return evidenceFail("AGRI_EVIDENCE_TOO_LARGE", 413);
            if (prefix.length < 512)
                prefix = Buffer.concat([prefix, b.subarray(0, 512 - prefix.length)]);
            hash.update(b);
            if (file) {
                let written = 0;
                while (written < b.length) {
                    const part = await file.write(b, written, b.length - written);
                    if (!part.bytesWritten)
                        return evidenceFail("AGRI_EVIDENCE_STORAGE_FAILED", 503);
                    written += part.bytesWritten;
                }
            }
            else {
                let offset = 0;
                while (offset < b.length) {
                    const take = Math.min(5 * 1024 ** 2 - pending.length, b.length - offset);
                    pending = Buffer.concat([pending, b.subarray(offset, offset + take)]);
                    offset += take;
                    if (pending.length === 5 * 1024 ** 2) {
                        const pn = parts.length + 1;
                        const r = await client!.send(new UploadPartCommand({ Bucket: bucket(), Key: key, UploadId: uploadId, PartNumber: pn, Body: pending }), { abortSignal: signal });
                        if (!r.ETag)
                            return evidenceFail("AGRI_EVIDENCE_STORAGE_FAILED", 503);
                        parts.push({ ETag: r.ETag, PartNumber: pn });
                        pending = Buffer.alloc(0);
                    }
                }
            }
            if (length - checked >= 65536) {
                await check(length);
                checked = length;
            }
        }
        if (!length)
            return evidenceFail("AGRI_EVIDENCE_EMPTY", 400);
        const mime = detectedMime(prefix, kind);
        await check(length);
        if (file) {
            await file.sync();
            await file.close();
            file = undefined;
            await link(temporary!, await localPath(key));
            await unlink(temporary!);
            temporary = undefined;
            if (process.platform !== "win32") {
                const directory = await open(dirname(await localPath(key)), constants.O_RDONLY);
                try {
                    await directory.sync();
                }
                finally {
                    await directory.close();
                }
            }
        }
        else {
            if (pending.length) {
                const pn = parts.length + 1, r = await client!.send(new UploadPartCommand({ Bucket: bucket(), Key: key, UploadId: uploadId, PartNumber: pn, Body: pending }), { abortSignal: signal });
                if (!r.ETag)
                    return evidenceFail("AGRI_EVIDENCE_STORAGE_FAILED", 503);
                parts.push({ ETag: r.ETag, PartNumber: pn });
            }
            await client!.send(new CompleteMultipartUploadCommand({ Bucket: bucket(), Key: key, UploadId: uploadId, MultipartUpload: { Parts: parts }, IfNoneMatch: "*" }), { abortSignal: signal });
        }
        const result: StoredEvidence = { key, backend: c.mode, namespaceVersion: 1, sha256: hash.digest("hex"), byteLength: length, mime };
        const verified = await inspectEvidence(result, limit, kind, signal);
        if (verified.sha256 !== result.sha256 || verified.byteLength !== length)
            return evidenceFail("AGRI_EVIDENCE_INTEGRITY_FAILED", 500);
        succeeded = true;
        return result;
    }
    finally {
        await file?.close();
        if (temporary)
            await unlink(temporary).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
        if (client && uploadId && !succeeded)
            await client.send(new AbortMultipartUploadCommand({ Bucket: bucket(), Key: key, UploadId: uploadId }), { abortSignal: AbortSignal.timeout(10000) }).catch((error: { name?: string }) => { if (error.name !== "NoSuchUpload") throw error; });
        client?.destroy();
    }
}
export async function readEvidence(meta: Pick<StoredEvidence, "key" | "backend" | "namespaceVersion">, signal: AbortSignal): Promise<Readable> {
    if (meta.namespaceVersion !== 1)
        return evidenceFail("AGRI_EVIDENCE_STORAGE_VERSION_UNKNOWN", 503);
    validKey(meta.key);
    // Existing objects retain their backend even if the write backend changes.
    if (meta.backend === "local_private") {
        const path = await localPath(meta.key), handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
        if (!(await handle.stat()).isFile()) {
            await handle.close();
            return evidenceFail("AGRI_EVIDENCE_STORAGE_UNSAFE", 503);
        }
        return handle.createReadStream({ autoClose: true, signal });
    }
    const client = s3();
    try {
        const r = await client.send(new GetObjectCommand({ Bucket: bucket(), Key: meta.key }), { abortSignal: signal });
        if (!r.Body)
            return evidenceFail("AGRI_EVIDENCE_STORAGE_FAILED", 503);
        const stream = r.Body as Readable;
        stream.once("close", () => client.destroy());
        return stream;
    }
    catch (e) {
        client.destroy();
        throw e;
    }
}
export async function inspectEvidence(meta: Pick<StoredEvidence, "key" | "backend" | "namespaceVersion">, limit: number, kind: string, signal: AbortSignal) { const stream = await readEvidence(meta, signal), hash = createHash("sha256"); let length = 0, prefix = Buffer.alloc(0); try {
    for await (const b of stream) {
        length += b.length;
        if (length > limit)
            return evidenceFail("AGRI_EVIDENCE_TOO_LARGE", 413);
        hash.update(b);
        if (prefix.length < 512)
            prefix = Buffer.concat([prefix, b.subarray(0, 512 - prefix.length)]);
    }
    if (!length)
        return evidenceFail("AGRI_EVIDENCE_EMPTY", 400);
    return { ...meta, sha256: hash.digest("hex"), byteLength: length, mime: detectedMime(prefix, kind) };
}
finally {
    stream.destroy();
} }
/** Maintenance only: exact terminal request namespace, never stored immutable objects or an entire bucket. */
export async function disposeUnboundEvidence(meta: Pick<StoredEvidence, "key" | "backend" | "namespaceVersion">, includeFinal = true) {
    validKey(meta.key);
    if (meta.namespaceVersion !== 1)
        return evidenceFail("AGRI_EVIDENCE_STORAGE_VERSION_UNKNOWN", 503);
    if (meta.backend === "local_private") {
        let path: string;
        try {
            path = await localPath(meta.key);
        }
        catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT")
                return;
            throw error;
        }
        const parent = dirname(path), base = path.slice(parent.length + 1);
        const files = await readdir(parent);
        for (const name of files) {
            if ((!includeFinal || name !== base) && !(name.startsWith(base + ".") && /\.[a-f0-9-]{36}\.part$/.test(name)))
                continue;
            const target = resolve(parent, name), st = await lstat(target);
            if (!st.isFile() || st.isSymbolicLink())
                return evidenceFail("AGRI_EVIDENCE_STORAGE_UNSAFE", 503);
            await unlink(target);
        }
        return;
    }
    const client = s3(), signal = AbortSignal.timeout(20000);
    try {
        const version = await client.send(new GetBucketVersioningCommand({ Bucket: bucket() }), { abortSignal: signal });
        if (version.Status)
            return evidenceFail("AGRI_EVIDENCE_VERSIONED_CLEANUP_REQUIRED", 503);
        const prefix = meta.key.slice(0, meta.key.lastIndexOf("/") + 1);
        let keyMarker: string | undefined, uploadMarker: string | undefined;
        do {
            const page = await client.send(new ListMultipartUploadsCommand({ Bucket: bucket(), Prefix: prefix, KeyMarker: keyMarker, UploadIdMarker: uploadMarker }), { abortSignal: signal });
            for (const item of page.Uploads ?? [])
                if (item.Key === meta.key && item.UploadId)
                    await client.send(new AbortMultipartUploadCommand({ Bucket: bucket(), Key: meta.key, UploadId: item.UploadId }), { abortSignal: signal });
            keyMarker = page.IsTruncated ? page.NextKeyMarker : undefined;
            uploadMarker = page.IsTruncated ? page.NextUploadIdMarker : undefined;
        } while (keyMarker);
        if (includeFinal)
            await client.send(new DeleteObjectCommand({ Bucket: bucket(), Key: meta.key }), { abortSignal: signal });
    }
    finally {
        client.destroy();
    }
}

/** Caller holds the request lease/fence and global capacity lock. Never remove a published final object. */
export async function reconcileEvidenceStorage(meta: Pick<StoredEvidence, "key" | "backend" | "namespaceVersion">, limit: number, kind: string) {
    await disposeUnboundEvidence(meta, false);
    try { return await inspectEvidence(meta, limit, kind, AbortSignal.timeout(20000)); }
    catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
        if (code === "ENOENT" || status === 404) return null;
        throw error;
    }
}

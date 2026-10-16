import { gunzipSync, inflateRawSync } from "node:zlib";
import type { EvidenceArchiveEntry, EvidenceArchiveInspection } from "@/contracts/agri-evidence";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { authorizedEvidenceDownload } from "./evidence";
import { readEvidence } from "./evidence-storage";

export type { EvidenceArchiveEntry, EvidenceArchiveInspection };

const MAX_ARCHIVE_READ_BYTES = 64 * 1024 * 1024;
const MAX_DECOMPRESSED_TAR_BYTES = 96 * 1024 * 1024;
const MAX_FILE_PREVIEW_BYTES = 128 * 1024;
const MAX_ENTRIES = 500;

const TEXT_EXTENSIONS = new Set([
  "md", "txt", "json", "yaml", "yml", "toml", "xml", "csv", "ini", "conf", "env", "sh", "bash", "zsh", "ps1", "bat",
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "ipynb", "java", "kt", "go", "rs", "c", "cpp", "h", "hpp", "cs",
  "php", "rb", "swift", "scala", "r", "sql", "graphql", "prisma", "proto", "html", "htm", "css", "scss", "less",
  "vue", "svelte", "astro", "dockerfile", "makefile", "gitignore", "gitattributes", "editorconfig", "license",
]);

function looksLikeTextPath(filePath: string): boolean {
  const base = filePath.split("/").pop()?.toLowerCase() ?? "";
  if (["readme", "license", "dockerfile", "makefile", ".gitignore", ".env.example"].includes(base)) return true;
  const dot = base.lastIndexOf(".");
  if (dot < 0) return false;
  return TEXT_EXTENSIONS.has(base.slice(dot + 1));
}

function isLikelyUtf8Text(buf: Buffer): boolean {
  const sample = buf.subarray(0, Math.min(buf.length, 4096));
  if (sample.includes(0)) return false;
  return true;
}

function normalizeArchivePath(raw: string): string {
  return raw
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .split("/")
    .filter(part => part && part !== "." && part !== "..")
    .join("/");
}

function stripCommonRoot(paths: string[]): (p: string) => string {
  if (!paths.length) return p => p;
  const firstSlash = paths[0].indexOf("/");
  if (firstSlash <= 0) return p => p;
  const prefix = paths[0].slice(0, firstSlash + 1);
  if (paths.every(p => p.startsWith(prefix) && p.length > prefix.length)) {
    return p => p.slice(prefix.length);
  }
  return p => p;
}

function parseTarSize(field: Buffer): number {
  if ((field[0] & 0x80) !== 0) {
    let val = 0;
    for (let i = 1; i < field.length; i++) val = val * 256 + field[i];
    return val;
  }
  const str = field.toString("ascii").replace(/\0.*$/, "").trim();
  return str ? parseInt(str, 8) || 0 : 0;
}

interface ParsedFile {
  path: string;
  size: number;
  read: () => Buffer;
}

function parseTarBuffer(tar: Buffer): ParsedFile[] {
  const rawFiles: Array<{ rawPath: string; size: number; dataStart: number }> = [];
  let offset = 0;
  let paxPath: string | null = null;
  let gnuLongName: string | null = null;

  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every(b => b === 0)) break;

    const size = parseTarSize(header.subarray(124, 136));
    const typeFlag = header[156];
    const dataStart = offset + 512;
    const blocks = Math.ceil(size / 512);
    const nextOffset = dataStart + blocks * 512;
    if (size < 0 || nextOffset > tar.length) break;

    if (typeFlag === 0x78 /* 'x' PAX header */) {
      const paxText = tar.subarray(dataStart, dataStart + size).toString("utf8");
      for (const line of paxText.split("\n")) {
        const m = /^\d+\s+path=(.+)$/.exec(line);
        if (m) paxPath = m[1];
      }
    } else if (typeFlag === 0x4c /* 'L' GNU LongLink */) {
      gnuLongName = tar.subarray(dataStart, dataStart + size).toString("utf8").replace(/\0+$/, "");
    } else if (typeFlag === 0 || typeFlag === 0x30 /* '0' regular file */) {
      const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
      const prefix = header.subarray(345, 500).toString("utf8").replace(/\0.*$/, "");
      const fullPath = paxPath ?? gnuLongName ?? (prefix ? `${prefix}/${name}` : name);
      paxPath = null;
      gnuLongName = null;
      const norm = normalizeArchivePath(fullPath);
      if (norm && !norm.endsWith("/")) {
        rawFiles.push({ rawPath: norm, size, dataStart });
      }
    } else {
      paxPath = null;
      gnuLongName = null;
    }

    offset = nextOffset;
  }

  const strip = stripCommonRoot(rawFiles.map(f => f.rawPath));
  return rawFiles.map(f => ({
    path: strip(f.rawPath) || f.rawPath,
    size: f.size,
    read: () => tar.subarray(f.dataStart, f.dataStart + Math.min(f.size, MAX_FILE_PREVIEW_BYTES * 2)),
  }));
}

function parseZipBuffer(zip: Buffer): ParsedFile[] {
  const minEocdSize = 22;
  if (zip.length < minEocdSize) return [];
  const searchStart = Math.max(0, zip.length - 65557);
  let eocdOffset = -1;
  for (let i = zip.length - minEocdSize; i >= searchStart; i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) return [];

  const totalEntries = zip.readUInt16LE(eocdOffset + 10);
  const cdSize = zip.readUInt32LE(eocdOffset + 12);
  const cdOffset = zip.readUInt32LE(eocdOffset + 16);
  if (cdOffset + cdSize > zip.length) return [];

  const rawFiles: Array<{
    rawPath: string;
    size: number;
    compressedSize: number;
    method: number;
    localHeaderOffset: number;
  }> = [];

  let ptr = cdOffset;
  for (let i = 0; i < totalEntries && ptr + 46 <= cdOffset + cdSize; i++) {
    if (zip.readUInt32LE(ptr) !== 0x02014b50) break;
    const method = zip.readUInt16LE(ptr + 10);
    const compressedSize = zip.readUInt32LE(ptr + 20);
    const uncompressedSize = zip.readUInt32LE(ptr + 24);
    const nameLen = zip.readUInt16LE(ptr + 28);
    const extraLen = zip.readUInt16LE(ptr + 30);
    const commentLen = zip.readUInt16LE(ptr + 32);
    const localHeaderOffset = zip.readUInt32LE(ptr + 42);
    const nameEnd = ptr + 46 + nameLen;
    if (nameEnd > zip.length) break;

    const rawName = zip.subarray(ptr + 46, nameEnd).toString("utf8");
    ptr = nameEnd + extraLen + commentLen;

    if (rawName.endsWith("/")) continue;
    const norm = normalizeArchivePath(rawName);
    if (!norm) continue;
    rawFiles.push({
      rawPath: norm,
      size: uncompressedSize,
      compressedSize,
      method,
      localHeaderOffset,
    });
  }

  const strip = stripCommonRoot(rawFiles.map(f => f.rawPath));
  return rawFiles.map(f => ({
    path: strip(f.rawPath) || f.rawPath,
    size: f.size,
    read: () => {
      if (f.localHeaderOffset + 30 > zip.length) return Buffer.alloc(0);
      if (zip.readUInt32LE(f.localHeaderOffset) !== 0x04034b50) return Buffer.alloc(0);
      const localNameLen = zip.readUInt16LE(f.localHeaderOffset + 26);
      const localExtraLen = zip.readUInt16LE(f.localHeaderOffset + 28);
      const dataStart = f.localHeaderOffset + 30 + localNameLen + localExtraLen;
      const dataEnd = dataStart + f.compressedSize;
      if (dataEnd > zip.length || f.size > 16 * 1024 * 1024) return Buffer.alloc(0);
      const slice = zip.subarray(dataStart, dataEnd);
      if (f.method === 0) return slice;
      if (f.method === 8) {
        return inflateRawSync(slice, { maxOutputLength: 16 * 1024 * 1024 });
      }
      return Buffer.alloc(0);
    },
  }));
}

async function readStreamToBuffer(stream: NodeJS.ReadableStream, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > maxBytes) {
      throw new AgriWorkspaceError("AGRI_EVIDENCE_TOO_LARGE", 413);
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks, total);
}

export async function inspectEvidenceObject(
  actorId: string,
  objectId: string,
  requestedPath?: string | null,
): Promise<EvidenceArchiveInspection> {
  const source = await authorizedEvidenceDownload(actorId, objectId, false);
  const stream = await readEvidence(source, AbortSignal.timeout(30000));
  let raw: Buffer;
  try {
    raw = await readStreamToBuffer(stream, MAX_ARCHIVE_READ_BYTES);
  } finally {
    stream.destroy();
  }

  let format: EvidenceArchiveInspection["format"] = "binary";
  let parsedFiles: ParsedFile[] = [];

  const isGzip = raw.length >= 2 && raw[0] === 0x1f && raw[1] === 0x8b;
  const isZip = raw.length >= 4 && raw.readUInt32LE(0) === 0x04034b50;

  if (isGzip) {
    try {
      const tar = gunzipSync(raw, { maxOutputLength: MAX_DECOMPRESSED_TAR_BYTES });
      parsedFiles = parseTarBuffer(tar);
      format = "tar.gz";
    } catch {
      format = "binary";
    }
  } else if (isZip) {
    try {
      parsedFiles = parseZipBuffer(raw);
      format = "zip";
    } catch {
      format = "binary";
    }
  } else if (isLikelyUtf8Text(raw)) {
    format = "text";
    parsedFiles = [{
      path: source.descriptor.fileName,
      size: raw.length,
      read: () => raw,
    }];
  }

  const entries: EvidenceArchiveEntry[] = parsedFiles.slice(0, MAX_ENTRIES).map(f => ({
    path: f.path,
    size: f.size,
    isText: looksLikeTextPath(f.path),
  }));

  let targetFile: ParsedFile | undefined;
  if (requestedPath) {
    targetFile = parsedFiles.find(f => f.path === requestedPath);
  }
  if (!targetFile && parsedFiles.length > 0) {
    targetFile =
      parsedFiles.find(f => /^readme(\.[a-z0-9]+)?$/i.test(f.path.split("/").pop() ?? "")) ??
      parsedFiles.find(f => looksLikeTextPath(f.path) && f.size > 0 && f.size <= MAX_FILE_PREVIEW_BYTES) ??
      parsedFiles[0];
  }

  let selectedFile: EvidenceArchiveInspection["selectedFile"] = null;
  if (targetFile) {
    try {
      const bytes = targetFile.read();
      const textOk = isLikelyUtf8Text(bytes);
      const truncated = bytes.length > MAX_FILE_PREVIEW_BYTES || targetFile.size > MAX_FILE_PREVIEW_BYTES;
      selectedFile = {
        path: targetFile.path,
        size: targetFile.size,
        content: textOk ? bytes.subarray(0, MAX_FILE_PREVIEW_BYTES).toString("utf8") : "",
        truncated,
        isText: textOk,
      };
    } catch {
      selectedFile = {
        path: targetFile.path,
        size: targetFile.size,
        content: "",
        truncated: false,
        isText: false,
      };
    }
  }

  return {
    objectId: source.descriptor.id,
    fileName: source.descriptor.fileName,
    sha256: source.descriptor.sha256,
    byteLength: source.descriptor.byteLength,
    format,
    totalFiles: parsedFiles.length,
    entries,
    selectedFile,
  };
}

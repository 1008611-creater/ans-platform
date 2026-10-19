import localforage from "localforage";

import i18n from "@/i18n";
import { getMediaBlob, resolveMediaUrl, setMediaBlob } from "@/services/file-storage";
import { getImageBlob, resolveImageUrl, setImageBlob } from "@/services/image-storage";
import { downloadWebdavFile, uploadWebdavFile, WEBDAV_MANIFEST_FILE_NAME } from "@/services/webdav-sync";
import { WEBDAV_CHUNK_THRESHOLD_BYTES, WEBDAV_PARALLEL_SMALL_FILES } from "@/services/webdav-transfer-plan";
import type { Asset } from "@/stores/use-asset-store";
import { useAssetStore } from "@/stores/use-asset-store";
import type { WebdavSyncConfig } from "@/stores/use-config-store";
import type { CanvasDeletedProject, CanvasProject } from "@/stores/canvas/use-canvas-store";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";

type StoredLog = Record<string, unknown> & { id?: string };
export type AppSyncDomainKey = "canvas" | "assets" | "image-workbench" | "video-workbench";
type DomainKey = AppSyncDomainKey;
type CanvasDomainData = { projects: CanvasProject[]; deleted: CanvasDeletedProject[] };
type AssetDomainData = { assets: Asset[] };
type LogDomainData = { logs: StoredLog[] };

type AppSyncFile = {
    storageKey: string;
    path: string;
    mimeType: string;
    bytes: number;
};

type DomainManifest<T> = {
    app: "infinite-canvas";
    version: 1;
    domain: DomainKey;
    exportedAt: string;
    data: T;
    files: AppSyncFile[];
};

type SyncDomainOptions<T> = {
    key: DomainKey;
    label: string;
    localData: () => Promise<T>;
    emptyData: T;
    mergeData: (local: T, remote: T) => T;
    applyData?: (data: T) => Promise<void>;
};

type SyncDomainResult<T> = {
    data: T;
    mergedRemote: boolean;
    files: number;
    manifestBytes: number;
    uploadedFiles: number;
    uploadedBytes: number;
    failedFiles: string[];
};

export type AppSyncResult = {
    syncedAt: string;
    mergedRemote: boolean;
    projects: number;
    assets: number;
    imageLogs: number;
    videoLogs: number;
    files: number;
    manifestBytes: number;
    uploadedFiles: number;
    uploadedBytes: number;
    /** 上传失败的 storageKey：整轮同步不会因为个别文件中断，但必须如实报给用户 */
    failedFiles: string[];
};

export type AppSyncProgressEvent = {
    domain?: AppSyncDomainKey;
    label?: string;
    stage: string;
    current?: number;
    total?: number;
    status?: "active" | "success" | "exception";
};

export type AppSyncProgress = (event: AppSyncProgressEvent) => void;

export type SyncUploadOptions = {
    onRetry?: (info: { attempt: number }) => void;
    onProgress?: (info: { offset: number; total: number }) => void;
    /**
     * 本地媒体标记（image:xxx / video:xxx）。服务端通道拿它把媒体登记进 media_files 表，
     * 顺带记下原始出处 —— 外链哪天失效也查得到是谁、从哪来。文件柜通道用不上就忽略。
     */
    storageKey?: string;
};

/**
 * 同步的传输层。
 *
 * 把它抽出来是因为：合并逻辑（取并集、补缺失媒体、回写 manifest）与「东西存在哪」无关，
 * 只有读写两个动作跟后端有关。之前只接了 WebDAV，现在多一条服务端 API 的通道，
 * 只要凑齐这两个函数就能复用上面全部逻辑，不必重写一遍同步。
 */
export type SyncTransport = {
    readFile: (path: string, storageKey?: string) => Promise<Blob | null>;
    writeFile: (path: string, blob: Blob, mimeType: string, options?: SyncUploadOptions) => Promise<unknown>;
};

const FILE_CONCURRENCY = WEBDAV_PARALLEL_SMALL_FILES;
/** 超过这个体积就当「大文件」处理：单独串行、走分片。 */
const UPLOAD_LARGE_FILE_BYTES = WEBDAV_CHUNK_THRESHOLD_BYTES;
const stageText = (key: string, options?: Record<string, unknown>) => i18n.t(`config.webdav.stages.${key}`, options);
const imageLogStore = localforage.createInstance({ name: "infinite-canvas", storeName: "image_generation_logs" });
const videoLogStore = localforage.createInstance({ name: "infinite-canvas", storeName: "video_generation_logs" });
type LogStore = typeof imageLogStore;
const storageKeyPattern = /^(image|video|audio|file|video-reference|audio-reference):/;

/** WebDAV 通道：公网部署时按配置直连 /dav/ */
export function createWebdavTransport(config: WebdavSyncConfig): SyncTransport {
    return {
        readFile: (path) => downloadWebdavFile(config, path),
        writeFile: (path, blob, mimeType, options) => uploadWebdavFile(config, path, blob, mimeType, options),
    };
}

export async function syncAppData(transport: SyncTransport, onProgress?: AppSyncProgress): Promise<AppSyncResult> {
    emitProgress(onProgress, { stage: "等待本地数据加载" });
    await Promise.all([waitForHydration(useCanvasStore), waitForHydration(useAssetStore)]);

    const [canvas, assets, imageLogs, videoLogs] = await Promise.all([
        syncDomain<CanvasDomainData>(transport, onProgress, {
            key: "canvas",
            label: "画布",
            emptyData: { projects: [], deleted: [] },
            localData: async () => {
                const { projects, deletedProjects } = useCanvasStore.getState();
                return { projects, deleted: deletedProjects };
            },
            mergeData: mergeCanvasData,
            applyData: async (data) => useCanvasStore.getState().replaceProjects(data.projects, data.deleted),
        }),
        syncDomain<AssetDomainData>(transport, onProgress, {
            key: "assets",
            label: "我的资产",
            emptyData: { assets: [] },
            localData: async () => ({ assets: useAssetStore.getState().assets }),
            mergeData: (local, remote) => ({ assets: mergeById(local.assets, remote.assets, "updatedAt") }),
            applyData: async (data) => useAssetStore.getState().replaceAssets(await Promise.all(data.assets.map(hydrateAsset))),
        }),
        syncDomain<LogDomainData>(transport, onProgress, {
            key: "image-workbench",
            label: "生图工作台",
            emptyData: { logs: [] },
            localData: async () => ({ logs: await readStoredLogs(imageLogStore) }),
            mergeData: (local, remote) => ({ logs: mergeById(local.logs, remote.logs, "createdAt") }),
            applyData: async (data) => replaceStoredLogs(imageLogStore, data.logs),
        }),
        syncDomain<LogDomainData>(transport, onProgress, {
            key: "video-workbench",
            label: i18n.t("config.webdav.domains.videoWorkbench"),
            emptyData: { logs: [] },
            localData: async () => ({ logs: await readStoredLogs(videoLogStore) }),
            mergeData: (local, remote) => ({ logs: mergeById(local.logs, remote.logs, "createdAt") }),
            applyData: async (data) => replaceStoredLogs(videoLogStore, data.logs),
        }),
    ]);

    const result = {
        syncedAt: new Date().toISOString(),
        mergedRemote: [canvas, assets, imageLogs, videoLogs].some((item) => item.mergedRemote),
        projects: canvas.data.projects.length,
        assets: assets.data.assets.length,
        imageLogs: imageLogs.data.logs.length,
        videoLogs: videoLogs.data.logs.length,
        files: canvas.files + assets.files + imageLogs.files + videoLogs.files,
        manifestBytes: canvas.manifestBytes + assets.manifestBytes + imageLogs.manifestBytes + videoLogs.manifestBytes,
        uploadedFiles: canvas.uploadedFiles + assets.uploadedFiles + imageLogs.uploadedFiles + videoLogs.uploadedFiles,
        uploadedBytes: canvas.uploadedBytes + assets.uploadedBytes + imageLogs.uploadedBytes + videoLogs.uploadedBytes,
        failedFiles: [...canvas.failedFiles, ...assets.failedFiles, ...imageLogs.failedFiles, ...videoLogs.failedFiles],
    };
    emitProgress(onProgress, { stage: stageText("syncComplete"), status: "success" });
    return result;
}

async function syncDomain<T>(transport: SyncTransport, onProgress: AppSyncProgress | undefined, options: SyncDomainOptions<T>): Promise<SyncDomainResult<T>> {
    try {
        emitProgress(onProgress, { domain: options.key, label: options.label, stage: stageText("remoteManifest"), status: "active" });
        const remoteManifest = await readDomainManifest(transport, options.key, options.emptyData);
        emitProgress(onProgress, { domain: options.key, label: options.label, stage: stageText("localData"), status: "active" });
        const localData = await options.localData();
        const mergedData = remoteManifest ? options.mergeData(localData, remoteManifest.data) : localData;

        if (remoteManifest) {
            emitProgress(onProgress, { domain: options.key, label: options.label, stage: stageText("downloadMedia"), status: "active" });
            await downloadMissingFiles(transport, options.key, mergedData, remoteManifest.files, onProgress);
            emitProgress(onProgress, { domain: options.key, label: options.label, stage: stageText("writeMerge"), status: "active" });
            await options.applyData?.(mergedData);
        }

        emitProgress(onProgress, { domain: options.key, label: options.label, stage: stageText("uploadMedia"), status: "active" });
        const uploaded = await uploadChangedFiles(transport, options.key, mergedData, remoteManifest?.files || [], onProgress);
        const manifest: DomainManifest<T> = { app: "infinite-canvas", version: 1, domain: options.key, exportedAt: new Date().toISOString(), data: mergedData, files: uploaded.files };
        const manifestFile = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
        emitProgress(onProgress, { domain: options.key, label: options.label, stage: stageText("uploadManifest", { size: formatBytes(manifestFile.size) }), status: "active" });
        await transport.writeFile(domainPath(options.key, WEBDAV_MANIFEST_FILE_NAME), manifestFile, "application/json");
        emitProgress(onProgress, { domain: options.key, label: options.label, stage: stageText("complete"), current: 1, total: 1, status: "success" });

        return {
            data: mergedData,
            mergedRemote: Boolean(remoteManifest),
            files: uploaded.files.length,
            manifestBytes: manifestFile.size,
            uploadedFiles: uploaded.uploadedFiles,
            uploadedBytes: uploaded.uploadedBytes,
            failedFiles: uploaded.failedFiles,
        };
    } catch (error) {
        emitProgress(onProgress, { domain: options.key, label: options.label, stage: error instanceof Error ? error.message : i18n.t("config.webdav.errors.syncFailed"), status: "exception" });
        throw error;
    }
}

async function readDomainManifest<T>(transport: SyncTransport, domain: DomainKey, emptyData: T): Promise<DomainManifest<T> | null> {
    const file = await transport.readFile(domainPath(domain, WEBDAV_MANIFEST_FILE_NAME));
    if (!file) return null;
    const data = JSON.parse(await file.text()) as DomainManifest<T>;
    if (data.app !== "infinite-canvas" || data.domain !== domain) throw new Error(i18n.t("config.webdav.errors.invalidManifest", { domain }));
    return {
        app: "infinite-canvas",
        version: 1,
        domain,
        exportedAt: data.exportedAt || new Date().toISOString(),
        data: data.data || emptyData,
        files: Array.isArray(data.files) ? data.files : [],
    };
}

async function downloadMissingFiles<T>(transport: SyncTransport, domain: DomainKey, data: T, remoteFiles: AppSyncFile[], onProgress?: AppSyncProgress) {
    const remoteFileMap = new Map(remoteFiles.map((item) => [item.storageKey, item]));
    const tasks: AppSyncFile[] = [];
    const storageKeys = collectStorageKeys(data);
    let scanned = 0;
    for (const storageKey of storageKeys) {
        const localBlob = storageKey.startsWith("image:") ? await getImageBlob(storageKey) : await getMediaBlob(storageKey);
        scanned += 1;
        if (localBlob) {
            emitProgress(onProgress, { domain, label: domainLabel(domain), stage: "检查缺失媒体", current: scanned, total: storageKeys.length, status: "active" });
            continue;
        }
        const remoteFile = remoteFileMap.get(storageKey);
        if (remoteFile) tasks.push(remoteFile);
        emitProgress(onProgress, { domain, label: domainLabel(domain), stage: "检查缺失媒体", current: scanned, total: storageKeys.length, status: "active" });
    }
    if (!tasks.length) {
        emitProgress(onProgress, { domain, label: domainLabel(domain), stage: "媒体已齐全", current: 1, total: 1, status: "active" });
        return;
    }
    let downloaded = 0;
    await runWithConcurrency(tasks, FILE_CONCURRENCY, async (remoteFile) => {
        const blob = await transport.readFile(remoteFile.path, remoteFile.storageKey);
        if (!blob) return;
        const typedBlob = blob.type ? blob : blob.slice(0, blob.size, remoteFile.mimeType);
        await (remoteFile.storageKey.startsWith("image:") ? setImageBlob(remoteFile.storageKey, typedBlob) : setMediaBlob(remoteFile.storageKey, typedBlob));
        downloaded += 1;
        emitProgress(onProgress, { domain, label: domainLabel(domain), stage: "下载媒体", current: downloaded, total: tasks.length, status: "active" });
    });
}

async function uploadChangedFiles<T>(transport: SyncTransport, domain: DomainKey, data: T, remoteFiles: AppSyncFile[], onProgress?: AppSyncProgress) {
    const remoteFileMap = new Map(remoteFiles.map((item) => [item.storageKey, item]));
    const files: AppSyncFile[] = [];
    const tasks: Array<{ item: AppSyncFile; blob: Blob }> = [];
    const failedFiles: string[] = [];
    let uploadedFiles = 0;
    let uploadedBytes = 0;

    const storageKeys = collectStorageKeys(data);
    let scanned = 0;
    for (const storageKey of storageKeys) {
        const blob = storageKey.startsWith("image:") ? await getImageBlob(storageKey) : await getMediaBlob(storageKey);
        const remoteFile = remoteFileMap.get(storageKey);
        if (!blob) {
            if (remoteFile) files.push(remoteFile);
            scanned += 1;
            emitProgress(onProgress, { domain, label: domainLabel(domain), stage: stageText("checkLocalMedia"), current: scanned, total: storageKeys.length, status: "active" });
            continue;
        }
        const item: AppSyncFile = {
            storageKey,
            path: remoteFile?.path || domainPath(domain, `files/${safeFileName(storageKey)}.${fileExtension(blob.type, storageKey)}`),
            mimeType: blob.type || remoteFile?.mimeType || "application/octet-stream",
            bytes: blob.size,
        };
        files.push(item);
        if (!remoteFile || remoteFile.bytes !== blob.size) tasks.push({ item, blob });
        scanned += 1;
        emitProgress(onProgress, { domain, label: domainLabel(domain), stage: stageText("checkLocalMedia"), current: scanned, total: storageKeys.length, status: "active" });
    }

    if (!tasks.length) {
        emitProgress(onProgress, { domain, label: domainLabel(domain), stage: stageText("mediaSkipped"), current: 1, total: 1, status: "active" });
        return { files, uploadedFiles, uploadedBytes, failedFiles };
    }

    const uploadTask = async ({ item, blob }: { item: AppSyncFile; blob: Blob }) => {
        try {
            await transport.writeFile(item.path, blob, item.mimeType, {
                storageKey: item.storageKey,
                onRetry: ({ attempt }) => emitProgress(onProgress, { domain, label: domainLabel(domain), stage: stageText("retryingUpload", { size: formatBytes(blob.size), attempt }), status: "active" }),
                onProgress: ({ offset, total }) =>
                    emitProgress(onProgress, {
                        domain,
                        label: domainLabel(domain),
                        stage: stageText("uploadMediaProgress", { size: formatBytes(blob.size), percent: Math.floor((offset / total) * 100) }),
                        current: uploadedFiles,
                        total: tasks.length,
                        status: "active",
                    }),
            });
            uploadedFiles += 1;
            uploadedBytes += blob.size;
            emitProgress(onProgress, { domain, label: domainLabel(domain), stage: stageText("uploadMediaFile", { size: formatBytes(blob.size) }), current: uploadedFiles, total: tasks.length, status: "active" });
        } catch (error) {
            // 单个文件失败不该让整轮同步白跑（大文件尤其耗时间），记下来继续，最后统一上报
            failedFiles.push(item.storageKey);
            emitProgress(onProgress, { domain, label: domainLabel(domain), stage: stageText("uploadMediaFailed", { name: safeFileName(item.storageKey), reason: error instanceof Error ? error.message : "" }), status: "active" });
        }
    };

    // 大文件（几十 MB 的视频）必须串行：并发会把上行带宽按份数瓜分，单次请求时间成倍上涨，
    // 而公网链路上 PUT 要等整个请求体收完才拿得到响应，Cloudflare 只给 100 秒 —— 一并发就必断。
    const largeTasks = tasks.filter((task) => task.blob.size > UPLOAD_LARGE_FILE_BYTES);
    const smallTasks = tasks.filter((task) => task.blob.size <= UPLOAD_LARGE_FILE_BYTES);
    await runWithConcurrency(smallTasks, FILE_CONCURRENCY, uploadTask);
    for (const task of largeTasks) await uploadTask(task);

    return { files, uploadedFiles, uploadedBytes, failedFiles };
}

async function hydrateAsset(asset: Asset): Promise<Asset> {
    if (asset.kind === "image" && asset.data.storageKey) {
        const dataUrl = await resolveImageUrl(asset.data.storageKey, asset.data.dataUrl);
        return { ...asset, coverUrl: asset.coverUrl.startsWith("blob:") ? dataUrl : asset.coverUrl, data: { ...asset.data, dataUrl } };
    }
    if (asset.kind === "video" && asset.data.storageKey) {
        const url = await resolveMediaUrl(asset.data.storageKey, asset.data.url);
        return { ...asset, coverUrl: asset.coverUrl.startsWith("blob:") ? url : asset.coverUrl, data: { ...asset.data, url } };
    }
    return asset;
}

async function readStoredLogs(store: LogStore) {
    const logs: StoredLog[] = [];
    await store.iterate<StoredLog, void>((value) => {
        if (value && typeof value === "object") logs.push(value);
    });
    return logs;
}

async function replaceStoredLogs(store: LogStore, logs: StoredLog[]) {
    await store.clear();
    await runWithConcurrency(logs, FILE_CONCURRENCY, async (log) => {
        const id = getStringField(log, "id");
        if (id) await store.setItem(id, log);
    });
}

function mergeCanvasData(local: CanvasDomainData, remote: CanvasDomainData): CanvasDomainData {
    const localDeleted = local.deleted || [];
    const remoteDeleted = remote.deleted || [];
    const deletedAtById = new Map<string, string>();
    for (const item of [...remoteDeleted, ...localDeleted]) {
        if (!item.id || !item.deletedAt) continue;
        const current = deletedAtById.get(item.id);
        if (!current || item.deletedAt >= current) deletedAtById.set(item.id, item.deletedAt);
    }

    const projects = mergeById(local.projects || [], remote.projects || [], "updatedAt").filter((project) => {
        const deletedAt = deletedAtById.get(project.id);
        if (!deletedAt) return true;
        if (getTime(project as Record<string, unknown>, "updatedAt") > Date.parse(deletedAt)) {
            deletedAtById.delete(project.id);
            return true;
        }
        return false;
    });

    return {
        projects,
        deleted: [...deletedAtById.entries()].map(([id, deletedAt]) => ({ id, deletedAt })),
    };
}

function mergeById<T extends { id?: string }>(local: T[], remote: T[], timeKey: string) {
    const items = new Map<string, T>();
    remote.forEach((item) => {
        const id = item.id || "";
        if (id) items.set(id, item);
    });
    local.forEach((item) => {
        const id = item.id || "";
        if (!id) return;
        const current = items.get(id);
        if (!current || getTime(item as Record<string, unknown>, timeKey) >= getTime(current as Record<string, unknown>, timeKey)) items.set(id, item);
    });
    return Array.from(items.values()).sort((a, b) => getTime(b as Record<string, unknown>, timeKey) - getTime(a as Record<string, unknown>, timeKey));
}

function collectStorageKeys(value: unknown, keys = new Set<string>()) {
    if (typeof value === "string") {
        if (storageKeyPattern.test(value)) keys.add(value);
        return [...keys];
    }
    if (!value || typeof value !== "object") return [...keys];
    if ("storageKey" in value && typeof value.storageKey === "string" && storageKeyPattern.test(value.storageKey)) keys.add(value.storageKey);
    Object.values(value).forEach((item) => (Array.isArray(item) ? item.forEach((child) => collectStorageKeys(child, keys)) : collectStorageKeys(item, keys)));
    return [...keys];
}

function domainPath(domain: DomainKey, path: string) {
    return `${domain}/${path}`;
}

function domainLabel(domain: DomainKey) {
    if (domain === "canvas") return i18n.t("config.webdav.domains.canvas");
    if (domain === "assets") return i18n.t("config.webdav.domains.assets");
    if (domain === "image-workbench") return i18n.t("config.webdav.domains.imageWorkbench");
    return i18n.t("config.webdav.domains.videoWorkbench");
}

function emitProgress(onProgress: AppSyncProgress | undefined, event: AppSyncProgressEvent) {
    onProgress?.(event);
}

function getStringField(item: Record<string, unknown>, key: string) {
    const value = item[key];
    return typeof value === "string" ? value : "";
}

function getTime(item: Record<string, unknown>, key: string) {
    const value = item[key];
    if (typeof value === "number") return value;
    if (typeof value === "string") return Date.parse(value) || 0;
    return 0;
}

function safeFileName(value: string) {
    return value.replace(/[\\/:*?"<>|]/g, "_");
}

function fileExtension(mimeType: string, storageKey: string) {
    if (mimeType.includes("png")) return "png";
    if (mimeType.includes("jpeg")) return "jpg";
    if (mimeType.includes("webp")) return "webp";
    if (mimeType.includes("gif")) return "gif";
    if (mimeType.includes("mp4")) return "mp4";
    if (mimeType.includes("webm")) return "webm";
    if (mimeType.includes("wav")) return "wav";
    if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
    return storageKey.startsWith("image:") ? "png" : "bin";
}

function waitForHydration<T extends { hydrated: boolean }>(store: { getState: () => T; subscribe: (listener: (state: T) => void) => () => void }) {
    if (store.getState().hydrated) return Promise.resolve();
    return new Promise<void>((resolve) => {
        const unsubscribe = store.subscribe((state) => {
            if (!state.hydrated) return;
            unsubscribe();
            resolve();
        });
    });
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>) {
    const results = new Array<R>(items.length);
    let nextIndex = 0;
    await Promise.all(
        Array.from({ length: Math.min(limit, items.length) }, async () => {
            while (nextIndex < items.length) {
                const index = nextIndex++;
                results[index] = await worker(items[index], index);
            }
        }),
    );
    return results;
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

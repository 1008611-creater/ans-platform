import { readFile } from "node:fs/promises";
try {
 const status = JSON.parse(await readFile(process.env.ANS_WORKER_STATUS_FILE, "utf8"));
 const age = Date.now() - Date.parse(status.updatedAt);
 if(!Number.isFinite(age) || age < -30000 || age > 180000 || !["ready", "working", "model_saved"].includes(status.state)) process.exitCode = 1;
} catch { process.exitCode = 1; }

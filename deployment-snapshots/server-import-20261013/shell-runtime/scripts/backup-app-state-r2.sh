#!/usr/bin/env bash
# Run on the ANS Web node. Creates a private R2 copy of the Supabase app_state
# snapshot without printing any R2 or Supabase credential.

set -euo pipefail

container="${1:-ans-app}"
destination="${2:-/home/ubuntu/ans/backups}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"

[[ -x "${script_dir}/backup-app-state.sh" ]] || { echo "Missing local snapshot helper" >&2; exit 1; }
mkdir -p "$destination"

snapshot_output="$("${script_dir}/backup-app-state.sh" "$container" "$destination")"
printf '%s\n' "$snapshot_output"
snapshot="$(printf '%s\n' "$snapshot_output" | sed -n 's/^Backup written to //p' | tail -n 1)"
[[ -n "$snapshot" && -f "$snapshot" ]] || { echo "Could not locate the local snapshot" >&2; exit 1; }

snapshot_name="$(basename "$snapshot")"
container_snapshot="/tmp/${snapshot_name}"
object_key="private-system/backups/${snapshot_name}"
manifest="${snapshot%.json}.r2.json"

cleanup() {
  docker exec "$container" rm -f "$container_snapshot" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker cp "$snapshot" "${container}:${container_snapshot}"
docker exec \
  -e "ANS_BACKUP_SNAPSHOT=${container_snapshot}" \
  -e "ANS_BACKUP_OBJECT_KEY=${object_key}" \
  "$container" node --input-type=module -e '
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const account = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;
const snapshotPath = process.env.ANS_BACKUP_SNAPSHOT;
const objectKey = process.env.ANS_BACKUP_OBJECT_KEY;
if (!account || !accessKeyId || !secretAccessKey || !bucket || !snapshotPath || !objectKey) {
  throw new Error("Private R2 backup configuration is unavailable");
}

const body = await readFile(snapshotPath);
const sha256 = createHash("sha256").update(body).digest("hex");
const client = new S3Client({
  region: "auto",
  endpoint: `https://${account}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});
await client.send(new PutObjectCommand({
  Bucket: bucket,
  Key: objectKey,
  Body: body,
  ContentType: "application/json",
  Metadata: { sha256, kind: "ans-app-state" },
}));
const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
if (Number(head.ContentLength) !== body.length) throw new Error("Private R2 backup size verification failed");
process.stdout.write(JSON.stringify({
  version: 1,
  createdAt: new Date().toISOString(),
  bucket,
  objectKey,
  bytes: body.length,
  sha256,
  verifiedAt: new Date().toISOString(),
}) + "\n");
' > "$manifest"

chmod 600 "$manifest"
find "$destination" -type f \( -name 'ans-app-state-*.json' -o -name 'ans-app-state-*.r2.json' \) -mtime +14 -delete
echo "Private R2 backup evidence written to $manifest"

#!/usr/bin/env bash
set -euo pipefail

container="${1:-ans-app}"
destination="${2:-/home/ubuntu/ans/backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$destination"

docker exec "$container" node --input-type=module -e '
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase environment is not configured");
const response = await fetch(`${url}/rest/v1/app_state?id=eq.primary&select=data,updated_at`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
if (!response.ok) throw new Error(`Supabase backup read failed (${response.status})`);
process.stdout.write(`${JSON.stringify(await response.json())}\n`);
' > "$destination/ans-app-state-$timestamp.json"

chmod 600 "$destination/ans-app-state-$timestamp.json"
find "$destination" -type f -name 'ans-app-state-*.json' -mtime +14 -delete
echo "Backup written to $destination/ans-app-state-$timestamp.json"

#!/bin/sh
T="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiYzQ3Y2I3NS1iYmIwLTQyZTgtYTJmNy00MTkwMmI3M2RhMzUiLCJlbWFpbCI6ImFkbWluQGhiLmNhdWFpLmZ1biIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc4OTM3ODEyNywiZXhwIjoxNzg5MzgxNzI3fQ.epjJyhEpdLOrZb9dxwwAvkIzK6wL9jtbR1XFPWxggKg"
B='{"taskId":"T3","credits":50,"metadata":{"channel":"ziyu","modelId":"m3","mode":"i2v"}}'
i=1
while [ $i -le 3 ]; do
  curl -s -X POST http://127.0.0.1:8790/api/credits/reserve -H 'Content-Type: application/json' -H "Authorization: Bearer $T" -d "$B" &
  i=$((i+1))
done
wait
echo ""

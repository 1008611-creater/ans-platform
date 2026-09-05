#!/bin/bash
# ANS 本地启动脚本
# 用法: bash start.sh

set -e

cd "$(dirname "$0")"

echo "=== 1. 启动 PostgreSQL (Docker) ==="
docker compose up -d postgres
echo "等待数据库就绪..."
sleep 3

echo ""
echo "=== 2. 运行数据库迁移 ==="
npx prisma migrate deploy 2>/dev/null || npx prisma db push

echo ""
echo "=== 3. 填充初始数据 ==="
npm run db:seed 2>/dev/null || echo "种子数据跳过（可能已存在）"

echo ""
echo "=== 4. 启动开发服务器 ==="
echo "访问 http://localhost:3000"
echo "按 Ctrl+C 停止"
npm run dev

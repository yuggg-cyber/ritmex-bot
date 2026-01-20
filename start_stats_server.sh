#!/bin/bash

# 统计汇总服务器启动脚本
# Stats Aggregation Server Startup Script

echo "=========================================="
echo "  统计汇总服务器启动"
echo "  Stats Aggregation Server"
echo "=========================================="
echo ""

# 检查环境变量
if [ -z "$STATS_SERVER_PORT" ]; then
  echo "⚠️  未设置 STATS_SERVER_PORT，使用默认端口 3000"
  export STATS_SERVER_PORT=3000
fi

if [ -z "$DINGTALK_TOKEN" ]; then
  echo "⚠️  未设置 DINGTALK_TOKEN，将只在控制台输出报表"
fi

echo "📊 监听端口: $STATS_SERVER_PORT"
echo "🔔 钉钉 Token: ${DINGTALK_TOKEN:0:20}..."
echo ""

# 启动服务器
bun run src/stats_system/server.ts

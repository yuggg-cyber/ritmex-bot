#!/bin/bash

# 统计汇总服务器一键部署脚本
# Stats Server One-Click Deployment Script

set -e

echo "=========================================="
echo "  统计汇总服务器一键部署脚本"
echo "  Stats Server Deployment Script"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为 root 用户
if [ "$EUID" -eq 0 ]; then
  echo -e "${RED}❌ 请不要使用 root 用户运行此脚本${NC}"
  echo "请使用普通用户（如 ubuntu）运行"
  exit 1
fi

# 步骤 1: 检查系统
echo -e "${YELLOW}[1/7] 检查系统环境...${NC}"
if [ -f /etc/os-release ]; then
  . /etc/os-release
  echo "操作系统: $NAME $VERSION"
else
  echo -e "${RED}❌ 无法识别操作系统${NC}"
  exit 1
fi

# 步骤 2: 安装依赖
echo ""
echo -e "${YELLOW}[2/7] 安装系统依赖...${NC}"
sudo apt update
sudo apt install -y curl git unzip

# 步骤 3: 安装 Bun
echo ""
echo -e "${YELLOW}[3/7] 安装 Bun 运行时...${NC}"
if command -v bun &> /dev/null; then
  echo "Bun 已安装: $(bun --version)"
else
  echo "正在安装 Bun..."
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  source ~/.bashrc
  echo "Bun 安装完成: $(bun --version)"
fi

# 步骤 4: 克隆代码（如果尚未克隆）
echo ""
echo -e "${YELLOW}[4/7] 检查代码仓库...${NC}"
if [ ! -d "$HOME/ritmex-bot" ]; then
  echo "正在克隆代码仓库..."
  cd ~
  git clone https://github.com/yuggg-cyber/ritmex-bot.git
  cd ritmex-bot
else
  echo "代码仓库已存在，正在更新..."
  cd ~/ritmex-bot
  git pull
fi

# 步骤 5: 配置环境变量
echo ""
echo -e "${YELLOW}[5/7] 配置环境变量...${NC}"
if [ ! -f .env ]; then
  echo "创建 .env 配置文件..."
  cat > .env << 'EOF'
# 统计系统配置
ENABLE_STATS=true
STATS_ROLE=SERVER
STATS_SERVER_PORT=3000
DINGTALK_TOKEN=
EOF
  echo -e "${GREEN}✅ .env 文件已创建${NC}"
  echo ""
  echo -e "${YELLOW}⚠️  请编辑 .env 文件，填写你的钉钉 Token:${NC}"
  echo "   nano ~/ritmex-bot/.env"
  echo ""
  read -p "按 Enter 继续（稍后再配置）或 Ctrl+C 退出..."
else
  echo ".env 文件已存在"
fi

# 步骤 6: 配置防火墙
echo ""
echo -e "${YELLOW}[6/7] 配置防火墙...${NC}"
if command -v ufw &> /dev/null; then
  sudo ufw allow 3000/tcp
  echo -e "${GREEN}✅ 已开放 3000 端口${NC}"
else
  echo "未检测到 ufw，跳过防火墙配置"
fi

# 步骤 7: 创建 systemd 服务
echo ""
echo -e "${YELLOW}[7/7] 创建系统服务...${NC}"

# 获取 Bun 路径
BUN_PATH=$(which bun)
WORK_DIR="$HOME/ritmex-bot"

sudo tee /etc/systemd/system/stats-server.service > /dev/null << EOF
[Unit]
Description=Stats Aggregation Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$WORK_DIR
ExecStart=$BUN_PATH run src/stats_system/server.ts
Restart=always
RestartSec=10
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
EOF

# 重载并启动服务
sudo systemctl daemon-reload
sudo systemctl enable stats-server
sudo systemctl start stats-server

echo ""
echo -e "${GREEN}=========================================="
echo "  ✅ 部署完成！"
echo "==========================================${NC}"
echo ""
echo "📊 服务状态:"
sudo systemctl status stats-server --no-pager -l

echo ""
echo "🔧 常用命令:"
echo "  查看状态: sudo systemctl status stats-server"
echo "  查看日志: sudo journalctl -u stats-server -f"
echo "  重启服务: sudo systemctl restart stats-server"
echo "  停止服务: sudo systemctl stop stats-server"
echo ""
echo "🧪 测试命令:"
echo "  curl http://localhost:3000/health"
echo ""
echo "⚠️  别忘了:"
echo "  1. 配置钉钉 Token: nano ~/ritmex-bot/.env"
echo "  2. 在腾讯云安全组开放 3000 端口"
echo "  3. 重启服务使配置生效: sudo systemctl restart stats-server"
echo ""
echo "🎉 祝你使用愉快！"

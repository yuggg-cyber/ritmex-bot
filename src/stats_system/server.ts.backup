import { type HourlyStats } from "./collector";

interface ServerConfig {
  port: number;
  dingtalkToken: string;
  serverIp: string;
}

interface HeartbeatInfo {
  online: boolean;
  lastSeen: number;
  alerted: boolean; // 记录是否已经针对当前掉线状态发送过报警
}

class StatsServer {
  private config: ServerConfig;
  private historyData: Record<number, HourlyStats[]> = {};
  private heartbeatData: Record<string, HeartbeatInfo> = {};
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private reportInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: ServerConfig) {
    this.config = config;
  }

  async start() {
    const server = Bun.serve({
      port: this.config.port,
      fetch: async (req) => {
        const url = new URL(req.url);

        if (url.pathname === "/stats" && req.method === "POST") {
          try {
            const stats: HourlyStats = await req.json();
            this.handleStats(stats);
            return new Response("OK");
          } catch (e) {
            return new Response("Error", { status: 400 });
          }
        }

        if (url.pathname === "/heartbeat" && req.method === "POST") {
          try {
            const data = await req.json();
            this.handleHeartbeat(data.botName);
            return new Response("OK");
          } catch (e) {
            return new Response("Error", { status: 400 });
          }
        }

        if (url.pathname === "/api/status") {
          const token = url.searchParams.get("token");
          if (token !== this.config.dingtalkToken) {
            return new Response("Unauthorized", { status: 401 });
          }
          return new Response(JSON.stringify(this.heartbeatData), {
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.pathname === "/api/history") {
          const token = url.searchParams.get("token");
          if (token !== this.config.dingtalkToken) {
            return new Response("Unauthorized", { status: 401 });
          }
          return new Response(JSON.stringify(this.historyData), {
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.pathname === "/") {
          const token = url.searchParams.get("token");
          if (token !== this.config.dingtalkToken) {
            return new Response("Unauthorized", { status: 401 });
          }
          return new Response(this.renderDashboard(), {
            headers: { "Content-Type": "text/html" },
          });
        }

        return new Response("Not Found", { status: 404 });
      },
    });

    console.log("[StatsServer] 监听端口 " + this.config.port);
    this.startHeartbeatCheck();
    this.startHourlyReport();
  }

  private handleStats(stats: HourlyStats) {
    const ts = stats.timestamp;
    if (!this.historyData[ts]) {
      this.historyData[ts] = [];
    }

    const existing = this.historyData[ts].find((s) => s.botName === stats.botName);
    if (existing) {
      existing.placeOrderCount += stats.placeOrderCount;
      existing.cancelOrderCount += stats.cancelOrderCount;
      existing.fillCount += stats.fillCount;
      existing.periodPnl = stats.periodPnl;
      existing.currentPosition = stats.currentPosition;
      existing.accountBalance = stats.accountBalance;
      existing.durationMs = stats.durationMs;
    } else {
      this.historyData[ts].push(stats);
    }
    console.log("[StatsServer] 收到并累加数据: " + stats.botName);
  }

  private handleHeartbeat(botName: string) {
    const info = this.heartbeatData[botName];
    const wasOffline = info?.online === false;
    
    this.heartbeatData[botName] = {
      online: true,
      lastSeen: Date.now(),
      alerted: false, // 重新上线，重置报警标记
    };

    if (wasOffline) {
      this.sendToDingTalk("✅ **机器人恢复在线**\n\n- **机器人**: " + botName + "\n- **时间**: " + new Date().toLocaleString());
    }
  }

  private startHeartbeatCheck() {
    this.checkInterval = setInterval(() => {
      const now = Date.now();
      for (const botName in this.heartbeatData) {
        const info = this.heartbeatData[botName];
        // 如果在线且超过5分钟没心跳
        if (info.online && now - info.lastSeen > 5 * 60 * 1000) {
          info.online = false;
          // 仅在未报警时发送提醒
          if (!info.alerted) {
            info.alerted = true;
            this.sendToDingTalk("⚠️ **机器人掉线报警**\n\n- **机器人**: " + botName + "\n- **状态**: 离线 (5分钟无心跳)\n- **最后活跃**: " + new Date(info.lastSeen).toLocaleString());
          }
        }
      }
    }, 60 * 1000);
  }

  private startHourlyReport() {
    const checkAndReport = async () => {
      const now = new Date();
      if (now.getMinutes() === 2) {
        const lastHourTs = new Date(now).setHours(now.getHours() - 1, 0, 0, 0);
        const stats = this.historyData[lastHourTs];
        if (stats && stats.length > 0) {
          let content = "📊 **Standx监控 - 整点数据播报**\n\n";
          content += "- **统计时段**: " + new Date(lastHourTs).getHours() + ":00 - " + now.getHours() + ":00\n";
          content += "- **活跃机器人**: " + stats.length + "\n\n";
          
          let totalPnl = 0;
          stats.forEach(s => {
            totalPnl += s.periodPnl;
            content += "--- \n";
            content += "**" + s.botName + "**\n";
            content += "- 挂单: " + s.placeOrderCount + " | 成交: " + s.fillCount + "\n";
            content += "- 盈亏: " + (s.periodPnl >= 0 ? "+" : "") + s.periodPnl.toFixed(2) + " U\n";
            content += "- 余额: " + s.accountBalance.toFixed(2) + "\n";
          });
          
          content += "\n---\n💰 **全平台总盈亏**: " + (totalPnl >= 0 ? "+" : "") + totalPnl.toFixed(2) + " U";
          await this.sendToDingTalk(content);
          console.log("[StatsServer] 播报成功");
        }
      }
    };

    this.reportInterval = setInterval(checkAndReport, 60 * 1000);
    console.log("[StatsServer] 整点播报任务已启动");
  }

  private async sendToDingTalk(content: string): Promise<void> {
    if (!this.config.dingtalkToken) return;
    const webhookUrl = "https://oapi.dingtalk.com/robot/send?access_token=" + this.config.dingtalkToken;
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          msgtype: "markdown",
          markdown: { title: "Standx监控通知", text: content },
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      console.error("[StatsServer] 发送到钉钉失败:", error);
    }
  }

  private renderDashboard() {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Standx监控</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root { --bg: #0f172a; --card: #1e293b; --text: #f8fafc; --primary: #3b82f6; --success: #22c55e; --danger: #ef4444; }
    body { background: var(--bg); color: var(--text); font-family: system-ui; margin: 0; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .card { background: var(--card); padding: 15px; border-radius: 12px; text-align: center; border: 1px solid #334155; }
    .card .label { font-size: 13px; color: #94a3b8; margin-bottom: 5px; }
    .card .value { font-size: 22px; font-weight: bold; }
    .chart-container { background: var(--card); padding: 20px; border-radius: 12px; margin-bottom: 20px; height: 250px; border: 1px solid #334155; }
    table { width: 100%; border-collapse: collapse; background: var(--card); border-radius: 12px; overflow: hidden; }
    th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #334155; }
    th { background: #334155; cursor: pointer; font-size: 14px; }
    .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
    .online { background: var(--success); box-shadow: 0 0 8px var(--success); }
    .offline { background: var(--danger); }
    .progress-bar { height: 3px; background: var(--primary); width: 0%; transition: width 1s linear; position: fixed; top: 0; left: 0; z-index: 100; }
  </style>
</head>
<body>
  <div id="syncProgress" class="progress-bar"></div>
  <div class="header">
    <h1>🚀 Standx监控</h1>
    <div style="text-align:right">
      <select id="timeSelect" onchange="updateUI()" style="background:#1e293b; color:white; border:1px solid #334155; padding:5px; border-radius:4px;"></select>
      <div style="font-size:12px; color:#94a3b8; margin-top:5px;">下次同步: <span id="countdown">30</span>s</div>
    </div>
  </div>
  <div class="cards" id="statsCards"></div>
  <div class="chart-container"><canvas id="trendChart"></canvas></div>
  <table id="statsTable">
    <thead>
      <tr>
        <th onclick="sortTable(0)">机器名 ↕</th>
        <th onclick="sortTable(1)">状态 ↕</th>
        <th onclick="sortTable(2)">挂单 ↕</th>
        <th onclick="sortTable(3)">撤单 ↕</th>
        <th onclick="sortTable(4)">成交 ↕</th>
        <th onclick="sortTable(5)">盈亏 ↕</th>
        <th onclick="sortTable(6)">仓位 ↕</th>
        <th onclick="sortTable(7)">余额 ↕</th>
        <th onclick="sortTable(8)">最后活跃</th>
      </tr>
    </thead>
    <tbody id="tableBody"></tbody>
  </table>

  <script>
    let historyData = {};
    let heartbeatData = {};
    let currentSort = { col: 0, asc: true };
    let trendChart = null;
    let timeLeft = 30;

    async function fetchData() {
      const token = new URLSearchParams(window.location.search).get('token');
      try {
        const [hRes, sRes] = await Promise.all([
          fetch('/api/history?token=' + token).then(r => r.json()),
          fetch('/api/status?token=' + token).then(r => r.json())
        ]);
        historyData = hRes;
        heartbeatData = sRes;
        updateTimeSelect();
        updateUI();
        timeLeft = 30;
      } catch (e) { console.error("Fetch error", e); }
    }

    function updateTimeSelect() {
      const select = document.getElementById('timeSelect');
      const currentVal = select.value;
      const tsList = Object.keys(historyData).map(Number).sort((a,b) => b-a);
      const nowTs = new Date().setMinutes(0,0,0,0);
      if (!tsList.includes(nowTs)) tsList.unshift(nowTs);
      
      select.innerHTML = tsList.map(ts => {
        const d = new Date(ts);
        const label = d.getHours() + ':00 - ' + (d.getHours()+1) + ':00';
        return '<option value="' + ts + '"' + (ts == currentVal ? ' selected' : '') + '>' + label + '</option>';
      }).join('');
      if (!currentVal) select.value = tsList[0];
    }

    function updateUI() {
      const selectedTs = Number(document.getElementById('timeSelect').value);
      const stats = historyData[selectedTs] || [];
      const allBotNames = new Set([...stats.map(s => s.botName), ...Object.keys(heartbeatData)]);
      
      const displayData = Array.from(allBotNames).map(name => {
        const s = stats.find(i => i.botName === name) || {
          botName: name, placeOrderCount: 0, cancelOrderCount: 0, fillCount: 0, periodPnl: 0, currentPosition: 0, accountBalance: 0
        };
        return { ...s, hb: heartbeatData[name] || { online: false, lastSeen: 0 } };
      });

      let tP=0, tC=0, tF=0, tPnl=0, tBal=0;
      stats.forEach(s => { tP+=s.placeOrderCount; tC+=s.cancelOrderCount; tF+=s.fillCount; tPnl+=s.periodPnl; tBal+=s.accountBalance; });
      
      document.getElementById('statsCards').innerHTML = 
        '<div class="card"><div class="label">🤖 活跃账户</div><div class="value">' + Object.values(heartbeatData).filter(h=>h.online).length + '</div></div>' +
        '<div class="card"><div class="label">🟢 总挂单</div><div class="value">' + tP + '</div></div>' +
        '<div class="card"><div class="label">🔴 总撤单</div><div class="value">' + tC + '</div></div>' +
        '<div class="card"><div class="label">✅ 总成交</div><div class="value">' + tF + '</div></div>' +
        '<div class="card"><div class="label">💰 总盈亏</div><div class="value" style="color:' + (tPnl>=0?"var(--success)":"var(--danger)") + '">' + (tPnl>=0?"+":"") + tPnl.toFixed(2) + '</div></div>' +
        '<div class="card"><div class="label">🏦 总余额</div><div class="value">' + tBal.toFixed(2) + '</div></div>';

      const tbody = document.getElementById('tableBody');
      tbody.innerHTML = '';
      displayData.forEach(s => {
        const row = document.createElement('tr');
        row.innerHTML = 
          '<td>' + s.botName + '</td>' +
          '<td><span class="status-dot ' + (s.hb.online?"online":"offline") + '"></span>' + (s.hb.online?"在线":"离线") + '</td>' +
          '<td>' + s.placeOrderCount + '</td>' +
          '<td>' + s.cancelOrderCount + '</td>' +
          '<td>' + s.fillCount + '</td>' +
          '<td style="color:' + (s.periodPnl>=0?"var(--success)":"var(--danger)") + '">' + (s.periodPnl>=0?"+":"") + s.periodPnl.toFixed(2) + '</td>' +
          '<td>' + (s.currentPosition || 0).toFixed(4) + '</td>' +
          '<td>' + (s.accountBalance || 0).toFixed(2) + '</td>' +
          '<td style="font-size:12px; color:#94a3b8">' + (s.hb.lastSeen ? new Date(s.hb.lastSeen).toLocaleTimeString() : "从未") + '</td>';
        tbody.appendChild(row);
      });
      updateChart();
    }

    function updateChart() {
      const ctx = document.getElementById('trendChart').getContext('2d');
      const tsList = Object.keys(historyData).map(Number).sort();
      const labels = tsList.map(ts => new Date(ts).getHours() + ':00');
      const data = tsList.map(ts => historyData[ts].reduce((acc, s) => acc + s.placeOrderCount, 0));
      if (trendChart) trendChart.destroy();
      trendChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{ label: '全平台总挂单量', data: data, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }, x: { grid: { display: false }, ticks: { color: '#94a3b8' } } } }
      });
    }

    function sortTable(n) {
      const table = document.getElementById("statsTable");
      let rows = Array.from(table.rows).slice(1);
      const asc = currentSort.col === n ? !currentSort.asc : true;
      currentSort = { col: n, asc };
      rows.sort((a, b) => {
        let x = a.cells[n].innerText.toLowerCase();
        let y = b.cells[n].innerText.toLowerCase();
        if (!isNaN(parseFloat(x)) && !isNaN(parseFloat(y))) return asc ? parseFloat(x) - parseFloat(y) : parseFloat(y) - parseFloat(x);
        return asc ? x.localeCompare(y) : y.localeCompare(x);
      });
      rows.forEach(row => table.tBodies[0].appendChild(row));
    }

    setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) fetchData();
      document.getElementById('countdown').innerText = timeLeft;
      document.getElementById('syncProgress').style.width = ((30 - timeLeft) / 30 * 100) + '%';
    }, 1000);

    window.onload = fetchData;
  </script>
</body>
</html>
`;
  }
}

async function main() {
  const port = Number(process.env.STATS_SERVER_PORT) || 3000;
  const dingtalkToken = process.env.DINGTALK_TOKEN || "";
  const serverIp = process.env.SERVER_IP || "localhost";
  const server = new StatsServer({ port, dingtalkToken, serverIp });
  await server.start();
  console.log("[StatsServer] 服务已启动");
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("服务启动失败:", error);
    process.exit(1);
  });
}

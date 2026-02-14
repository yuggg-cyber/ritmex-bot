import { type HourlyStats } from "./collector";
import { type StandxPointsData } from "./standx-points-collector";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface ServerConfig {
  port: number;
  dingtalkToken: string;
  serverIp: string;
}

interface HeartbeatInfo {
  online: boolean;
  lastSeen: number;
  alerted: boolean;
}

const DATA_FILE = join(process.cwd(), "hourly_stats.json");
const POINTS_FILE = join(process.cwd(), "points_history.json");

class StatsServer {
  private config: ServerConfig;
  private historyData: Record<number, HourlyStats[]> = {};
  private pointsData: Record<number, StandxPointsData[]> = {};
  private heartbeatData: Record<string, HeartbeatInfo> = {};
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private reportInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: ServerConfig) {
    this.config = config;
    this.loadData();
  }

  private loadData() {
    try {
      if (existsSync(DATA_FILE)) {
        this.historyData = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
      }
      if (existsSync(POINTS_FILE)) {
        this.pointsData = JSON.parse(readFileSync(POINTS_FILE, "utf-8"));
      }
      console.log("[StatsServer] 历史数据加载成功");
    } catch (e) {
      console.error("[StatsServer] 加载历史数据失败:", e);
    }
  }

  private saveData() {
    try {
      writeFileSync(DATA_FILE, JSON.stringify(this.historyData, null, 2));
      writeFileSync(POINTS_FILE, JSON.stringify(this.pointsData, null, 2));
    } catch (e) {
      console.error("[StatsServer] 保存数据失败:", e);
    }
  }

  async start() {
    const server = Bun.serve({
      port: this.config.port,
      fetch: async (req) => {
        const url = new URL(req.url);

        if (url.pathname === "/stats" && req.method === "POST") {
          try {
            const stats: HourlyStats = await req.json() as HourlyStats;
            this.handleStats(stats);
            return new Response("OK");
          } catch (e) {
            return new Response("Error", { status: 400 });
          }
        }

        if (url.pathname === "/stats/points" && req.method === "POST") {
          try {
            const data: StandxPointsData = await req.json() as StandxPointsData;
            this.handlePoints(data);
            return new Response("OK");
          } catch (e) {
            return new Response("Error", { status: 400 });
          }
        }

        if (url.pathname === "/heartbeat" && req.method === "POST") {
          try {
            const data = await req.json() as { botName: string };
            this.handleHeartbeat(data.botName);
            return new Response("OK");
          } catch (e) {
            return new Response("Error", { status: 400 });
          }
        }

        if (url.pathname === "/api/status") {
          const token = url.searchParams.get("token");
          if (token !== this.config.dingtalkToken) return new Response("Unauthorized", { status: 401 });
          return new Response(JSON.stringify(this.heartbeatData), { headers: { "Content-Type": "application/json" } });
        }

        if (url.pathname === "/api/history") {
          const token = url.searchParams.get("token");
          if (token !== this.config.dingtalkToken) return new Response("Unauthorized", { status: 401 });
          return new Response(JSON.stringify({ stats: this.historyData, points: this.pointsData }), { headers: { "Content-Type": "application/json" } });
        }

        if (url.pathname === "/") {
          const token = url.searchParams.get("token");
          if (token !== this.config.dingtalkToken) return new Response("Unauthorized", { status: 401 });
          return new Response(this.renderDashboard(), { headers: { "Content-Type": "text/html" } });
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
    if (!this.historyData[ts]) this.historyData[ts] = [];
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
    this.saveData();
  }

  private handlePoints(data: StandxPointsData) {
    const date = new Date(data.timestamp);
    date.setMinutes(0, 0, 0);
    date.setSeconds(0, 0);
    const ts = date.getTime();

    if (!this.pointsData[ts]) this.pointsData[ts] = [];
    const existingIdx = this.pointsData[ts].findIndex(p => p.botName === data.botName);
    if (existingIdx > -1) {
      this.pointsData[ts][existingIdx] = data;
    } else {
      this.pointsData[ts].push(data);
    }
    this.saveData();
  }

  private handleHeartbeat(botName: string) {
    this.heartbeatData[botName] = { online: true, lastSeen: Date.now(), alerted: false };
  }

  private startHeartbeatCheck() {
    setInterval(() => {
      const now = Date.now();
      for (const botName in this.heartbeatData) {
        const info = this.heartbeatData[botName];
        if (info && info.online && now - info.lastSeen > 5 * 60 * 1000) {
          info.online = false;
          if (!info.alerted) {
            info.alerted = true;
            this.sendToDingTalk(`⚠️ **机器人掉线**\n- **机器人**: ${botName}\n- **时间**: ${new Date().toLocaleString()}`);
          }
        }
      }
    }, 60 * 1000);
  }

  private startHourlyReport() {
    setInterval(async () => {
      const now = new Date();
      if (now.getMinutes() === 2) {
        const lastHourTs = new Date(now).setHours(now.getHours() - 1, 0, 0, 0);
        const stats = this.historyData[lastHourTs];
        if (stats && stats.length > 0) {
          let content = `📊 **Standx整点播报** (${now.getHours()-1}:00-${now.getHours()}:00)\n\n`;
          let totalPnl = 0;
          stats.forEach(s => {
            totalPnl += s.periodPnl;
            content += `**${s.botName}**: 盈亏 ${s.periodPnl.toFixed(2)}U | 余额 ${s.accountBalance.toFixed(2)}\n`;
          });
          content += `\n💰 **总盈亏**: ${totalPnl.toFixed(2)}U`;
          await this.sendToDingTalk(content);
        }
      }
    }, 60 * 1000);
  }

  private async sendToDingTalk(content: string) {
    if (!this.config.dingtalkToken) return;
    try {
      await fetch(`https://oapi.dingtalk.com/robot/send?access_token=${this.config.dingtalkToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ msgtype: "markdown", markdown: { title: "监控通知", text: content } }),
      });
    } catch (e) { console.error("钉钉发送失败", e); }
  }

  private renderDashboard() {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Standx数据看板</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root { --bg: #0b0e14; --card: #161a1e; --text: #eaecef; --primary: #f0b90b; --success: #0ecb81; --danger: #f6465d; --border: #2b3139; }
    body { background: var(--bg); color: var(--text); font-family: "PingFang SC", sans-serif; margin: 0; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .card { background: var(--card); padding: 20px; border-radius: 12px; border: 1px solid var(--border); position: relative; }
    .card .label { font-size: 14px; color: #848e9c; margin-bottom: 8px; display: flex; align-items: center; gap: 5px; }
    .card .value { font-size: 28px; font-weight: bold; }
    .card .sub-value { font-size: 16px; margin-top: 5px; font-weight: 500; }
    .grid-container { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
    .chart-box { background: var(--card); padding: 20px; border-radius: 12px; border: 1px solid var(--border); height: 300px; }
    table { width: 100%; border-collapse: collapse; background: var(--card); border-radius: 12px; overflow: hidden; margin-top: 20px; border: 1px solid var(--border); }
    th, td { padding: 15px; text-align: left; border-bottom: 1px solid var(--border); }
    th { background: #1e2329; color: #848e9c; font-weight: normal; font-size: 14px; }
    .status-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; }
    .online { background: var(--success); box-shadow: 0 0 10px var(--success); }
    .offline { background: var(--danger); }
    .progress-bar { height: 4px; background: var(--primary); width: 0%; transition: width 1s linear; position: fixed; top: 0; left: 0; z-index: 100; }
    .red-zone { border: 2px solid var(--danger); }
  </style>
</head>
<body>
  <div id="syncProgress" class="progress-bar"></div>
  <div class="header">
    <h1>🤖 Standx数据看板</h1>
    <div style="text-align:right">
      <div style="margin-bottom:10px">查看历史小时: <select id="timeSelect" onchange="updateUI()" style="background:#1e2329; color:white; border:1px solid var(--border); padding:8px; border-radius:6px;"></select></div>
      <div style="font-size:13px; color:#848e9c">下次同步: <span id="countdown">30</span>s | 最后更新: <span id="lastUpdate">--</span></div>
    </div>
  </div>

  <div class="cards" id="mainCards"></div>
  
  <div class="grid-container">
    <div class="chart-box"><canvas id="trendChart"></canvas></div>
    <div class="cards" id="pointsCards" style="grid-template-columns: 1fr; gap: 10px;"></div>
  </div>

  <table id="statsTable">
    <thead>
      <tr>
        <th>机器名</th><th>状态</th><th>总挂单</th><th>总成交</th><th>总盈亏</th><th>仓位</th><th>余额</th><th>最后活跃</th>
      </tr>
    </thead>
    <tbody id="tableBody"></tbody>
  </table>

  <script>
    let historyData = { stats: {}, points: {} };
    let heartbeatData = {};
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
        document.getElementById('lastUpdate').innerText = new Date().toLocaleTimeString();
      } catch (e) { console.error(e); }
    }

    function updateTimeSelect() {
      const select = document.getElementById('timeSelect');
      const currentVal = select.value;
      const tsList = Array.from(new Set([...Object.keys(historyData.stats), ...Object.keys(historyData.points)])).map(Number).sort((a,b) => b-a);
      const nowTs = new Date().setMinutes(0,0,0,0);
      if (!tsList.includes(nowTs)) tsList.unshift(nowTs);
      
      select.innerHTML = tsList.map(ts => {
        const d = new Date(ts);
        return '<option value="' + ts + '"' + (ts == currentVal ? ' selected' : '') + '>' + d.getHours() + ':00 - ' + (d.getHours()+1) + ':00 (' + (d.getMonth()+1) + '/' + d.getDate() + ')</option>';
      }).join('');
      if (!currentVal) select.value = tsList[0];
    }

    function updateUI() {
      const selectedTs = Number(document.getElementById('timeSelect').value);
      const prevTs = selectedTs - 3600000;
      
      const stats = historyData.stats[selectedTs] || [];
      const points = historyData.points[selectedTs] || [];
      const prevPoints = historyData.points[prevTs] || [];

      // 计算主卡片
      let tP=0, tC=0, tF=0, tPnl=0, tBal=0;
      stats.forEach(s => { tP+=s.placeOrderCount; tC+=s.cancelOrderCount; tF+=s.fillCount; tPnl+=s.periodPnl; tBal+=s.accountBalance; });
      
      document.getElementById('mainCards').innerHTML = \`
        <div class="card"><div class="label">🤖 活跃账户</div><div class="value">\${Object.values(heartbeatData).filter(h=>h.online).length}</div></div>
        <div class="card"><div class="label">🟢 总挂单</div><div class="value">\${tP}</div></div>
        <div class="card"><div class="label">🔴 总撤单</div><div class="value">\${tC}</div></div>
        <div class="card"><div class="label">✅ 总成交</div><div class="value">\${tF}</div></div>
        <div class="card"><div class="label">💰 总盈亏</div><div class="value" style="color:\${tPnl>=0?'var(--success)':'var(--danger)'}">\${tPnl>=0?'+':''}\${tPnl.toFixed(2)}</div></div>
        <div class="card"><div class="label">🏦 总余额</div><div class="value">\${tBal.toFixed(2)}</div></div>
      \`;

      // 计算积分卡片 (红色区域逻辑)
      let curM=0, curU=0, curT=0;
      points.forEach(p => { curM+=p.makerPoints; curU+=p.makerUptimeHours; curT+=p.tradingPoints; });
      
      let preM=0, preU=0, preT=0;
      prevPoints.forEach(p => { preM+=p.makerPoints; preU+=p.makerUptimeHours; preT+=p.tradingPoints; });
      
      const diffM = curM - preM;
      const diffU = curU - preU;
      const diffT = curT - preT;

      document.getElementById('pointsCards').innerHTML = \`
        <div class="card red-zone">
          <div class="label">📊 总挂单积分 / 挂单积分(H)</div>
          <div class="value">\${curM.toFixed(0)}</div>
          <div class="sub-value" style="color:var(--success)">+\${diffM.toFixed(0)}</div>
        </div>
        <div class="card red-zone">
          <div class="label">⏰ 总做市时长 / 做市时长(H)</div>
          <div class="value">\${curU.toFixed(2)}h</div>
          <div class="sub-value" style="color:var(--success)">+\${diffU.toFixed(2)}h</div>
        </div>
        <div class="card red-zone">
          <div class="label">📈 总交易积分 / 交易积分(H)</div>
          <div class="value">\${curT.toFixed(0)}</div>
          <div class="sub-value" style="color:var(--success)">+\${diffT.toFixed(0)}</div>
        </div>
      \`;

      // 表格
      const tbody = document.getElementById('tableBody');
      tbody.innerHTML = '';
      const allBots = new Set([...stats.map(s=>s.botName), ...Object.keys(heartbeatData)]);
      Array.from(allBots).forEach(name => {
        const s = stats.find(i=>i.botName===name) || { placeOrderCount:0, fillCount:0, periodPnl:0, currentPosition:0, accountBalance:0 };
        const hb = heartbeatData[name] || { online:false, lastSeen:0 };
        const row = \`<tr>
          <td>\${name}</td>
          <td><span class="status-dot \${hb.online?'online':'offline'}"></span>\${hb.online?'在线':'离线'}</td>
          <td>\${s.placeOrderCount}</td><td>\${s.fillCount}</td>
          <td style="color:\${s.periodPnl>=0?'var(--success)':'var(--danger)'}">\${s.periodPnl>=0?'+':''}\${s.periodPnl.toFixed(2)}</td>
          <td>\${s.currentPosition.toFixed(4)}</td><td>\${s.accountBalance.toFixed(2)}</td>
          <td style="font-size:12px; color:#848e9c">\${hb.lastSeen?new Date(hb.lastSeen).toLocaleTimeString():'--'}</td>
        </tr>\`;
        tbody.innerHTML += row;
      });
      updateChart();
    }

    function updateChart() {
      const ctx = document.getElementById('trendChart').getContext('2d');
      const tsList = Object.keys(historyData.stats).map(Number).sort();
      const labels = tsList.map(ts => new Date(ts).getHours() + ':00');
      const data = tsList.map(ts => historyData.stats[ts].reduce((acc, s) => acc + s.placeOrderCount, 0));
      if (trendChart) trendChart.destroy();
      trendChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ label: '全平台挂单趋势', data, borderColor: '#f0b90b', tension: 0.4, fill: true, backgroundColor: 'rgba(240, 185, 11, 0.1)' }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: { color: '#2b3139' } }, x: { grid: { display: false } } } }
      });
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
}

if (import.meta.main) main().catch(console.error);

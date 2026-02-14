/**
 * 统计上报器 (Client 端)
 * 负责定时上报统计数据到 Server
 * Fire-and-forget 模式：不等待响应，不阻塞主线程
 */

import { collector, type HourlyStats } from "./collector";
import { standxCollector, type StandxPointsData } from "./standx-points-collector";

class StatsReporter {
  private enabled: boolean = false;
  private serverUrl: string = "";
  private heartbeatUrl: string = "";
  private timer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pointsTimer: ReturnType<typeof setInterval> | null = null;
  private lastReportTime: number = -1; // 记录上次上报的时间戳，避免重复上报

  /**
   * 初始化上报器
   */
  init(enabled: boolean, serverUrl: string): void {
    this.enabled = enabled;
    this.serverUrl = serverUrl;
    
    // 自动推导心跳 URL
    if (this.serverUrl) {
      const url = new URL(this.serverUrl);
      url.pathname = "/heartbeat";
      this.heartbeatUrl = url.toString();
    }

    // 先初始化 StandX 积分收集器（必须在 schedulePointsReport 之前）
    standxCollector.init();

    if (this.enabled && this.serverUrl) {
      this.scheduleReport();
      this.scheduleHeartbeat();
      this.schedulePointsReport();
      console.log("[StatsReporter] 已启用，Server URL: " + this.serverUrl);
    }
  }

  /**
   * 调度定时上报任务 - 每 3 分钟上报一次
   */
  private scheduleReport(): void {
    // 每 3 分钟执行一次上报
    this.timer = setInterval(() => {
      this.sendReport();
    }, 3 * 60 * 1000);

    console.log("[StatsReporter] 3分钟上报已启动");
  }

  /**
   * 调度心跳任务 - 每 3 分钟一次
   */
  private scheduleHeartbeat(): void {
    // 立即发送一次心跳
    this.sendHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, 3 * 60 * 1000);
    
    console.log("[StatsReporter] 3分钟心跳已启动");
  }

  /**
   * 发送心跳
   */
  private sendHeartbeat(): void {
    if (!this.enabled || !this.heartbeatUrl) return;
    
    const heartbeatData = {
      botName: process.env.BOT_NAME || "UnknownBot",
      timestamp: Date.now(),
      status: "running"
    };

    fetch(this.heartbeatUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(heartbeatData),
      signal: AbortSignal.timeout(3000),
    }).catch(() => {
      // 心跳失败静默处理
    });
  }

  /**
   * 设置基准订单（由外部调用）
   */
  setBaselineOrders(orderIds: string[]): void {
    collector.setBaselineOrders(orderIds);
  }
  
  /**
   * 发送统计报告（Fire-and-forget）
   */
  private sendReport(): void {
    const stats = collector.getStatsAndReset();
    if (!stats) return;

    this.postStats(stats).catch((err) => {
      console.error("[StatsReporter] 上报失败:", err.message);
    });
  }

  /**
   * POST 统计数据到 Server
   */
  private async postStats(stats: HourlyStats): Promise<void> {
    try {
      const response = await fetch(this.serverUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stats),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      console.log("[StatsReporter] 上报成功: " + stats.botName + " @ " + new Date(stats.timestamp).toISOString());
    } catch (error) {
      throw error;
    }
  }

  /**
   * 停止上报器
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.pointsTimer) {
      clearInterval(this.pointsTimer);
      this.pointsTimer = null;
    }
  }

  /**
   * 调度积分上报任务 - 每 3 分钟上报一次（延迟 30 秒启动）
   */
  private schedulePointsReport(): void {
    if (!standxCollector.isEnabled()) {
      console.log("[StatsReporter] StandX 积分上报未启用（未配置 Token）");
      return;
    }

    // 延迟 30 秒启动，避免与统计上报冲突
    setTimeout(() => {
      // 立即执行一次
      this.sendPointsReport();
      
      // 然后每 3 分钟执行一次
      this.pointsTimer = setInterval(() => {
        this.sendPointsReport();
      }, 3 * 60 * 1000);
      
      console.log("[StatsReporter] StandX 积分上报已启动（每3分钟）");
    }, 30 * 1000);
  }

  /**
   * 发送积分报告（Fire-and-forget）
   */
  private async sendPointsReport(): Promise<void> {
    try {
      const pointsData = await standxCollector.fetchPoints();
      
      if (!pointsData) {
        // 查询失败，静默跳过
        return;
      }

      // 尝试上报到服务器
      await this.postPoints(pointsData);
    } catch (error: any) {
      // 所有错误都被捕获，不向上传播
      console.error("[StatsReporter] 积分上报失败:", error.message);
    }
  }

  /**
   * POST 积分数据到 Server
   */
  private async postPoints(pointsData: StandxPointsData): Promise<void> {
    try {
      const pointsUrl = this.serverUrl.replace("/stats", "/stats/points");
      const response = await fetch(pointsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pointsData),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      console.log("[StatsReporter] 积分上报成功: " + pointsData.botName);
    } catch (error) {
      throw error;
    }
  }
}

// 导出单例
export const reporter = new StatsReporter();

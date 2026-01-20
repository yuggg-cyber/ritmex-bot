/**
 * 统计上报器 (Client 端)
 * 负责定时上报统计数据到 Server
 * Fire-and-forget 模式：不等待响应，不阻塞主线程
 */

import { collector, type HourlyStats } from "./collector";

class StatsReporter {
  private enabled: boolean = false;
  private serverUrl: string = "";
  private heartbeatUrl: string = "";
  private timer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
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

    if (this.enabled && this.serverUrl) {
      this.scheduleReport();
      this.scheduleHeartbeat();
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
  }
}

// 导出单例
export const reporter = new StatsReporter();

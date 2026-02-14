/**
 * 统计系统统一导出
 */

import { collector as collectorInstance } from "./collector";
import { reporter as reporterInstance } from "./reporter";

export { collector } from "./collector";
export { reporter } from "./reporter";
export type { HourlyStats } from "./collector";

/**
 * 初始化统计系统 (Client 端)
 * 必须在程序启动时调用一次
 */
export function initStatsSystem(): void {
  const enabled = process.env.ENABLE_STATS === "true";
  const role = process.env.STATS_ROLE || "CLIENT";

  if (!enabled || role !== "CLIENT") {
    return;
  }

  const botName = process.env.BOT_NAME || "unknown";
  const serverUrl = process.env.STATS_SERVER_URL || "";

  // 初始化收集器
  collectorInstance.init(enabled, botName);

  // 初始化上报器
  if (serverUrl) {
    reporterInstance.init(enabled, serverUrl);
  } else {
    console.warn("[StatsSystem] 未配置 STATS_SERVER_URL，统计数据将不会上报");
  }
}

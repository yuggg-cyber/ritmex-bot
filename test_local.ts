// 模拟服务器逻辑
const historyStorage = new Map<number, any[]>();

// 模拟接收数据
function receiveData(data: any) {
  const hourTimestamp = getHourTimestamp(data.timestamp);
  
  if (!historyStorage.has(hourTimestamp)) {
    historyStorage.set(hourTimestamp, []);
  }
  historyStorage.get(hourTimestamp)!.push(data);
  
  console.log(`存储数据到时间戳 ${hourTimestamp}:`, data.botName);
}

function getHourTimestamp(timestamp: number): number {
  const date = new Date(timestamp);
  date.setMinutes(0, 0, 0);
  return date.getTime();
}

// 模拟播报
function broadcast() {
  console.log("\n=== 开始播报 ===");
  console.log("存储数量:", historyStorage.size);
  
  if (historyStorage.size === 0) {
    console.log("无数据");
    return;
  }
  
  const timestamps = Array.from(historyStorage.keys()).sort((a, b) => b - a);
  console.log("所有时间戳:", timestamps);
  
  const latestTimestamp = timestamps[0];
  console.log("最新时间戳:", latestTimestamp, new Date(latestTimestamp).toISOString());
  
  const latestStats = historyStorage.get(latestTimestamp) || [];
  console.log("最新数据数量:", latestStats.length);
  console.log("最新数据:", latestStats);
}

// 测试
const testData = [
  { botName: "FWQ1_ZH1", timestamp: Date.now(), placeOrderCount: 100, cancelOrderCount: 50, fillCount: 20, durationMs: 3600000, periodPnl: 10, currentPosition: 0.1, accountBalance: 10000 },
  { botName: "FWQ2_ZH2", timestamp: Date.now(), placeOrderCount: 200, cancelOrderCount: 60, fillCount: 30, durationMs: 3600000, periodPnl: 20, currentPosition: 0.2, accountBalance: 20000 },
  { botName: "FWQ3_ZH3", timestamp: Date.now(), placeOrderCount: 300, cancelOrderCount: 70, fillCount: 40, durationMs: 3600000, periodPnl: 30, currentPosition: 0.3, accountBalance: 30000 },
];

testData.forEach(receiveData);
broadcast();

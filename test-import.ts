// 测试导入 stats_system
console.log("开始测试导入...");

try {
  const module1 = await import("./src/stats_system/index.ts");
  console.log("✅ 方式1成功:", Object.keys(module1));
} catch (e) {
  console.log("❌ 方式1失败:", e.message);
}

try {
  const module2 = await import("./src/stats_system/index");
  console.log("✅ 方式2成功:", Object.keys(module2));
} catch (e) {
  console.log("❌ 方式2失败:", e.message);
}

try {
  const module3 = await import("./src/stats_system");
  console.log("✅ 方式3成功:", Object.keys(module3));
} catch (e) {
  console.log("❌ 方式3失败:", e.message);
}

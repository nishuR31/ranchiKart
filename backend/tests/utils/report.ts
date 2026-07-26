import app from "../../src/config/server.js";
import { writeFileSync } from "node:fs";

interface PerformanceRecord {
  method: string;
  url: string;
  durationMs: number;
  status: number;
}

const records: PerformanceRecord[] = [];

export const injectAndMeasure = async (options: any) => {
  const start = performance.now();
  const res = await app.inject(options);
  const end = performance.now();
  
  const durationMs = end - start;
  records.push({
    method: options.method,
    url: options.url,
    durationMs,
    status: res.statusCode,
  });
  
  return res;
};

export const generatePerformanceReport = () => {
  let markdown = "# API Performance Report\n\n";
  markdown += "| Method | URL | Status | Latency (ms) | Flag |\n";
  markdown += "|---|---|---|---|---|\n";
  
  for (const record of records) {
    const flag = record.durationMs > 500 ? "⚠️ SLOW" : "✅";
    markdown += `| ${record.method} | ${record.url} | ${record.status} | ${record.durationMs.toFixed(2)} | ${flag} |\n`;
  }
  
  writeFileSync("./performance-report.md", markdown);
};

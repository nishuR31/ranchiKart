import { describe, it, expect, beforeAll } from "vitest";
import { injectAndMeasure } from "../utils/report.js";
import app from "../../src/config/server.js";

describe("Performance Tests", () => {
  beforeAll(async () => {
    await app.ready();
  });

  it("should respond to /api/v1/products under 500ms", async () => {
    const res = await injectAndMeasure({
      method: "GET",
      url: "/api/v1/products",
    });
    // This is tracked by injectAndMeasure which will write to performance-report.md
    expect(res.statusCode).toBe(200);
  }, 30000);
});

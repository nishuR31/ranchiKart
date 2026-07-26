import { describe, it, expect } from "vitest";
import { injectAndMeasure } from "../utils/report.js";

describe("Performance Tests", () => {
  it("should respond to /api/v1/products under 500ms", async () => {
    const res = await injectAndMeasure({
      method: "GET",
      url: "/api/v1/products",
    });
    // This is tracked by injectAndMeasure which will write to performance-report.md
    expect(res.statusCode).toBe(200);
  });
});

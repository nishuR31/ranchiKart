import { describe, it, expect } from "vitest";
import app from "../../src/config/server.js";

describe("System Endpoints", () => {
  describe("GET /api/v1/ping", () => {
    it("should return pong and 200 OK", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/ping",
      });
      
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.message).toBe("pong");
    });
  });

  describe("GET /api/v1/health", () => {
    it("should return health status and 200 OK", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/health",
      });
      
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.message).toBe("Health OK");
    });
  });

  describe("GET /api/v1/version", () => {
    it("should return version and 200 OK", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/version",
      });
      
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.message).toContain("Version :");
      expect(body.data.currentVersion).toBeDefined();
    });
  });
});

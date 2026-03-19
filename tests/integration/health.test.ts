import request from "supertest";
import app from "../../apps/connectshyft-api/src/app";

describe("health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.body.ok).toBe(true);
  });
});

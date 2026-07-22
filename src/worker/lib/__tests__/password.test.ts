import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../password.js";

describe("password", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).toMatch(/^100000\$/);
    expect(await verifyPassword("secret123", hash)).toBe(true);
  });

  it("fails for a wrong password", async () => {
    const hash = await hashPassword("secret123");
    expect(await verifyPassword("wrongpass", hash)).toBe(false);
  });

  it("rejects passwords shorter than 6 characters", async () => {
    await expect(hashPassword("12345")).rejects.toThrow("at least 6");
  });

  it("rejects malformed or empty hashes", async () => {
    expect(await verifyPassword("secret123", "")).toBe(false);
    expect(await verifyPassword("secret123", "invalid")).toBe(false);
  });
});

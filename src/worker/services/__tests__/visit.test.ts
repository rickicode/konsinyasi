import { describe, expect, it } from "vitest";
import { ageColor, ageHours, haversineM } from "../visit.js";

describe("haversineM", () => {
  it("returns 0 for the same point", () => {
    expect(haversineM(-6.2, 106.8, -6.2, 106.8)).toBe(0);
  });

  it("returns a reasonable distance for two nearby points", () => {
    // Monas to Bundaran HI is roughly 2 km
    const distance = haversineM(-6.1754, 106.8272, -6.1933, 106.8228);
    expect(distance).toBeGreaterThan(1500);
    expect(distance).toBeLessThan(2500);
  });

  it("returns greater distance for far apart coordinates", () => {
    // Jakarta to Bandung ~120 km
    const distance = haversineM(-6.2, 106.8, -6.9147, 107.6098);
    expect(distance).toBeGreaterThan(100_000);
    expect(distance).toBeLessThan(150_000);
  });
});

describe("ageHours", () => {
  it("returns 0 for current time", () => {
    const now = new Date().toISOString();
    expect(ageHours(now)).toBeCloseTo(0, 1);
  });

  it("returns roughly 24 for one day ago", () => {
    const yesterday = new Date(Date.now() - 24 * 3_600_000).toISOString();
    expect(ageHours(yesterday)).toBeCloseTo(24, 1);
  });
});

describe("ageColor", () => {
  it("returns green for fresh cycles", () => {
    const now = new Date().toISOString();
    expect(ageColor(now)).toBe("green");
  });

  it("returns yellow between 72 and 96 hours", () => {
    const ts = new Date(Date.now() - 80 * 3_600_000).toISOString();
    expect(ageColor(ts)).toBe("yellow");
  });

  it("returns red at or beyond 96 hours", () => {
    const ts = new Date(Date.now() - 96 * 3_600_000).toISOString();
    expect(ageColor(ts)).toBe("red");
  });
});

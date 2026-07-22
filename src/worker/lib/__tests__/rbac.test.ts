import { describe, expect, it } from "vitest";
import { can } from "../rbac.js";

describe("rbac", () => {
  it("allows both roles to authenticate and read the dashboard", () => {
    expect(can("owner", "auth")).toBe(true);
    expect(can("staff", "auth")).toBe(true);
    expect(can("owner", "dashboard:read")).toBe(true);
    expect(can("staff", "dashboard:read")).toBe(true);
  });

  it("allows owner to manage users and denies staff", () => {
    expect(can("owner", "users:manage")).toBe(true);
    expect(can("staff", "users:manage")).toBe(false);
  });

  it("allows both roles to read/write visits but only owner to void", () => {
    expect(can("owner", "visit:read")).toBe(true);
    expect(can("staff", "visit:read")).toBe(true);
    expect(can("owner", "visit:write")).toBe(true);
    expect(can("staff", "visit:write")).toBe(true);
    expect(can("owner", "visit:void")).toBe(true);
    expect(can("staff", "visit:void")).toBe(false);
  });

  it("allows both roles to read settings but only owner to write", () => {
    expect(can("owner", "settings:read")).toBe(true);
    expect(can("staff", "settings:read")).toBe(true);
    expect(can("owner", "settings:write")).toBe(true);
    expect(can("staff", "settings:write")).toBe(false);
  });

  it("denies unknown roles and undefined", () => {
    expect(can("admin", "auth")).toBe(false);
    expect(can(undefined, "auth")).toBe(false);
  });

  it("reflects PRD owner-only financial/reporting capabilities", () => {
    expect(can("owner", "reports:read")).toBe(true);
    expect(can("staff", "reports:read")).toBe(false);
    expect(can("owner", "bom:write")).toBe(true);
    expect(can("staff", "bom:write")).toBe(false);
    expect(can("owner", "master:delete")).toBe(true);
    expect(can("staff", "master:delete")).toBe(false);
  });
});

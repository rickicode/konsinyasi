import { describe, expect, it } from "vitest";
import { allowedMasterSections, allowedTabs, isOwner } from "../role.js";

describe("role-aware UI helpers", () => {
  it("lets staff access core operational tabs only", () => {
    const tabs = allowedTabs("staff").map((t) => t.key);
    expect(tabs).toEqual(["beranda", "kunjungan", "warung", "master"]);
  });

  it("lets owner access all tabs", () => {
    const tabs = allowedTabs("owner").map((t) => t.key);
    expect(tabs).toEqual(["beranda", "kunjungan", "warung", "master", "pengaturan", "pengguna"]);
  });

  it("returns empty tabs for unknown roles", () => {
    expect(allowedTabs("admin")).toEqual([]);
    expect(allowedTabs("")).toEqual([]);
  });

  it("restricts master sections for staff to produk only", () => {
    const sections = allowedMasterSections("staff").map((s) => s.key);
    expect(sections).toEqual(["produk", "warung"]);
  });

  it("lets owner access all master sections", () => {
    const sections = allowedMasterSections("owner").map((s) => s.key);
    expect(sections).toEqual(["bahan", "produk", "warung"]);
  });

  it("identifies owner correctly", () => {
    expect(isOwner("owner")).toBe(true);
    expect(isOwner("staff")).toBe(false);
    expect(isOwner("")).toBe(false);
  });
});

import type { MiddlewareHandler } from "hono";
import { ForbiddenError } from "./errors.js";
import { requireAuth } from "./session.js";

export const ROLE_PERMISSIONS = {
  owner: new Set([
    "auth",
    "dashboard:read",
    "visit:read",
    "visit:write",
    "visit:void",
    "visit:override",
    "outlets:write",
    "settings:read",
    "settings:write",
    "reports:read",
    "products:read",
    "products:write",
    "bom:write",
    "raw_materials:read",
    "raw_materials:write",
    "users:manage",
    "master:delete",
  ]),
  staff: new Set([
    "auth",
    "dashboard:read",
    "visit:read",
    "visit:write",
    "outlets:write",
    "settings:read",
    "products:read",
    "products:write",
  ]),
} as const;

export type Role = keyof typeof ROLE_PERMISSIONS;
export type Capability = (typeof ROLE_PERMISSIONS)[Role] extends Set<infer C> ? C : never;

export function can(role: string | undefined, capability: Capability): boolean {
  if (!role || !(role in ROLE_PERMISSIONS)) return false;
  return ROLE_PERMISSIONS[role as Role].has(capability as never);
}

export function requirePermission(capability: Capability): MiddlewareHandler {
  return async (c, next) => {
    await requireAuth(c, async () => {});
    const user = c.get("user");
    if (!user || !can(user.role, capability)) {
      throw new ForbiddenError("Insufficient permissions");
    }
    await next();
  };
}

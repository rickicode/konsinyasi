import { Hono } from "hono";
import type { Env } from "./types.js";
import { AppError } from "./lib/errors.js";
import { requireAuth } from "./lib/session.js";
import { requirePermission } from "./lib/rbac.js";
import auth from "./routes/auth.js";
import users from "./routes/users.js";
import settings from "./routes/settings.js";

const app = new Hono<Env>();

app.get("/api/health", (c) => c.json({ status: "ok" }));

app.use("/api/auth/logout", requireAuth);
app.use("/api/auth/me", requireAuth);

app.use("/api/users/*", requirePermission("users:manage"));

app.get("/api/settings", requireAuth);
app.put("/api/settings/geofence", requirePermission("settings:write"));

app.route("/api/auth", auth);
app.route("/api/users", users);
app.route("/api/settings", settings);

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ code: err.code, message: err.message }, err.status as 200);
  }
  console.error(err);
  return c.json({ code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" }, 500);
});

// SPA shell is served by wrangler [assets] (directory = dist/client, binding = ASSETS).
// Uncomment if you need a Hono-side fallback for non-API GETs:
// app.get("*", async (c) => {
//   const url = new URL(c.req.url);
//   if (url.pathname.startsWith("/api/") || url.pathname === "/favicon.ico") {
//     return c.notFound();
//   }
//   // return c.env.ASSETS.fetch(c.req.raw);
//   return c.html("<!doctype html><html><body><div id=app></div></body></html>");
// });

export default app;

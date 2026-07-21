import { Hono } from "hono";

const app = new Hono();

app.get("/api/health", (c) => c.json({ status: "ok" }));

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

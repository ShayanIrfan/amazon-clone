// Serves the built client (client/dist) on :5173 with an SPA fallback and proxies /api to the
// API on :4000, so browser checks don't depend on the Vite dev server. Run after `npm run build -w client`.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";


const ROOT = path.resolve("D:/Projects/amazon-clone/client/dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".json": "application/json", ".ico": "image/x-icon", ".map": "application/json" };

http
  .createServer((req, res) => {
    if (req.url.startsWith("/api")) {
      const upstream = http.request({ host: "127.0.0.1", port: 4000, path: req.url, method: req.method, headers: req.headers }, (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers);
        up.pipe(res);
      });
      upstream.on("error", () => { res.writeHead(502); res.end("API unavailable"); });
      req.pipe(upstream);
      return;
    }
    const clean = decodeURIComponent(req.url.split("?")[0]);
    let file = path.join(ROOT, clean);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, "index.html");
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(5173, () => console.log("serving client/dist on http://localhost:5173 (api proxied to :4000)"));

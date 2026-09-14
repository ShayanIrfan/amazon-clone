#!/usr/bin/env node
// Builds a Vercel Build Output API v3 bundle in .vercel/output:
//   static/            the Vite client (client/dist)
//   functions/api.func the Express API, bundled with esbuild
//   config.json        routes: /api/* -> function, static files, SPA fallback
//
// Why not let Vercel compile the server itself: the project uses TypeScript 7,
// whose package no longer exposes the transpile API Vercel's Node builder
// relies on. Bundling here keeps the output identical for `vercel deploy`
// (remote build), Git deployments, and `vercel build && vercel deploy --prebuilt`.
import { build } from "esbuild";
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, ".vercel", "output");
const fnDir = path.join(out, "functions", "api.func");

await fs.rm(out, { recursive: true, force: true });

execSync("npm run build -w client", { cwd: root, stdio: "inherit" });
await fs.cp(path.join(root, "client", "dist"), path.join(out, "static"), { recursive: true });

await fs.mkdir(fnDir, { recursive: true });
await build({
  entryPoints: [path.join(root, "server", "src", "vercel.ts")],
  outfile: path.join(fnDir, "index.mjs"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  sourcemap: true,
  logLevel: "info",
  // CommonJS dependencies (express, mongoose, ...) still call require() inside
  // an ESM bundle.
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
  // Optional MongoDB driver add-ons, loaded in try/catch only when configured.
  external: [
    "kerberos",
    "@mongodb-js/zstd",
    "@aws-sdk/credential-providers",
    "gcp-metadata",
    "snappy",
    "socks",
    "aws4",
    "mongodb-client-encryption",
  ],
});

await fs.writeFile(
  path.join(fnDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      // Express parses bodies itself; the Stripe webhook needs the raw stream.
      shouldAddHelpers: false,
      shouldAddSourcemapSupport: true,
      maxDuration: 30,
    },
    null,
    2,
  ),
);

await fs.writeFile(
  path.join(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "^/api(?:/.*)?$", dest: "/api" },
        { src: "^/assets/(.*)$", headers: { "cache-control": "public, max-age=31536000, immutable" }, continue: true },
        { handle: "filesystem" },
        { src: "^/(.*)$", dest: "/index.html" },
      ],
    },
    null,
    2,
  ),
);

console.log(`\n[build-vercel] wrote ${path.relative(root, out)}`);

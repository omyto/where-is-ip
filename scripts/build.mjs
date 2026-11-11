import { copyFile } from "node:fs/promises";
import { build } from "esbuild";

const options = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  target: "es2022",
};

await Promise.all([
  build({ ...options, format: "esm", platform: "browser", outfile: "dist/index.js" }),
  build({ ...options, format: "cjs", platform: "node", outfile: "dist/index.cjs" }),
  build({
    ...options,
    entryPoints: ["src/browser.ts"],
    format: "iife",
    platform: "browser",
    outfile: "dist/index.global.js",
  }),
  copyFile("dist/index.d.ts", "dist/index.d.cts"),
]);

import fs from "node:fs";
import path from "node:path";

const src = path.resolve(
  "node_modules/jsdom/lib/jsdom/browser/default-stylesheet.css"
);

const outDir = path.resolve("dist/browser");
const dest = path.join(outDir, "default-stylesheet.css");

fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(src, dest);

console.log("Copied jsdom stylesheet:", dest);

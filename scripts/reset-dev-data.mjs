import { rm } from "node:fs/promises";
import path from "node:path";

const confirmed = process.argv.includes("--yes");
const dataDir = path.resolve(process.cwd(), "data");
const projectRoot = path.resolve(process.cwd());

if (!confirmed) {
  console.error("Refusing to reset local dev data without explicit confirmation.");
  console.error("This is destructive and removes ./data, including app.db and Markdown files.");
  console.error("Run: pnpm db:reset:dev -- --yes");
  process.exit(1);
}

if (!dataDir.startsWith(`${projectRoot}${path.sep}`) || path.basename(dataDir) !== "data") {
  console.error("Refusing to remove a path outside this project ./data directory.");
  process.exit(1);
}

await rm(dataDir, { recursive: true, force: true });
console.log("Deleted ./data. The next dev start will create a fresh local database.");

import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const sourcePath = resolve("dist/index.js");
const targetPath = resolve("dist/hass-benchkit-cli");
const shebang = "#!/usr/bin/env node\n";

const source = await readFile(sourcePath, "utf8");
const output =
  source.startsWith("#!") ? source : `${shebang}${source}`;

await mkdir(dirname(targetPath), { recursive: true });
await writeFile(targetPath, output, "utf8");
await chmod(targetPath, 0o755);

console.log(`Prepared release artifact at ${targetPath}`);

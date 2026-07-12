import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { aggregateNews } from "./news-lib.mjs";

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = process.env.NEWS_SOURCES_CONFIG || resolve(rootDirectory, "config", "news-sources.json");
const outputPath = process.env.NEWS_OUTPUT_PATH || resolve(rootDirectory, "data", "news.json");
const config = JSON.parse(await readFile(configPath, "utf8"));
try {
  const feed = await aggregateNews({ config });
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(feed, null, 2)}\n`, "utf8");
  console.log(`Generated ${feed.stories.length} stories at ${outputPath}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Aggregation failed.");
  if (Array.isArray(error?.sourceStatuses)) {
    console.table(error.sourceStatuses.map(({ stories: _stories, ...source }) => source));
  }
  process.exitCode = 1;
}

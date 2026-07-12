import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { aggregateNews, deduplicateStories, normalizeGdelt, normalizeHackerNews, normalizeRss } from "../scripts/news-lib.mjs";

const fixtureDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures");
const generatedAt = "2026-07-12T14:00:00.000Z";
const gdeltFixture = JSON.parse(await readFile(resolve(fixtureDirectory, "gdelt.json"), "utf8"));
const rssFixture = await readFile(resolve(fixtureDirectory, "rss.xml"), "utf8");

function jsonResponse(value) {
  return new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } });
}

function textResponse(value) {
  return new Response(value, { status: 200, headers: { "content-type": "application/xml" } });
}

const sourceConfig = { id: "bbc-world", name: "BBC News", topic: "world" };

test("normalizers filter invalid URLs and preserve source metadata", () => {
  const gdeltStories = normalizeGdelt(gdeltFixture, generatedAt);
  const hnStories = normalizeHackerNews([
    { id: 1, type: "story", title: "Open source database reaches a new milestone", url: "https://example.dev/database", time: 1_784_000_000 },
    { id: 2, type: "comment", title: "Ignored", time: 1_784_000_000 }
  ], generatedAt);
  const rssStories = normalizeRss(rssFixture, sourceConfig, generatedAt);

  assert.equal(gdeltStories.length, 2);
  assert.equal(gdeltStories[0].sourceType, "gdelt");
  assert.equal(hnStories.length, 1);
  assert.equal(hnStories[0].sourceType, "hacker-news");
  assert.equal(rssStories.length, 2);
  assert.equal(rssStories[0].source, "BBC News");
});

test("deduplication prefers approved RSSHub stories over matching GDELT stories", () => {
  const stories = [
    ...normalizeGdelt(gdeltFixture, generatedAt),
    ...normalizeRss(rssFixture, sourceConfig, generatedAt)
  ];
  const deduplicated = deduplicateStories(stories, 10);
  const climateStory = deduplicated.find((story) => story.title.startsWith("Climate researchers"));

  assert.equal(deduplicated.length, 3);
  assert.equal(climateStory.sourceType, "rsshub");
  assert.equal(climateStory.url, "https://example.com/climate-report");
});

test("aggregation retains healthy sources when one source fails", async () => {
  const config = {
    minimumStories: 3,
    maximumStories: 10,
    gdelt: { url: "https://gdelt.test/feed" },
    hackerNews: { baseUrl: "https://hn.test/v0", storyLimit: 2 },
    rsshub: { sources: [{ ...sourceConfig, route: "/bbc" }] }
  };
  const fetchImpl = async (url) => {
    if (url === "https://gdelt.test/feed") {
      return new Response("temporary upstream failure", { status: 503 });
    }
    if (url === "https://hn.test/v0/topstories.json") {
      return jsonResponse([1, 2]);
    }
    if (url === "https://hn.test/v0/item/1.json") {
      return jsonResponse({ id: 1, type: "story", title: "Developer community discusses a new release", url: "https://example.dev/release", time: 1_784_000_000 });
    }
    if (url === "https://hn.test/v0/item/2.json") {
      return jsonResponse({ id: 2, type: "story", title: "Security maintainers publish incident notes", url: "https://example.dev/security", time: 1_784_000_100 });
    }
    if (url === "http://rsshub.test/bbc") {
      return textResponse(rssFixture);
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const feed = await aggregateNews({ config, fetchImpl, discoveredAt: generatedAt, rsshubBaseUrl: "http://rsshub.test" });
  const gdeltStatus = feed.sources.find((source) => source.id === "gdelt");

  assert.equal(gdeltStatus.status, "failed");
  assert.equal(feed.stories.length, 4);
  assert.equal(feed.schemaVersion, 1);
  assert.equal(feed.generatedAt, generatedAt);
});

test("aggregation rejects a publish when the minimum story threshold is not met", async () => {
  const config = {
    minimumStories: 2,
    maximumStories: 10,
    gdelt: { url: "https://gdelt.test/feed" },
    hackerNews: { baseUrl: "https://hn.test/v0", storyLimit: 1 },
    rsshub: { sources: [] }
  };
  const fetchImpl = async (url) => {
    if (url === "https://gdelt.test/feed") {
      return new Response("temporary upstream failure", { status: 503 });
    }
    if (url === "https://hn.test/v0/topstories.json") {
      return jsonResponse([1]);
    }
    if (url === "https://hn.test/v0/item/1.json") {
      return jsonResponse({ id: 1, type: "story", title: "Only available story", url: "https://example.dev/only", time: 1_784_000_000 });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  await assert.rejects(
    () => aggregateNews({ config, fetchImpl, discoveredAt: generatedAt }),
    /Only 1 valid stories were collected/
  );
});

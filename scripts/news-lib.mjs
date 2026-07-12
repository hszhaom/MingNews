import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";

const REQUEST_TIMEOUT_MS = 12_000;
const SOURCE_PRIORITY = {
  rsshub: 3,
  gdelt: 2,
  "hacker-news": 1
};

const categoryRules = [
  ["technology", /ai|tech|software|cyber|chip|apple|google|microsoft|digital|internet|robot|openai/],
  ["business", /market|stock|economy|company|bank|trade|finance|business|oil|tariff/],
  ["science", /climate|health|science|research|space|medical|environment|weather/],
  ["culture", /film|music|book|media|art|sport|game|television|festival|culture/]
];

const xmlParser = new XMLParser({
  attributeNamePrefix: "@_",
  ignoreAttributes: false,
  parseTagValue: true,
  trimValues: true
});

function asArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function validUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function normalizeUrl(value) {
  const parsed = validUrl(value);
  if (!parsed) {
    return null;
  }
  const url = new URL(parsed);
  url.hash = "";
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"].forEach((parameter) => {
    url.searchParams.delete(parameter);
  });
  return url.href;
}

function sourceDomain(url, fallback) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return fallback;
  }
}

function toIsoDate(value, fallback) {
  if (typeof value === "string" && /^\d{8}T?\d{6}Z?$/.test(value)) {
    const compact = value.replace("T", "").replace("Z", "");
    const formatted = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}T${compact.slice(8, 10)}:${compact.slice(10, 12)}:${compact.slice(12, 14)}Z`;
    const timestamp = Date.parse(formatted);
    if (!Number.isNaN(timestamp)) {
      return new Date(timestamp).toISOString();
    }
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? fallback : new Date(timestamp).toISOString();
}

function cleanTitle(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizedTitle(value) {
  return cleanTitle(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function resolveAtomLink(value) {
  const links = asArray(value);
  const alternate = links.find((link) => typeof link === "object" && (!link["@_rel"] || link["@_rel"] === "alternate"));
  if (typeof alternate === "object") {
    return alternate["@_href"];
  }
  return typeof links[0] === "string" ? links[0] : links[0]?.["@_href"];
}

function createStory({ title, url, source, sourceType, topic, publishedAt, discoveredAt, sourceId }) {
  const normalizedUrl = normalizeUrl(url);
  const cleanedTitle = cleanTitle(title);
  if (!normalizedUrl || !cleanedTitle) {
    return null;
  }
  return {
    id: createHash("sha256").update(normalizedUrl).digest("hex").slice(0, 20),
    title: cleanedTitle,
    url: normalizedUrl,
    source: cleanTitle(source) || sourceDomain(normalizedUrl, "News source"),
    sourceType,
    sourceId,
    topic: topic || classifyStory(cleanedTitle),
    publishedAt: toIsoDate(publishedAt, discoveredAt),
    discoveredAt
  };
}

export function classifyStory(title) {
  const headline = cleanTitle(title).toLowerCase();
  const found = categoryRules.find(([, rule]) => rule.test(headline));
  return found ? found[0] : "world";
}

export function normalizeGdelt(payload, discoveredAt) {
  return asArray(payload?.articles)
    .map((item) => createStory({
      title: item.title,
      url: item.url,
      source: item.domain || sourceDomain(item.url, "News source"),
      sourceType: "gdelt",
      sourceId: "gdelt",
      topic: classifyStory(item.title),
      publishedAt: item.seendate,
      discoveredAt
    }))
    .filter(Boolean);
}

export function normalizeHackerNews(items, discoveredAt) {
  return items
    .filter((item) => item && item.type === "story" && item.title)
    .map((item) => createStory({
      title: item.title,
      url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
      source: item.url ? sourceDomain(item.url, "Hacker News") : "Hacker News",
      sourceType: "hacker-news",
      sourceId: "hacker-news",
      topic: "technology",
      publishedAt: Number.isFinite(item.time) ? new Date(item.time * 1000).toISOString() : discoveredAt,
      discoveredAt
    }))
    .filter(Boolean);
}

export function normalizeRss(xml, sourceConfig, discoveredAt) {
  const document = xmlParser.parse(xml);
  const rssChannel = document?.rss?.channel;
  const rssItems = asArray(rssChannel?.item).map((item) => ({
    title: item.title,
    url: item.link || item.guid?.["#text"] || item.guid,
    publishedAt: item.pubDate || item.date || item.updated
  }));
  const atomEntries = asArray(document?.feed?.entry).map((entry) => ({
    title: typeof entry.title === "object" ? entry.title["#text"] : entry.title,
    url: resolveAtomLink(entry.link),
    publishedAt: entry.updated || entry.published
  }));

  return [...rssItems, ...atomEntries]
    .map((item) => createStory({
      title: item.title,
      url: item.url,
      source: sourceConfig.name,
      sourceType: "rsshub",
      sourceId: sourceConfig.id,
      topic: sourceConfig.topic || classifyStory(item.title),
      publishedAt: item.publishedAt,
      discoveredAt
    }))
    .filter(Boolean);
}

export function deduplicateStories(stories, maximumStories) {
  const ordered = [...stories].sort((left, right) => {
    const sourceDifference = (SOURCE_PRIORITY[right.sourceType] || 0) - (SOURCE_PRIORITY[left.sourceType] || 0);
    if (sourceDifference !== 0) {
      return sourceDifference;
    }
    return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
  });
  const knownUrls = new Set();
  const knownTitles = new Set();
  const deduplicated = ordered.filter((story) => {
    const title = normalizedTitle(story.title);
    if (knownUrls.has(story.url) || knownTitles.has(title)) {
      return false;
    }
    knownUrls.add(story.url);
    knownTitles.add(title);
    return true;
  });
  return deduplicated
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
    .slice(0, maximumStories);
}

async function request(url, fetchImpl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, { signal: controller.signal, headers: { "user-agent": "MingJournalBot/1.0 (+https://your-domain.com/)" } });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function getJson(url, fetchImpl) {
  return (await request(url, fetchImpl)).json();
}

async function getText(url, fetchImpl) {
  return (await request(url, fetchImpl)).text();
}

function joinUrl(baseUrl, path) {
  return new URL(path.replace(/^\//, ""), `${baseUrl.replace(/\/$/, "")}/`).href;
}

export async function aggregateNews({ config, fetchImpl = fetch, discoveredAt = new Date().toISOString(), rsshubBaseUrl = process.env.RSSHUB_BASE_URL || "http://127.0.0.1:1200" }) {
  const jobs = [
    {
      id: "gdelt",
      sourceType: "gdelt",
      run: async () => normalizeGdelt(await getJson(config.gdelt.url, fetchImpl), discoveredAt)
    },
    {
      id: "hacker-news",
      sourceType: "hacker-news",
      run: async () => {
        const ids = (await getJson(joinUrl(config.hackerNews.baseUrl, "topstories.json"), fetchImpl)).slice(0, config.hackerNews.storyLimit);
        const results = await Promise.allSettled(ids.map((id) => getJson(joinUrl(config.hackerNews.baseUrl, `item/${id}.json`), fetchImpl)));
        return normalizeHackerNews(results.filter((result) => result.status === "fulfilled").map((result) => result.value), discoveredAt);
      }
    },
    ...config.rsshub.sources.map((source) => ({
      id: source.id,
      sourceType: "rsshub",
      run: async () => normalizeRss(await getText(joinUrl(rsshubBaseUrl, source.route), fetchImpl), source, discoveredAt)
    }))
  ];

  const completed = await Promise.all(jobs.map(async (job) => {
    try {
      const stories = await job.run();
      return { id: job.id, sourceType: job.sourceType, status: stories.length ? "ok" : "empty", count: stories.length, stories };
    } catch (error) {
      return { id: job.id, sourceType: job.sourceType, status: "failed", count: 0, stories: [], error: error instanceof Error ? error.message : "Request failed" };
    }
  }));

  const stories = deduplicateStories(completed.flatMap((result) => result.stories), config.maximumStories);
  if (stories.length < config.minimumStories) {
    const error = new Error(`Only ${stories.length} valid stories were collected; at least ${config.minimumStories} are required.`);
    error.sourceStatuses = completed.map(({ stories: _stories, ...source }) => source);
    throw error;
  }

  return {
    schemaVersion: 1,
    generatedAt: discoveredAt,
    sources: completed.map(({ stories: _stories, error: _error, ...source }) => source),
    stories
  };
}

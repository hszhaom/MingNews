const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const newsBoard = document.querySelector("#board");
const feedStatus = document.querySelector("#feed-status");
const storyCount = document.querySelector("#story-count");
const sourceCount = document.querySelector("#source-count");
const sourceTabs = document.querySelector("#source-tabs");
const sourceHealth = document.querySelector("#source-health");
const refreshButton = document.querySelector("#refresh-feed");
const topicButtons = document.querySelectorAll("[data-topic]");

const sourceLabels = {
  gdelt: "Global media",
  rsshub: "Publisher feeds",
  "hacker-news": "Hacker News"
};

const state = {
  stories: [],
  sources: [],
  activeTopic: "all",
  activeSource: "all"
};

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

function text(value) {
  return String(value || "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;"
  }[character]));
}

function validUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Now";
  }
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function makeReadingLink(story) {
  const parameters = new URLSearchParams({ title: story.title, source: story.source, url: story.url, topic: story.topic });
  return `article.html?${parameters.toString()}`;
}

function sourceKey(story) {
  if (story.sourceType === "gdelt" || story.sourceType === "hacker-news") {
    return story.sourceType;
  }
  return story.sourceId || story.source.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function sourceName(story) {
  return story.sourceType === "rsshub" ? story.source : (sourceLabels[story.sourceType] || story.source);
}

function normalizeStories(stories) {
  return (Array.isArray(stories) ? stories : [])
    .map((story) => ({
      id: story.id,
      title: String(story.title || "").trim(),
      url: validUrl(story.url),
      source: String(story.source || "News source").trim(),
      sourceId: String(story.sourceId || "").trim(),
      sourceType: String(story.sourceType || "").trim(),
      topic: String(story.topic || "world").trim().toLowerCase(),
      publishedAt: story.publishedAt
    }))
    .filter((story) => story.title && story.url);
}

function filteredStories() {
  return state.stories.filter((story) => {
    const topicMatch = state.activeTopic === "all" || story.topic === state.activeTopic;
    const sourceMatch = state.activeSource === "all" || sourceKey(story) === state.activeSource;
    return topicMatch && sourceMatch;
  });
}

function storyGroups(stories) {
  const groups = new Map();
  stories.forEach((story) => {
    const key = sourceKey(story);
    if (!groups.has(key)) {
      groups.set(key, { key, name: sourceName(story), type: story.sourceType, stories: [] });
    }
    groups.get(key).stories.push(story);
  });
  return [...groups.values()]
    .map((group) => ({ ...group, stories: group.stories.sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt)) }))
    .sort((left, right) => right.stories.length - left.stories.length || left.name.localeCompare(right.name));
}

function sourceMark(group) {
  if (group.type === "gdelt") return "G";
  if (group.type === "hacker-news") return "HN";
  return text(group.name.slice(0, 1).toUpperCase());
}

function renderSourceTabs() {
  if (!sourceTabs) return;
  const groups = storyGroups(state.stories);
  const availableKeys = new Set(groups.map((group) => group.key));
  if (state.activeSource !== "all" && !availableKeys.has(state.activeSource)) state.activeSource = "all";
  sourceTabs.innerHTML = `
    <button class="source-filter ${state.activeSource === "all" ? "is-active" : ""}" type="button" data-source="all">All feeds</button>
    ${groups.map((group) => `<button class="source-filter ${state.activeSource === group.key ? "is-active" : ""}" type="button" data-source="${text(group.key)}"><span class="feed-dot feed-${text(group.type)}" aria-hidden="true"></span>${text(group.name)}</button>`).join("")}`;
}

function renderBoard() {
  if (!newsBoard) return;
  const groups = storyGroups(filteredStories());
  if (!groups.length) {
    newsBoard.innerHTML = `<div class="board-empty"><strong>No matching stories.</strong><p>Choose another topic or feed.</p></div>`;
    return;
  }
  newsBoard.innerHTML = groups.map((group) => `
    <section class="source-board source-${text(group.type)}" aria-labelledby="${text(group.key)}-title">
      <header class="source-board-header">
        <div class="source-title"><span class="source-mark">${sourceMark(group)}</span><div><h2 id="${text(group.key)}-title">${text(group.name)}</h2><p>${text(group.type === "rsshub" ? "Approved publisher feed" : sourceLabels[group.type] || "News source")}</p></div></div>
        <span class="source-total">${group.stories.length}</span>
      </header>
      <ol class="ranked-stories">
        ${group.stories.slice(0, 10).map((story, index) => `
          <li>
            <span class="rank rank-${index + 1}">${index + 1}</span>
            <a href="${makeReadingLink(story)}"><span class="ranked-title">${text(story.title)}</span><span class="ranked-meta">${text(story.source)} · ${text(formatDate(story.publishedAt))}</span></a>
          </li>`).join("")}
      </ol>
      <footer><button class="source-board-filter" type="button" data-board-source="${text(group.key)}">View this feed <span aria-hidden="true">&rarr;</span></button></footer>
    </section>`).join("");
}

function renderSourceHealth() {
  if (!sourceHealth) return;
  const labels = {
    gdelt: "GDELT",
    "hacker-news": "Hacker News",
    "bbc-world": "BBC News",
    "guardian-world": "The Guardian",
    "npr-news": "NPR News",
    "al-jazeera": "Al Jazeera"
  };
  sourceHealth.innerHTML = state.sources.length
    ? state.sources.map((source) => {
      const fallback = source.status === "fallback";
      const warning = source.status === "failed" || source.status === "empty";
      const label = labels[source.id] || source.id || source.sourceType;
      const stateLabel = fallback ? "Official RSS" : warning ? "Unavailable" : "Live";
      return `<div title="${text(stateLabel)}"><span class="health-dot ${warning ? "is-warning" : fallback ? "is-fallback" : ""}"></span><span>${text(label)}<em>${text(stateLabel)}</em></span><strong>${Number(source.count || 0)}</strong></div>`;
    }).join("")
    : "<p>No feed report published yet.</p>";
}

function renderStats() {
  if (storyCount) storyCount.textContent = String(state.stories.length);
  if (sourceCount) sourceCount.textContent = String(storyGroups(state.stories).length);
}

function renderAll() {
  renderStats();
  renderSourceTabs();
  renderSourceHealth();
  renderBoard();
}

async function loadPublishedStories() {
  if (feedStatus) feedStatus.textContent = "Loading published update";
  if (refreshButton) refreshButton.disabled = true;
  try {
    const response = await fetch(`data/news.json?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const feed = await response.json();
    state.stories = normalizeStories(feed.stories);
    state.sources = Array.isArray(feed.sources) ? feed.sources : [];
    if (feedStatus) feedStatus.textContent = feed.generatedAt ? `Published ${formatDate(feed.generatedAt)}` : "Awaiting first scheduled refresh";
  } catch {
    state.stories = [];
    state.sources = [];
    if (feedStatus) feedStatus.textContent = "Published feed is temporarily unavailable";
  } finally {
    if (refreshButton) refreshButton.disabled = false;
  }
  renderAll();
}

topicButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const topic = button.dataset.topic;
    if (!topic) return;
    state.activeTopic = topic;
    topicButtons.forEach((item) => item.classList.toggle("is-active", item.dataset.topic === topic));
    renderBoard();
  });
});

sourceTabs?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-source]");
  if (!button) return;
  state.activeSource = button.dataset.source || "all";
  renderSourceTabs();
  renderBoard();
});

newsBoard?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-board-source]");
  if (!button) return;
  state.activeSource = button.dataset.boardSource || "all";
  renderSourceTabs();
  renderBoard();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

refreshButton?.addEventListener("click", loadPublishedStories);
loadPublishedStories();

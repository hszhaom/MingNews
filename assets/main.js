const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const newsletterForm = document.querySelector(".newsletter-form");
const latestList = document.querySelector("#latest");
const featuredStory = document.querySelector("#featured-story");
const feedStatus = document.querySelector("#feed-status");
const topicButtons = document.querySelectorAll("[data-topic]");

const feedState = {
  stories: [],
  activeTopic: "all"
};

const sourceLabels = {
  gdelt: "GDELT",
  rsshub: "RSSHub",
  "hacker-news": "Hacker News"
};

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

if (newsletterForm) {
  newsletterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const note = newsletterForm.querySelector(".form-note");
    const input = newsletterForm.querySelector("input[type='email']");
    if (note && input instanceof HTMLInputElement) {
      note.textContent = "Thank you. Connect your email provider to activate subscriptions.";
      input.value = "";
    }
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
    return "Just now";
  }
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function makeReadingLink(story) {
  const parameters = new URLSearchParams({
    title: story.title,
    source: story.source,
    url: story.url,
    topic: story.topic
  });
  return `article.html?${parameters.toString()}`;
}

function normalizeStoredStories(stories) {
  return (Array.isArray(stories) ? stories : [])
    .map((story) => ({
      title: String(story.title || "").trim(),
      url: validUrl(story.url),
      source: String(story.source || "News source").trim(),
      topic: String(story.topic || "world").trim().toLowerCase(),
      date: story.publishedAt,
      origin: sourceLabels[story.sourceType] || "News desk"
    }))
    .filter((story) => story.title && story.url);
}

function renderStories() {
  if (!latestList || !featuredStory) {
    return;
  }
  const visibleStories = feedState.stories.filter((story) => feedState.activeTopic === "all" || story.topic === feedState.activeTopic);
  const [lead, ...rest] = visibleStories;

  if (!lead) {
    featuredStory.innerHTML = `<div class="story-wash" aria-hidden="true"></div><div class="featured-story-content"><p class="story-meta">No published update</p><h3>The desk is awaiting its first refresh.</h3><p>The next scheduled aggregation will publish source-linked stories here.</p></div>`;
    latestList.innerHTML = "";
    return;
  }

  featuredStory.innerHTML = `
    <div class="story-wash" aria-hidden="true"></div>
    <div class="featured-story-content">
      <p class="story-meta"><span>${text(lead.topic)}</span><span>${text(lead.source)}</span><span>${text(formatDate(lead.date))}</span></p>
      <h3><a href="${makeReadingLink(lead)}">${text(lead.title)}</a></h3>
      <p>Discovered through ${text(lead.origin)}. Read the original reporting through the source link on the story page.</p>
      <a class="story-link" href="${makeReadingLink(lead)}">Open reading note <span aria-hidden="true">&rarr;</span></a>
    </div>`;

  latestList.innerHTML = rest.map((story) => `
    <article class="article-card">
      <div class="article-card-main">
        <p class="story-meta"><span>${text(story.topic)}</span><span>${text(story.source)}</span></p>
        <h3><a href="${makeReadingLink(story)}">${text(story.title)}</a></h3>
      </div>
      <div class="article-card-side">
        <time datetime="${text(story.date)}">${text(formatDate(story.date))}</time>
        <a href="${makeReadingLink(story)}" aria-label="Read note for ${text(story.title)}">Read <span aria-hidden="true">&rarr;</span></a>
      </div>
    </article>`).join("");
}

async function loadPublishedStories() {
  if (!latestList || !featuredStory) {
    return;
  }
  if (feedStatus) {
    feedStatus.textContent = "Loading the latest published refresh";
  }

  try {
    const response = await fetch(`data/news.json?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    const feed = await response.json();
    feedState.stories = normalizeStoredStories(feed.stories);
    const activeSources = (Array.isArray(feed.sources) ? feed.sources : []).filter((source) => source.status === "ok").length;
    if (feedStatus) {
      feedStatus.textContent = feed.generatedAt
        ? `Last published refresh ${formatDate(feed.generatedAt)}${activeSources ? ` from ${activeSources} source groups` : ""}`
        : "The desk is awaiting its first scheduled refresh.";
    }
  } catch {
    feedState.stories = [];
    if (feedStatus) {
      feedStatus.textContent = "The latest published refresh is temporarily unavailable.";
    }
  }
  renderStories();
}

topicButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const topic = button.dataset.topic;
    if (!topic) {
      return;
    }
    feedState.activeTopic = topic;
    topicButtons.forEach((item) => item.classList.toggle("is-active", item.dataset.topic === topic));
    renderStories();
    document.querySelector("#latest")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

loadPublishedStories();

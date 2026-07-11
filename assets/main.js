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

const gdeltUrl = "https://api.gdeltproject.org/api/v2/doc/doc?query=sourcelang%3Aenglish&mode=artlist&format=json&maxrecords=18&sort=datedesc";
const hackerNewsUrl = "https://hn.algolia.com/api/v1/search_by_date?tags=front_page&hitsPerPage=18";

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

function classifyStory(title) {
  const headline = title.toLowerCase();
  const categories = [
    ["technology", /ai|tech|software|cyber|chip|apple|google|microsoft|digital|internet|robot|openai/],
    ["business", /market|stock|economy|company|bank|trade|finance|business|oil|tariff/],
    ["science", /climate|health|science|research|space|medical|environment|weather/],
    ["culture", /film|music|book|media|art|sport|game|television|festival|culture/]
  ];
  const found = categories.find(([, pattern]) => pattern.test(headline));
  return found ? found[0] : "world";
}

function getDomain(url, fallback) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return fallback;
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

function normalizeGdelt(payload) {
  return (payload.articles || [])
    .filter((item) => item.title && validUrl(item.url))
    .map((item) => ({
      title: item.title.trim(),
      url: validUrl(item.url),
      source: item.domain || getDomain(item.url, "News source"),
      date: item.seendate || new Date().toISOString(),
      topic: classifyStory(item.title),
      origin: "GDELT"
    }));
}

function normalizeHackerNews(payload) {
  return (payload.hits || [])
    .filter((item) => item.title && validUrl(item.url))
    .map((item) => ({
      title: item.title.trim(),
      url: validUrl(item.url),
      source: getDomain(item.url, "Hacker News"),
      date: item.created_at || new Date().toISOString(),
      topic: classifyStory(item.title),
      origin: "Hacker News"
    }));
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

function renderStories() {
  if (!latestList || !featuredStory) {
    return;
  }

  const visibleStories = feedState.stories.filter((story) => feedState.activeTopic === "all" || story.topic === feedState.activeTopic);
  const [lead, ...rest] = visibleStories;

  if (!lead) {
    featuredStory.innerHTML = `<div class="story-wash" aria-hidden="true"></div><div class="featured-story-content"><p class="story-meta">No matching stories</p><h3>Try another topic.</h3><p>The live desk may not have a matching item at this moment.</p></div>`;
    latestList.innerHTML = "";
    return;
  }

  featuredStory.innerHTML = `
    <div class="story-wash" aria-hidden="true"></div>
    <div class="featured-story-content">
      <p class="story-meta"><span>${text(lead.topic)}</span><span>${text(lead.source)}</span><span>${text(formatDate(lead.date))}</span></p>
      <h3><a href="${makeReadingLink(lead)}">${text(lead.title)}</a></h3>
      <p>A live item from ${text(lead.origin)}. Read the original reporting through the source link on the story page.</p>
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

async function loadLiveStories() {
  if (!latestList || !featuredStory) {
    return;
  }

  if (feedStatus) {
    feedStatus.textContent = "Updating from public news sources";
  }

  try {
    const gdelt = await fetchJson(gdeltUrl);
    feedState.stories = normalizeGdelt(gdelt);
    if (feedState.stories.length < 4) {
      throw new Error("GDELT returned too few stories");
    }
    if (feedStatus) {
      feedStatus.textContent = `Live desk updated ${new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date())} via GDELT`;
    }
  } catch {
    try {
      const hackerNews = await fetchJson(hackerNewsUrl);
      feedState.stories = normalizeHackerNews(hackerNews);
      if (feedStatus) {
        feedStatus.textContent = "Live desk is using the Hacker News public API";
      }
    } catch {
      feedState.stories = [];
      if (feedStatus) {
        feedStatus.textContent = "Live sources are temporarily unavailable. Please refresh shortly.";
      }
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

loadLiveStories();

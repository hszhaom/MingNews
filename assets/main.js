const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const newsletterForm = document.querySelector(".newsletter-form");
const trendList = document.querySelector("#trend-list");
const searchForm = document.querySelector(".trend-search");
const searchInput = document.querySelector("#trend-query");
const filterButtons = document.querySelectorAll(".filter-pill");

const trends = [
  {
    rank: 1,
    title: "AI video generators reshape creator workflows",
    source: "YouTube",
    sourceUrl: "https://www.youtube.com/feed/trending",
    category: "technology",
    region: "global",
    window: "24h",
    score: 98,
    momentum: "+42%",
    summary: "Tutorials, comparisons, and creator reactions are driving discovery across video search and social clips.",
    tags: ["AI", "creator economy", "video"]
  },
  {
    rank: 2,
    title: "New open-source agent framework gains developer attention",
    source: "GitHub Trending",
    sourceUrl: "https://github.com/trending",
    category: "technology",
    region: "global",
    window: "24h",
    score: 94,
    momentum: "+31%",
    summary: "Repository stars, forks, and Hacker News discussion suggest strong early adoption in the developer community.",
    tags: ["open source", "agents", "developers"]
  },
  {
    rank: 3,
    title: "Indie productivity app launches with viral demo",
    source: "Product Hunt",
    sourceUrl: "https://www.producthunt.com/",
    category: "business",
    region: "us",
    window: "24h",
    score: 89,
    momentum: "+27%",
    summary: "Maker communities are responding to concise demos, founder replies, and practical workflow screenshots.",
    tags: ["SaaS", "productivity", "startup"]
  },
  {
    rank: 4,
    title: "Streaming series finale sparks global debate",
    source: "X",
    sourceUrl: "https://x.com/explore",
    category: "entertainment",
    region: "global",
    window: "24h",
    score: 87,
    momentum: "+24%",
    summary: "Conversation is moving quickly across memes, reviews, reaction videos, and entertainment news recaps.",
    tags: ["streaming", "TV", "fan discussion"]
  },
  {
    rank: 5,
    title: "PC game climbs weekend player charts",
    source: "Steam",
    sourceUrl: "https://store.steampowered.com/charts/",
    category: "gaming",
    region: "global",
    window: "7d",
    score: 84,
    momentum: "+19%",
    summary: "Discount timing, streamer coverage, and patch notes are combining into renewed player interest.",
    tags: ["gaming", "Steam", "Twitch"]
  },
  {
    rank: 6,
    title: "Travel safety searches rise before holiday season",
    source: "Google Trends",
    sourceUrl: "https://trends.google.com/trends/",
    category: "business",
    region: "us",
    window: "7d",
    score: 81,
    momentum: "+16%",
    summary: "Search demand suggests readers want practical explainers, airport guidance, and destination-specific updates.",
    tags: ["travel", "search intent", "consumer"]
  },
  {
    rank: 7,
    title: "Fitness challenge spreads through short-video platforms",
    source: "TikTok Creative Center",
    sourceUrl: "https://ads.tiktok.com/business/creativecenter/",
    category: "entertainment",
    region: "global",
    window: "24h",
    score: 78,
    momentum: "+14%",
    summary: "Creator templates, music reuse, and easy participation are pushing the format beyond one platform.",
    tags: ["TikTok", "fitness", "creator trends"]
  },
  {
    rank: 8,
    title: "Major football transfer rumor dominates fan communities",
    source: "Reddit",
    sourceUrl: "https://www.reddit.com/",
    category: "sports",
    region: "uk",
    window: "24h",
    score: 75,
    momentum: "+12%",
    summary: "Subreddit threads show high comment velocity, but verification remains mixed across primary sources.",
    tags: ["football", "Reddit", "sports"]
  },
  {
    rank: 9,
    title: "Cybersecurity breach explainer climbs tech discussions",
    source: "Hacker News",
    sourceUrl: "https://news.ycombinator.com/",
    category: "technology",
    region: "global",
    window: "30d",
    score: 72,
    momentum: "+9%",
    summary: "Readers are looking for clear summaries of impact, mitigation steps, and vendor response timelines.",
    tags: ["security", "Hacker News", "risk"]
  },
  {
    rank: 10,
    title: "K-pop comeback drives search, shorts, and fan edits",
    source: "YouTube",
    sourceUrl: "https://www.youtube.com/feed/trending",
    category: "entertainment",
    region: "asia",
    window: "24h",
    score: 70,
    momentum: "+8%",
    summary: "Music video views, fan edits, lyric searches, and reaction content are reinforcing the topic across platforms.",
    tags: ["music", "YouTube", "K-pop"]
  }
];

const state = {
  category: "all",
  region: "global",
  window: "24h",
  query: ""
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
      note.textContent = "Thanks. Connect this form to your email service before production launch.";
      input.value = "";
    }
  });
}

function matchesFilters(item) {
  const categoryMatch = state.category === "all" || item.category === state.category;
  const regionMatch = state.region === "global" || item.region === "global" || item.region === state.region;
  const windowMatch = item.window === state.window || state.window === "30d";
  const haystack = [item.title, item.source, item.category, item.region, item.summary, ...item.tags]
    .join(" ")
    .toLowerCase();
  const queryMatch = !state.query || haystack.includes(state.query.toLowerCase());

  return categoryMatch && regionMatch && windowMatch && queryMatch;
}

function renderTrends() {
  if (!trendList) {
    return;
  }

  const filtered = trends.filter(matchesFilters);

  trendList.innerHTML = filtered.length
    ? filtered.map((item) => `
        <article class="trend-item">
          <div class="trend-rank">${item.rank}</div>
          <div class="trend-main">
            <div class="trend-meta">
              <span>${item.source}</span>
              <span>${item.category}</span>
              <span>${item.region.toUpperCase()}</span>
            </div>
            <h3>${item.title}</h3>
            <p>${item.summary}</p>
            <div class="tag-row">
              ${item.tags.map((tag) => `<span>${tag}</span>`).join("")}
            </div>
          </div>
          <div class="trend-score" aria-label="Trend score">
            <strong>${item.score}</strong>
            <span>${item.momentum}</span>
            <a href="${item.sourceUrl}" target="_blank" rel="nofollow noopener">Source</a>
          </div>
        </article>
      `).join("")
    : `<p class="empty-state">No matching trends. Try another source, region, or keyword.</p>`;
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const group = button.closest("[data-filter-group]");
    if (!group) {
      return;
    }

    group.querySelectorAll(".filter-pill").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    state[group.dataset.filterGroup] = button.dataset.filter || "all";
    renderTrends();
  });
});

if (searchForm && searchInput) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.query = searchInput.value.trim();
    renderTrends();
  });

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value.trim();
    renderTrends();
  });
}

renderTrends();

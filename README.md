# Ming Trends

Ming Trends is a static English hot-trends dashboard inspired by TopHub-style ranking sites and adapted for overseas traffic sources.

## What is included

- Dashboard-style homepage for global hot topics.
- Source matrix for Google Trends, Reddit, YouTube, X, Hacker News, Product Hunt, GitHub Trending, TikTok Creative Center, Steam, Twitch, and related platforms.
- Client-side filters for category, region, time window, and keyword search.
- `sources.html` guide for SEO-friendly source coverage and traffic strategy.
- Trust pages required for AdSense review: About, Contact, Privacy Policy, Terms of Use, and Editorial Policy.
- SEO files: `robots.txt`, `sitemap.xml`, `rss.xml`, and a noindex search page.
- Reserved AdSense placements and `ads.txt` placeholder.

## Launch checklist

1. Replace every `https://your-domain.com` value with the production domain.
2. Replace `pub-XXXXXXXXXXXXXXXX` in `ads.txt` with the real Google AdSense publisher ID after approval.
3. Replace placeholder email addresses such as `editor@your-domain.com` with monitored inboxes.
4. Replace demo trend data in `assets/main.js` with API-backed data or a scheduled static build.
5. Add source attribution, update timestamps, and editorial summaries to each generated trend page.
6. Add the deployed domain to Google Search Console and submit `sitemap.xml`.

## Local preview

Open `index.html` directly in a browser, or run a local static server from the project root:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Data strategy

The current implementation uses static demo data so the site can be deployed immediately. For production, use a scheduled job to normalize source feeds into a common structure:

```json
{
  "title": "Trend title",
  "source": "Google Trends",
  "sourceUrl": "https://trends.google.com/trends/",
  "category": "technology",
  "region": "global",
  "window": "24h",
  "score": 98,
  "momentum": "+42%",
  "summary": "Original editorial context and source attribution.",
  "tags": ["AI", "search intent"]
}
```

## AdSense notes

Do not publish scraped lists without added value. For better AdSense and SEO quality, each trend page should include original summaries, source attribution, update time, neutral context, and links to policy pages.


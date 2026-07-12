# Ming Journal

Ming Journal is an English news-reading interface with live discovery from public, no-key APIs. It is designed around readable article cards, transparent source links, and original editorial context rather than copied news content.

## What is included

- Responsive white-and-ink reading interface with topic tags, article cards, an editorial sidebar, and AdSense-ready placements.
- Static news aggregation via GDELT, a self-hosted RSSHub container with official publisher-RSS fallback, and Hacker News' official Firebase API.
- Client-side topic filters and source-linked reading notes.
- `article.html` reading page with a table of contents, tags, original-source CTA, and browser-local demo comments.
- `sources.html` guide explaining the public data sources and attribution model.
- Trust pages required for AdSense review: About, Contact, Privacy Policy, Terms of Use, and Editorial Policy.
- SEO files: `robots.txt`, `sitemap.xml`, `rss.xml`, and a noindex search page.
- Reserved AdSense placements and `ads.txt` placeholder.

## Launch checklist

1. Replace every `https://your-domain.com` value with the production domain.
2. Replace `pub-XXXXXXXXXXXXXXXX` in `ads.txt` with the real Google AdSense publisher ID after approval.
3. Replace placeholder email addresses such as `editor@your-domain.com` with monitored inboxes.
4. In the repository Pages settings, set the deployment source to `GitHub Actions`.
5. Add source attribution, update timestamps, and original editorial summaries to each published article page.
6. Add the deployed domain to Google Search Console and submit `sitemap.xml`.

## Local preview

Run a local static server from the project root:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Data strategy

GitHub Actions runs every 30 minutes, starts an ephemeral RSSHub container, fetches GDELT plus Hacker News' official Firebase API, and publishes the normalized JSON to both `main` and the Pages artifact. Publisher feeds use RSSHub first and fall back to the official BBC, The Guardian, NPR, or Al Jazeera RSS endpoint when an RSSHub route is unavailable. The browser requests only the same-origin `data/news.json` file.

```json
{
  "title": "Original headline",
  "source": "Original publisher",
  "url": "https://publisher.example/story",
  "sourceType": "gdelt",
  "publishedAt": "2026-07-11T09:00:00Z",
  "topic": "technology"
}
```

## AdSense notes

Do not publish copied or scraped articles. For better AdSense and SEO quality, each article page should include original summaries, source attribution, update time, neutral context, and links to policy pages.

# Ming News

Ming News is a static English news website scaffold designed for search visibility, reader trust, and Google AdSense readiness.

## What is included

- Responsive homepage with original English editorial content.
- Six article pages with unique titles, meta descriptions, canonical URLs, and `NewsArticle` structured data.
- Required trust pages: About, Contact, Privacy Policy, Terms of Use, and Editorial Policy.
- SEO files: `robots.txt`, `sitemap.xml`, `rss.xml`, and a noindex search page.
- Reserved advertisement blocks and an `ads.txt` placeholder.
- Local generated hero image at `assets/hero-newsroom.png`.

## Launch checklist

1. Replace every `https://your-domain.com` value with the production domain.
2. Replace `pub-XXXXXXXXXXXXXXXX` in `ads.txt` with the real Google AdSense publisher ID after approval.
3. Replace placeholder email addresses such as `editor@your-domain.com` with monitored inboxes.
4. Connect the newsletter form to an email service or remove it before launch.
5. Add the deployed domain to Google Search Console and submit `sitemap.xml`.
6. Keep publishing original articles before applying for AdSense. Thin or copied content can hurt approval.

## Local preview

Open `index.html` directly in a browser, or run a local static server from the project root:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## AdSense notes

The site includes the policy pages and ad placeholders that reviewers expect, but final approval still depends on production content quality, domain history, navigation clarity, traffic quality, and compliance with Google Publisher Policies.

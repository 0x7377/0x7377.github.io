# Seonwoo Kim — Academic Website

A single-page academic homepage built with [Astro](https://astro.build) and deployed to GitHub Pages.

## Editing content

All content lives in `src/data/`. You don't need to touch any code to update the site.

| File | What it holds |
|---|---|
| `profile.yaml` | Name, intro paragraphs, contact links, photo, Writing link |
| `news.yaml` | News items, newest first |
| `publications.bib` | Publications (BibTeX plus a few site-only fields, explained at the top of the file) |
| `projects.yaml` | Project rows |
| `cv.yaml` | Education, work experience, teaching, awards, certifications |

- Text fields accept inline Markdown, for example `[link text](https://…)`.
- Put images such as the profile photo in `public/images/` and reference them as `/images/…`.
- A typo or missing required field stops the build with a message that names the file and field.

## Commands

The project uses Node 24 (see `.nvmrc`; run `nvm use`).

```bash
npm install        # first time only
npm run dev        # local preview at http://localhost:4321 with live reload
npm run build      # production build into dist/
npm run preview    # serve dist/ locally
```

In `npm run dev`, a missing profile photo shows a grey placeholder. The production build hides it.

## Deployment

`.github/workflows/deploy.yml` builds the site and publishes it to GitHub Pages on every push to `main`.

One-time setup:

1. The repository is `0x7377/0x7377.github.io`, and `site` in `astro.config.mjs` is `https://0x7377.github.io`.
2. Repository Settings → Pages → Source is "GitHub Actions".

The blog is a separate Quartz site in `0x7377/blog`, served at `https://0x7377.github.io/blog/`. `src/pages/404.astro` forwards old blog URLs from the site root to `/blog/`.

## Project docs

`docs/` (project brief, decision log, progress notes) and `design/` (mockups) are kept locally and are not committed.

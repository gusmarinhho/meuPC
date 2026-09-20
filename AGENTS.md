# Base44 Setup Notes

## Project
ITSurge Admin Pro — a static HTML/CSS/JS bilingual admin dashboard template. No backend, no database, no build step.

## Running
Served via `nginx:alpine` in `docker-compose.base44.yml`, bind-mounting the repo root to `/usr/share/nginx/html` (read-only). Host port 3000 maps to nginx port 80.

- Start: `docker compose -f docker-compose.base44.yml up -d`
- The app is pure static files; edits to HTML/CSS/JS are reflected on page refresh (call `reload_preview` after changes).

## Structure
- Root `.html` files are the pages (English LTR `*.html`, Persian RTL `*-fa.html`).
- `assets/css/app.css`, `assets/js/app.js`, `assets/js/actions.js` hold shared styles and behavior.
- `index.html` is the dashboard entry point.

## Secrets
None required — fully static, no external services.

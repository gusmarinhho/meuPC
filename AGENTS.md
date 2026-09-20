# Base44 Setup Notes

## Project
GUSMARINHO — Contador Online. Express + PostgreSQL backend (server.js) serving a static HTML frontend. Rebranded from ITSurge Admin Pro template, all in Portuguese.

## Running
- `db` service: postgres:16-alpine with auto-created tables (server.js runs `criarTabelasAutomaticamente()` on startup).
- `api` service: node:22, bind-mounted at /app, runs `npx nodemon server.js` (live reload). Serves both static HTML and API endpoints on port 3000.
- Start: `docker compose -f docker-compose.base44.yml up -d`
- Dependencies install automatically via `npm install` in the container (node_modules in a named volume).

## Environment
- `DATABASE_URL`: local PostgreSQL (compose `environment:`).
- `JWT_SECRET`: delivered via `/run/base44/app.env` (generated dev placeholder); fallback in `.env.base44-defaults`.
- `DATABASE_SSL=false` for local dev.

## API Structure (server.js)
- Auth: POST /api/contador/cadastro, /api/contador/login, /api/cliente/login, /api/cliente/alterar-senha
- Empresas: GET/POST/DELETE /api/empresas, /api/cadastrar-empresa
- Guias: GET/POST/PUT/DELETE /api/guias, /api/guias/download/:id
- Dashboard: GET /api/dashboard/stats, /api/dashboard/pendencias-recentes
- Documentos, Pendências, Checklist, Avisos, Chat, Financeiro, Calendário, Procurações, Notas Fiscais, Folha de Pagamento, CRM
- Cliente endpoints: /api/cliente/dashboard, /api/cliente/guias, /api/documentos/cliente, /api/chat/cliente, /api/pendencias/cliente

## Frontend
- Root `.html` files are the pages (Portuguese LTR). `*-fa.html` are legacy Persian RTL (unused).
- `assets/css/app.css`, `assets/js/app.js`, `assets/js/actions.js` hold shared styles and behavior.
- `index.html` is the dashboard (loads real data from /api/dashboard/stats).
- `login.html` handles contador + cliente login.

## Secrets
- JWT_SECRET (required at boot, generated for development).

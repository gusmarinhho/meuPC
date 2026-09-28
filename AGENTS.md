# Base44 Setup Notes

## Project
Plataforma Lotofácil Pro — Simulador/Conferidor, Geradores com Filtros, Fechamentos Matemáticos e Estatísticas. Express + PostgreSQL backend (server.js) serving a static HTML frontend.

## Running
- `db` service: postgres:16-alpine. Tables auto-created on startup via `criarTabelas()`. Sample concursos seeded if empty.
- `api` service: node:22, bind-mounted at /app, runs `npx nodemon server.js` (live reload). Serves static HTML + API on port 3000.
- Start: `docker compose -f docker-compose.base44.yml up -d`
- Dependencies install automatically via `npm install` in the container. Use the dedicated `base44_lotofacil_pgdata` volume: the former compose volume contains an unrelated PostgreSQL cluster with no `lotofacil` role. Do not delete that older volume.
- The Caixa servicebus endpoint can return HTTP 403 from this sandbox; the Simulador's manual import saves a supplied numbered draw via `/api/concursos` and refreshes the selection. Do not treat seeded sample draws as verified official results.

## Environment
- `DATABASE_URL`: local PostgreSQL (compose `environment:`).
- `JWT_SECRET`: delivered via `/run/base44/app.env` (generated dev placeholder); fallback in `.env.base44-defaults`.
- `DATABASE_SSL=false` for local dev.

## Database Tables
- `usuarios` (id, nome, email, senha_hash, data_criacao)
- `concursos` (id, numero, data_sorteio, dezenas JSONB[15], data_criacao) — official draws
- `jogos_salvos` (id, usuario_id, nome, dezenas JSONB[15], origem, data_criacao) — user saved games

## API Structure (server.js)
- Auth: POST /api/auth/cadastro, /api/auth/login (JWT)
- Concursos: GET /api/concursos/ultimo, GET /api/concursos, POST /api/concursos (manual import), GET /api/concursos/atualizar (fetch from Caixa API)
- Conferidor: POST /api/conferir (jogos + concurso_id or dezenas_sorteio → acertos 11-15)
- Gerador: POST /api/gerar (filtros: fixas, excluir, pares, primos, soma → jogos)
- Fechamentos: POST /api/fechamento (dezenas + garantia 15/14/13 → jogos com cobertura garantida)
- Estatísticas: GET /api/estatisticas (frequência, atrasos, top pares, soma)
- Jogos: GET/POST/DELETE /api/jogos (auth required)

## Frontend
- Root `.html` files are the pages (Portuguese LTR, responsive).
- `assets/css/app.css` — global styles (dark theme, green/gold lottery palette).
- `assets/js/app.js` — shared helpers (API client, auth guard, number grid, print).
- `assets/js/simulador.js`, `gerador.js`, `fechamentos.js`, `estatisticas.js`, `meus-jogos.js` — page logic.
- `index.html` — dashboard. `login.html` — auth (login + cadastro).
- `simulador.html` — main feature: insert games, pull last draw, conference instantly.

## Secrets
- JWT_SECRET (required at boot, generated for development).

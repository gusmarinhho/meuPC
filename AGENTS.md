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
- `jogos_salvos` (id, usuario_id NULLABLE, nome, dezenas JSONB[15], origem, data_criacao) — saved games (no auth; usuario_id is NULL for personal use)

## API Structure (server.js)
- Auth: POST /api/auth/cadastro, /api/auth/login (JWT)
- Concursos: GET /api/concursos/ultimo, GET /api/concursos, POST /api/concursos (manual import), GET /api/concursos/atualizar (fetch latest from loteriascaixa-api.herokuapp.com), GET /api/concursos/buscar/:numero (single online fetch), POST /api/concursos/importar-intervalo (bulk import range)
- Conferidor: POST /api/conferir (jogos + concurso_id or dezenas_sorteio → acertos 11-15), POST /api/conferir-todos (one jogo vs all concursos → per-concurso acertos + summary)
- Gerador: POST /api/gerar (filtros: fixas, excluir, pares, primos, soma → jogos)
- Fechamentos: POST /api/fechamento (dezenas + garantia 15/14/13 → jogos com cobertura garantida)
- Estatísticas: GET /api/estatisticas (frequência, atrasos, top pares, soma)
- Jogos: GET/POST/DELETE /api/jogos (auth required)

## Frontend
- Root `.html` files are the pages (Portuguese LTR, responsive).
- `assets/css/app.css` — global styles (light theme, Lotofácil purple #7030a0 + pale-yellow nav #fffdf0).
- `assets/js/app.js` — shared helpers (API client, top-nav injection via `injectLayout()`, number grid, print). `requireAuth()` is a no-op (no registration — personal use).
- `assets/js/resultados.js` — index.html page logic (card grid of all draws + online import/export).
- `assets/js/simulador.js`, `gerador.js`, `fechamentos.js`, `estatisticas.js`, `meus-jogos.js` — page logic.
- `index.html` — "Resultados dos Sorteios" (grid of draw cards, image 2). `login.html` — redirects to index (no auth).
- `simulador.html` — "Montar Jogo e Testar" (3-column: picker | results list | summary, image 1). Conferences one game against ALL concursos via `/api/conferir-todos`.
- `contato.html` — simple contact page.
- Top nav tabs: Resultados dos Sorteios, Gerador de Jogos, Montar Jogo e Testar, Tabelas, Ferramentas, Meus Jogos, Contato.

## Secrets
- JWT_SECRET (required at boot, generated for development).

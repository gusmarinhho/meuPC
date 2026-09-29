// =============================================================
//  PLATAFORMA LOTOFÁCIL — API Backend
//  Express + PostgreSQL
//  Simulador/Conferidor · Geradores · Fechamentos · Estatísticas
// =============================================================

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(express.static(__dirname));

// ---------- Banco de Dados ----------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://contabil_m9rq_user:rrmF4JhFt46yzAqboawmWJWrRaT0QUZQ@dpg-danue0bm8hqs73cjr6pg-a/contabil_m9rq',
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
});

const JWT_SECRET = process.env.JWT_SECRET || 'lotofacil_dev_secret';

// ---------- Utilidades ----------
function ordenarDezenas(arr) {
  return [...arr].sort((a, b) => a - b);
}

function validarDezenas(dezenas) {
  if (!Array.isArray(dezenas) || dezenas.length !== 15) return false;
  const set = new Set(dezenas);
  if (set.size !== 15) return false;
  return dezenas.every(n => Number.isInteger(n) && n >= 1 && n <= 25);
}

// Conta acertos entre jogo e sorteio
function contarAcertos(jogo, sorteio) {
  const set = new Set(sorteio);
  return jogo.filter(n => set.has(n)).length;
}

// Verifica se um número é primo
const PRIMOS_25 = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23]);
function ehPrimo(n) { return PRIMOS_25.has(n); }

function contarPares(dezenas) { return dezenas.filter(n => n % 2 === 0).length; }
function contarImpares(dezenas) { return dezenas.filter(n => n % 2 !== 0).length; }
function contarPrimos(dezenas) { return dezenas.filter(n => PRIMOS_25.has(n)).length; }
function somar(dezenas) { return dezenas.reduce((s, n) => s + n, 0); }

// Combinações C(n, k)
function combinacoes(arr, k) {
  const result = [];
  const n = arr.length;
  if (k > n || k < 0) return result;
  const indices = Array.from({ length: k }, (_, i) => i);
  while (true) {
    result.push(indices.map(i => arr[i]));
    let i = k - 1;
    while (i >= 0 && indices[i] === n - k + i) i--;
    if (i < 0) break;
    indices[i]++;
    for (let j = i + 1; j < k; j++) indices[j] = indices[j - 1] + 1;
  }
  return result;
}

function C(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
}

// ---------- Auth Middleware ----------
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ erro: 'Token não fornecido' });
  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = payload;
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido' });
  }
}

// ---------- Criação automática de tabelas ----------
async function criarTabelas() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        data_criacao TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS concursos (
        id SERIAL PRIMARY KEY,
        numero INTEGER UNIQUE NOT NULL,
        data_sorteio DATE,
        dezenas JSONB NOT NULL,
        data_criacao TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS jogos_salvos (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        nome VARCHAR(255),
        dezenas JSONB NOT NULL,
        origem VARCHAR(50) DEFAULT 'manual',
        data_criacao TIMESTAMP DEFAULT NOW()
      );
      -- Permite jogos sem usuário vinculado (uso pessoal sem cadastro)
      ALTER TABLE jogos_salvos ALTER COLUMN usuario_id DROP NOT NULL;
    `);
    console.log('✓ Tabelas verificadas/criadas');
  } catch (e) {
    console.error('Erro ao criar tabelas:', e.message);
  }
}

// ---------- Seed de dados de exemplo ----------
async function seedConcursos() {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) as total FROM concursos');
    if (parseInt(rows[0].total) > 0) return;

    // Concursos de exemplo (dezenas reais aproximadas para demonstração)
    const exemplos = [
      { numero: 3300, data: '2025-09-22', dezenas: [1, 2, 5, 7, 9, 10, 12, 14, 15, 16, 18, 20, 22, 24, 25] },
      { numero: 3299, data: '2025-09-20', dezenas: [2, 3, 4, 6, 8, 9, 11, 13, 14, 17, 19, 20, 21, 23, 25] },
      { numero: 3298, data: '2025-09-18', dezenas: [1, 3, 4, 5, 7, 8, 10, 11, 13, 15, 16, 18, 19, 22, 24] },
      { numero: 3297, data: '2025-09-15', dezenas: [2, 4, 6, 7, 9, 10, 12, 13, 14, 16, 17, 20, 21, 23, 25] },
      { numero: 3296, data: '2025-09-13', dezenas: [1, 2, 3, 5, 6, 8, 9, 11, 12, 15, 17, 18, 19, 22, 24] },
      { numero: 3295, data: '2025-09-11', dezenas: [1, 3, 4, 6, 7, 10, 11, 13, 14, 15, 18, 20, 21, 23, 25] },
      { numero: 3294, data: '2025-09-08', dezenas: [2, 3, 5, 6, 8, 9, 10, 12, 14, 16, 17, 19, 20, 22, 24] },
      { numero: 3293, data: '2025-09-06', dezenas: [1, 2, 4, 5, 7, 8, 11, 13, 15, 16, 18, 19, 21, 23, 25] },
      { numero: 3292, data: '2025-09-04', dezenas: [1, 3, 4, 6, 7, 9, 10, 12, 13, 14, 17, 18, 20, 22, 24] },
      { numero: 3291, data: '2025-09-01', dezenas: [2, 3, 5, 6, 8, 9, 11, 12, 15, 16, 19, 20, 21, 23, 25] },
    ];

    for (const c of exemplos) {
      await pool.query(
        'INSERT INTO concursos (numero, data_sorteio, dezenas) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [c.numero, c.data, JSON.stringify(ordenarDezenas(c.dezenas))]
      );
    }
    console.log('✓ Concursos de exemplo inseridos');
  } catch (e) {
    console.error('Erro no seed:', e.message);
  }
}

// =============================================================
//  ROTAS DE AUTENTICAÇÃO
// =============================================================

app.post('/api/auth/cadastro', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ erro: 'Preencha todos os campos' });
    if (senha.length < 6) return res.status(400).json({ erro: 'Senha deve ter no mínimo 6 caracteres' });

    const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase()]);
    if (existe.rows.length) return res.status(409).json({ erro: 'E-mail já cadastrado' });

    const hash = await bcrypt.hash(senha, 10);
    const result = await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id, nome, email',
      [nome, email.toLowerCase(), hash]
    );
    const token = jwt.sign({ id: result.rows[0].id, nome, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, usuario: result.rows[0] });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao cadastrar: ' + e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'Preencha e-mail e senha' });

    const result = await pool.query('SELECT id, nome, email, senha_hash FROM usuarios WHERE email = $1', [email.toLowerCase()]);
    if (!result.rows.length) return res.status(401).json({ erro: 'E-mail ou senha inválidos' });

    const user = result.rows[0];
    const ok = await bcrypt.compare(senha, user.senha_hash);
    if (!ok) return res.status(401).json({ erro: 'E-mail ou senha inválidos' });

    const token = jwt.sign({ id: user.id, nome: user.nome, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, usuario: { id: user.id, nome: user.nome, email: user.email } });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao entrar: ' + e.message });
  }
});

// =============================================================
//  ROTAS DE CONCURSOS (SORTESIOS)
// =============================================================

app.get('/api/concursos/ultimo', async (req, res) => {
  try {
    const result = await pool.query('SELECT numero, data_sorteio, dezenas FROM concursos ORDER BY numero DESC LIMIT 1');
    if (!result.rows.length) return res.json({ concurso: null });
    res.json({ concurso: result.rows[0] });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao buscar último concurso: ' + e.message });
  }
});

app.get('/api/concursos', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limite) || 50, 200);
    const result = await pool.query('SELECT numero, data_sorteio, dezenas FROM concursos ORDER BY numero DESC LIMIT $1', [limit]);
    res.json({ concursos: result.rows });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao listar concursos: ' + e.message });
  }
});

// Importar concurso manualmente
app.post('/api/concursos', async (req, res) => {
  try {
    const { numero, data_sorteio, dezenas } = req.body;
    if (!numero || !validarDezenas(dezenas)) return res.status(400).json({ erro: 'Concurso inválido. Informe número e 15 dezenas (1-25).' });

    await pool.query(
      'INSERT INTO concursos (numero, data_sorteio, dezenas) VALUES ($1, $2, $3) ON CONFLICT (numero) DO UPDATE SET data_sorteio = EXCLUDED.data_sorteio, dezenas = EXCLUDED.dezenas',
      [numero, data_sorteio || null, JSON.stringify(ordenarDezenas(dezenas))]
    );
    res.json({ ok: true, mensagem: 'Concurso salvo' });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao salvar concurso: ' + e.message });
  }
});

// Buscar último sorteio oficial (API pública loteriascaixa-api)
app.get('/api/concursos/atualizar', async (req, res) => {
  try {
    const dados = await buscarSorteioOnline(null);
    if (!dados) return res.status(502).json({ erro: 'Não foi possível buscar o sorteio oficial agora. Use a importação manual.' });

    await pool.query(
      'INSERT INTO concursos (numero, data_sorteio, dezenas) VALUES ($1, $2, $3) ON CONFLICT (numero) DO UPDATE SET data_sorteio = EXCLUDED.data_sorteio, dezenas = EXCLUDED.dezenas',
      [dados.numero, dados.data, JSON.stringify(dados.dezenas)]
    );
    res.json({ ok: true, concurso: dados });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao atualizar: ' + e.message });
  }
});

// Buscar um concurso específico online (não salva, apenas retorna)
app.get('/api/concursos/buscar/:numero', async (req, res) => {
  try {
    const numero = parseInt(req.params.numero);
    if (!numero || numero < 1) return res.status(400).json({ erro: 'Número de concurso inválido' });
    const dados = await buscarSorteioOnline(numero);
    if (!dados) return res.status(404).json({ erro: `Concurso ${numero} não encontrado online` });
    res.json({ concurso: dados });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao buscar concurso: ' + e.message });
  }
});

// Importar um intervalo de concursos online e salvar no banco
app.post('/api/concursos/importar-intervalo', async (req, res) => {
  try {
    let { inicio, fim } = req.body;
    inicio = parseInt(inicio);
    fim = parseInt(fim);
    if (!inicio || !fim || inicio > fim) return res.status(400).json({ erro: 'Intervalo inválido' });
    const total = fim - inicio + 1;
    if (total > 100) return res.status(400).json({ erro: 'Máximo de 100 concursos por vez' });

    const salvos = [];
    const erros = [];
    for (let n = inicio; n <= fim; n++) {
      try {
        const dados = await buscarSorteioOnline(n);
        if (dados) {
          await pool.query(
            'INSERT INTO concursos (numero, data_sorteio, dezenas) VALUES ($1, $2, $3) ON CONFLICT (numero) DO UPDATE SET data_sorteio = EXCLUDED.data_sorteio, dezenas = EXCLUDED.dezenas',
            [dados.numero, dados.data, JSON.stringify(dados.dezenas)]
          );
          salvos.push(dados.numero);
        } else {
          erros.push(n);
        }
      } catch {
        erros.push(n);
      }
    }
    res.json({ ok: true, salvos, total_salvos: salvos.length, erros, total_erros: erros.length });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao importar intervalo: ' + e.message });
  }
});

// Busca sorteio online via API pública (último se numero=null)
function buscarSorteioOnline(numero) {
  return new Promise((resolve) => {
    const path = numero
      ? `/api/lotofacil/${numero}`
      : '/api/lotofacil/latest';
    const options = {
      hostname: 'loteriascaixa-api.herokuapp.com',
      path,
      method: 'GET',
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    };
    const r = https.request(options, (resp) => {
      let body = '';
      resp.on('data', (c) => body += c);
      resp.on('end', () => {
        try {
          const json = JSON.parse(body);
          const dezenas = (json.dezenas || json.dezenasSorteadas || []).map(Number).sort((a, b) => a - b);
          if (dezenas.length !== 15) return resolve(null);
          const data = json.data ? parseDataBR(json.data) : null;
          resolve({ numero: parseInt(json.concurso || json.numero), data, dezenas });
        } catch {
          resolve(null);
        }
      });
    });
    r.on('error', () => resolve(null));
    r.on('timeout', () => { r.destroy(); resolve(null); });
    r.end();
  });
}

// Converte "DD/MM/YYYY" -> "YYYY-MM-DD"
function parseDataBR(str) {
  if (!str || typeof str !== 'string') return null;
  const parts = str.split('/');
  if (parts.length !== 3) return str.split('T')[0] || null;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

// =============================================================
//  CONFERIDOR — cruza jogos com sorteio
// =============================================================

app.post('/api/conferir', async (req, res) => {
  try {
    const { jogos, concurso_id, dezenas_sorteio } = req.body;
    if (!jogos || !Array.isArray(jogos) || !jogos.length) return res.status(400).json({ erro: 'Informe ao menos um jogo' });

    let sorteio = null;
    let concursoInfo = null;

    if (dezenas_sorteio && validarDezenas(dezenas_sorteio)) {
      sorteio = ordenarDezenas(dezenas_sorteio);
    } else if (concurso_id) {
      const r = await pool.query('SELECT numero, data_sorteio, dezenas FROM concursos WHERE numero = $1', [concurso_id]);
      if (!r.rows.length) return res.status(404).json({ erro: 'Concurso não encontrado' });
      concursoInfo = r.rows[0];
      sorteio = r.rows[0].dezenas;
    } else {
      // último concurso
      const r = await pool.query('SELECT numero, data_sorteio, dezenas FROM concursos ORDER BY numero DESC LIMIT 1');
      if (!r.rows.length) return res.status(404).json({ erro: 'Nenhum concurso disponível' });
      concursoInfo = r.rows[0];
      sorteio = r.rows[0].dezenas;
    }

    const resultados = jogos.map((jogo, idx) => {
      const dezenas = ordenarDezenas(jogo);
      const acertos = contarAcertos(dezenas, sorteio);
      const acertadas = dezenas.filter(n => sorteio.includes(n));
      return { indice: idx, dezenas, acertos, acertadas };
    });

    // Resumo por faixa de premiação
    const resumo = { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, nenhum: 0 };
    resultados.forEach(r => {
      if (r.acertos >= 11) resumo[r.acertos]++;
      else resumo.nenhum++;
    });

    res.json({ sorteio, concurso: concursoInfo, resultados, resumo, totalJogos: resultados.length });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao conferir: ' + e.message });
  }
});

// =============================================================
//  CONFERIR UM JOGO CONTRA TODOS OS CONCURSOS
// =============================================================
app.post('/api/conferir-todos', async (req, res) => {
  try {
    const { dezenas } = req.body;
    if (!validarDezenas(dezenas)) return res.status(400).json({ erro: 'Jogo inválido (15 dezenas de 1 a 25)' });
    const jogo = ordenarDezenas(dezenas);
    const jogoSet = new Set(jogo);

    const result = await pool.query('SELECT numero, data_sorteio, dezenas FROM concursos ORDER BY numero DESC');
    if (!result.rows.length) return res.status(404).json({ erro: 'Nenhum concurso cadastrado. Atualize os sorteios primeiro.' });

    const resultados = result.rows.map(c => {
      const acertos = c.dezenas.filter(n => jogoSet.has(n)).length;
      return { numero: c.numero, data_sorteio: c.data_sorteio, acertos };
    });

    // Resumo por faixa
    const resumo = { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, nenhum: 0 };
    resultados.forEach(r => {
      if (r.acertos >= 11) resumo[r.acertos]++;
      else resumo.nenhum++;
    });

    // Pontuou = total de concursos com 11+ acertos
    const pontuou = resultados.filter(r => r.acertos >= 11);
    // Quantos concursos atrás foi a última pontuação (11+)
    let concursosAtras = null;
    if (pontuou.length) {
      const maisRecente = pontuou[0]; // já em ordem DESC
      const idx = resultados.findIndex(r => r.numero === maisRecente.numero);
      concursosAtras = idx;
    }

    res.json({
      jogo,
      resultados,
      resumo,
      total_concursos: resultados.length,
      total_pontuou: pontuou.length,
      concursos_atras: concursosAtras
    });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao conferir: ' + e.message });
  }
});

// =============================================================
//  GERADOR COM FILTROS INTELIGENTES
// =============================================================

app.post('/api/gerar', (req, res) => {
  try {
    const {
      quantidade = 1,
      dezenas_fixas = [],
      dezenas_excluir = [],
      min_pares = 0, max_pares = 15,
      min_impares = 0, max_impares = 15,
      min_primos = 0, max_primos = 15,
      min_soma = 0, max_soma = 300,
      evitar_repetidas = true
    } = req.body;

    const qtd = Math.min(Math.max(parseInt(quantidade) || 1, 1), 1000);
    const fixas = [...new Set((dezenas_fixas || []).filter(n => n >= 1 && n <= 25))];
    if (fixas.length > 15) return res.status(400).json({ erro: 'Máximo de 15 dezenas fixas' });

    const excluir = new Set((dezenas_excluir || []).filter(n => n >= 1 && n <= 25));
    // fixas não podem estar em excluir
    fixas.forEach(n => excluir.delete(n));

    const pool_nums = [];
    for (let n = 1; n <= 25; n++) {
      if (!excluir.has(n) && !fixas.includes(n)) pool_nums.push(n);
    }

    const restante = 15 - fixas.length;
    if (pool_nums.length < restante) return res.status(400).json({ erro: 'Dezenas disponíveis insuficientes após exclusões' });

    const jogosGerados = [];
    const vistos = new Set();
    let tentativas = 0;
    const maxTentativas = qtd * 5000;

    while (jogosGerados.length < qtd && tentativas < maxTentativas) {
      tentativas++;
      // Embaralha e pega 'restante' do pool
      const embaralhado = [...pool_nums].sort(() => Math.random() - 0.5);
      const jogo = [...fixas, ...embaralhado.slice(0, restante)].sort((a, b) => a - b);

      // Aplica filtros
      const pares = contarPares(jogo);
      const impares = contarImpares(jogo);
      const primos = contarPrimos(jogo);
      const soma = somar(jogo);

      if (pares < min_pares || pares > max_pares) continue;
      if (impares < min_impares || impares > max_impares) continue;
      if (primos < min_primos || primos > max_primos) continue;
      if (soma < min_soma || soma > max_soma) continue;

      if (evitar_repetidas) {
        const key = jogo.join('-');
        if (vistos.has(key)) continue;
        vistos.add(key);
      }

      jogosGerados.push(jogo);
    }

    res.json({ jogos: jogosGerados, total: jogosGerados.length, filtros: { min_pares, max_pares, min_impares, max_impares, min_primos, max_primos, min_soma, max_soma } });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao gerar: ' + e.message });
  }
});

// =============================================================
//  FECHAMENTOS MATEMÁTICOS
// =============================================================

app.post('/api/fechamento', (req, res) => {
  try {
    const { dezenas, garantia = 15, limite = 5000 } = req.body;
    if (!dezenas || !Array.isArray(dezenas) || dezenas.length < 15)
      return res.status(400).json({ erro: 'Selecione pelo menos 15 dezenas para o fechamento' });

    const nums = [...new Set(dezenas.filter(n => n >= 1 && n <= 25))].sort((a, b) => a - b);
    const k = nums.length;
    if (k < 15) return res.status(400).json({ erro: 'Selecione pelo menos 15 dezenas' });

    const gar = parseInt(garantia);
    const maxJogos = Math.min(parseInt(limite) || 5000, 20000);

    let jogos = [];

    if (gar === 15) {
      // Fechamento total: todas as combinações C(k, 15)
      const total = C(k, 15);
      if (total > maxJogos) return res.status(400).json({ erro: `Fechamento total gera ${total} jogos (acima do limite ${maxJogos}). Reduza as dezenas.` });
      jogos = combinacoes(nums, 15).map(c => c.sort((a, b) => a - b));
    } else if (gar === 14 || gar === 13) {
      // Fechamento com garantia via cobertura gulosa (greedy set cover)
      jogos = fechamentoGarantido(nums, gar, maxJogos);
    } else {
      return res.status(400).json({ erro: 'Garantia deve ser 15, 14 ou 13' });
    }

    res.json({ jogos, total: jogos.length, dezenas_base: nums, garantia: gar });
  } catch (e) {
    res.status(500).json({ erro: 'Erro no fechamento: ' + e.message });
  }
});

// Fechamento com garantia: cobertura gulosa de subcombinações
function fechamentoGarantido(nums, garantia, maxJogos) {
  const k = nums.length;
  // Precisamos cobrir todas as combinações de tamanho (garantia) dentro de k
  // Cada jogo de 15 dezenas cobre C(15, garantia) subcombinações
  const alvos = combinacoes(nums, garantia); // todas as subcombinações de tamanho 'garantia'
  const alvoSet = new Set(alvos.map(a => a.join('-')));
  const cobertos = new Set();
  const todosJogosPossiveis = combinacoes(nums, 15);
  const jogosSelecionados = [];

  // Pré-calcula cobertura de cada jogo candidato
  // Para performance, usamos abordagem iterativa gulosa
  let restantes = todosJogosPossiveis;

  while (cobertos.size < alvoSet.size && jogosSelecionados.length < maxJogos && restantes.length > 0) {
    let melhor = null;
    let melhorCobertura = -1;
    let melhorIdx = -1;

    for (let i = 0; i < restantes.length; i++) {
      const jogo = restantes[i];
      const subs = combinacoes(jogo, garantia);
      let cobre = 0;
      for (const s of subs) {
        const key = s.join('-');
        if (!cobertos.has(key)) cobre++;
      }
      if (cobre > melhorCobertura) {
        melhorCobertura = cobre;
        melhor = jogo;
        melhorIdx = i;
      }
      if (cobre === C(15, garantia)) break; // máximo possível
    }

    if (!melhor || melhorCobertura <= 0) break;

    const subsMelhor = combinacoes(melhor, garantia);
    for (const s of subsMelhor) cobertos.add(s.join('-'));

    jogosSelecionados.push(melhor.sort((a, b) => a - b));
    restantes.splice(melhorIdx, 1);

    // Remove jogos que não cobrem nada novo (otimização)
    restantes = restantes.filter(j => {
      const subs = combinacoes(j, garantia);
      return subs.some(s => !cobertos.has(s.join('-')));
    });
  }

  return jogosSelecionados;
}

// =============================================================
//  ESTATÍSTICAS
// =============================================================

app.get('/api/estatisticas', async (req, res) => {
  try {
    const result = await pool.query('SELECT numero, data_sorteio, dezenas FROM concursos ORDER BY numero ASC');
    const concursos = result.rows;
    if (!concursos.length) return res.json({ total_concursos: 0 });

    const total = concursos.length;
    const freq = {};      // frequência de cada dezena
    const atraso = {};    // concursos desde a última aparição
    const ultimaAparicao = {};

    for (let n = 1; n <= 25; n++) { freq[n] = 0; atraso[n] = 0; ultimaAparicao[n] = -1; }

    concursos.forEach((c, idx) => {
      const dezenas = c.dezenas;
      for (let n = 1; n <= 25; n++) {
        if (dezenas.includes(n)) {
          freq[n]++;
          ultimaAparicao[n] = idx;
        }
      }
    });

    // Atraso = concursos desde a última aparição até o último
    for (let n = 1; n <= 25; n++) {
      atraso[n] = ultimaAparicao[n] === -1 ? total : total - 1 - ultimaAparicao[n];
    }

    // Top combinações (pares/trios que mais saíram juntos)
    const paresContagem = {};
    concursos.forEach(c => {
      const d = c.dezenas;
      for (let i = 0; i < d.length; i++) {
        for (let j = i + 1; j < d.length; j++) {
          const key = `${d[i]}-${d[j]}`;
          paresContagem[key] = (paresContagem[key] || 0) + 1;
        }
      }
    });

    const topPares = Object.entries(paresContagem)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([par, count]) => ({ par: par.split('-').map(Number), count }));

    // Dezenas mais e menos sorteadas
    const freqOrdenada = Object.entries(freq)
      .map(([n, count]) => ({ dezena: parseInt(n), count, percentual: ((count / total) * 100).toFixed(1) }))
      .sort((a, b) => b.count - a.count);

    const maisSorteadas = freqOrdenada.slice(0, 10);
    const menosSorteadas = freqOrdenada.slice(-10).reverse();

    const atrasoOrdenado = Object.entries(atraso)
      .map(([n, a]) => ({ dezena: parseInt(n), atraso: a }))
      .sort((a, b) => b.atraso - a.atraso);

    // Soma média
    const somas = concursos.map(c => somar(c.dezenas));
    const somaMedia = (somas.reduce((s, v) => s + v, 0) / total).toFixed(1);
    const somaMin = Math.min(...somas);
    const somaMax = Math.max(...somas);

    // Pares/ímpares médios
    const paresMedio = (concursos.reduce((s, c) => s + contarPares(c.dezenas), 0) / total).toFixed(1);

    res.json({
      total_concursos: total,
      ultimo_concurso: concursos[concursos.length - 1],
      frequencia: freqOrdenada,
      mais_sorteadas: maisSorteadas,
      menos_sorteadas: menosSorteadas,
      atrasos: atrasoOrdenado,
      top_pares: topPares,
      soma_media: parseFloat(somaMedia),
      soma_min: somaMin,
      soma_max: somaMax,
      pares_medio: parseFloat(paresMedio)
    });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao calcular estatísticas: ' + e.message });
  }
});

// =============================================================
//  JOGOS SALVOS (requer auth)
// =============================================================

app.get('/api/jogos', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nome, dezenas, origem, data_criacao FROM jogos_salvos ORDER BY data_criacao DESC'
    );
    res.json({ jogos: result.rows });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao listar jogos: ' + e.message });
  }
});

app.post('/api/jogos', async (req, res) => {
  try {
    const { nome, dezenas, origem } = req.body;
    if (!validarDezenas(dezenas)) return res.status(400).json({ erro: 'Jogo inválido (15 dezenas de 1 a 25)' });

    const result = await pool.query(
      'INSERT INTO jogos_salvos (nome, dezenas, origem) VALUES ($1, $2, $3) RETURNING id, nome, dezenas, origem, data_criacao',
      [nome || 'Sem nome', JSON.stringify(ordenarDezenas(dezenas)), origem || 'manual']
    );
    res.json({ jogo: result.rows[0] });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao salvar jogo: ' + e.message });
  }
});

app.delete('/api/jogos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM jogos_salvos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao excluir jogo: ' + e.message });
  }
});

// ---------- Inicialização ----------
const PORT = process.env.PORT || 3000;

async function iniciar() {
  await criarTabelas();
  await seedConcursos();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Plataforma Lotofácil rodando na porta ${PORT}`);
  });
}

iniciar();

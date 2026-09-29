/* simulador.js — Montar Jogo e Testar */

let gridSel = null;
let ultimoResultado = null;
let ordemAtual = 'sorteio';
let concursoAnterior = null;

document.addEventListener('DOMContentLoaded', async () => {
  injectLayout('montar-jogo');
  gridSel = initNumberGrid('grid-jogo', (nums) => {
    el('sel-count').textContent = `${nums.length} / 20`;
    atualizarStats(nums);
    atualizarConcursoAnterior(nums);
  }, 20);
  await carregarConcursos();
  await carregarConcursoAnterior();

  // Veio da página de resultados? carrega concurso para teste
  const params = new URLSearchParams(location.search);
  const concurso = params.get('concurso');
  if (concurso) el('sel-concurso').value = concurso;
});

async function carregarConcursos() {
  try {
    const data = await API.get('/api/concursos?limite=200');
    const sel = el('sel-concurso');
    sel.innerHTML = '<option value="">Todos</option>';
    data.concursos.forEach(c => {
      sel.innerHTML += `<option value="${c.numero}">Concurso ${c.numero} — ${fmt(c.data_sorteio)}</option>`;
    });
  } catch (e) { /* silencioso */ }
}

function atualizarStats(nums) {
  const pares = nums.filter(n => n % 2 === 0).length;
  const impares = nums.length - pares;
  const soma = nums.reduce((s, n) => s + n, 0);
  el('jogo-stats').textContent = `Par:${pares} Ímpar:${impares} | Soma:${soma}`;
}

async function carregarConcursoAnterior() {
  try {
    const data = await API.get('/api/concursos/ultimo');
    concursoAnterior = data.concurso || null;
    atualizarConcursoAnterior(gridSel.get());
  } catch (e) { /* silencioso */ }
}

function atualizarConcursoAnterior(nums) {
  const grid = el('grid-jogo');
  const info = el('concurso-anterior-info');
  if (!grid) return;
  const dezenasAnt = concursoAnterior ? new Set(concursoAnterior.dezenas) : new Set();

  // Marca botões da grade com vermelho (dezenas do concurso anterior)
  grid.querySelectorAll('.num-btn').forEach(btn => {
    const n = parseInt(btn.dataset.num, 10);
    if (dezenasAnt.has(n)) btn.classList.add('prev-drawn');
    else btn.classList.remove('prev-drawn');
  });

  // Painel informativo
  if (!info) return;
  if (!concursoAnterior) {
    info.innerHTML = '<div style="font-size:12px;color:var(--text-muted)">Nenhum concurso anterior encontrado.</div>';
    return;
  }
  const repetidos = nums.filter(n => dezenasAnt.has(n));
  const numsFmt = (arr) => arr.map(n => String(n).padStart(2, '0')).join(' ');
  info.innerHTML = `
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">
      🔴 Concurso anterior: <strong style="color:var(--danger)">${concursoAnterior.numero}</strong> — ${fmt(concursoAnterior.data_sorteio)}
    </div>
    <div style="font-size:12px;margin-bottom:6px;color:var(--danger);font-weight:700">
      ${numsFmt(concursoAnterior.dezenas)}
    </div>
    <div style="font-size:13px;font-weight:700;color:var(--danger)">
      ${repetidos.length} repetida(s): ${repetidos.length ? numsFmt(repetidos) : '—'}
    </div>`;

  // Seção de repetidos na área de resultados (coluna 2)
  const repRes = el('repetidos-resultado');
  if (repRes && !ultimoResultado) {
    repRes.innerHTML = `
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">
        Números repetidos do concurso anterior <strong style="color:var(--danger)">${concursoAnterior.numero}</strong>:
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${repetidos.length
          ? repetidos.map(n => `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:30px;height:30px;border-radius:50%;background:var(--danger);color:#fff;font-weight:700;font-size:13px">${String(n).padStart(2,'0')}</span>`).join('')
          : '<span style="font-size:13px;color:var(--text-muted)">Nenhuma repetida ainda. Selecione números para ver.</span>'}
      </div>`;
  }
}

function limpar() {
  gridSel.clear();
  el('jogo-stats').textContent = 'Par:0 Ímpar:0 | Soma:0';
}

async function conferir() {
  const nums = gridSel.get();
  if (nums.length < 15 || nums.length > 20) {
    el('alert-area').innerHTML = alertBox('Selecione de 15 a 20 dezenas.', 'warning');
    return;
  }
  el('alert-area').innerHTML = alertBox('Conferindo contra todos os concursos...', 'info');
  try {
    const data = await API.post('/api/conferir-todos', { dezenas: nums });
    ultimoResultado = data;
    renderResultados();
    el('alert-area').innerHTML = alertBox(`Conferência concluída! ${data.total_concursos} concurso(s) verificado(s).`, 'success');
  } catch (err) {
    el('alert-area').innerHTML = alertBox(err.message, 'error');
  }
}

function renderResultados() {
  if (!ultimoResultado) return;
  ordemAtual = document.querySelector('input[name="ordem"]:checked').value;
  const data = ultimoResultado;

  // Resumo
  el('r-11').textContent = data.resumo[11];
  el('r-12').textContent = data.resumo[12];
  el('r-13').textContent = data.resumo[13];
  el('r-14').textContent = data.resumo[14];
  el('r-15').textContent = data.resumo[15];
  el('r-total').textContent = data.total_pontuou;

  // Header
  el('resultados-header').textContent = `Resultados com Pontuação: ${data.total_pontuou}`;

  // Status
  if (data.concursos_atras !== null) {
    if (data.concursos_atras === 0) {
      el('status-msg').innerHTML = '<strong style="color:var(--green)">Este jogo pontuou no último concurso!</strong>';
    } else {
      el('status-msg').innerHTML = `Este jogo pontuou há <strong style="color:var(--primary)">${data.concursos_atras}</strong> concurso(s) atrás.`;
    }
  } else {
    el('status-msg').textContent = 'Este jogo não pontuou (nenhum acerto de 11+) em nenhum concurso.';
  }

  // Lista
  let lista = [...data.resultados];
  if (ordemAtual === 'acertos') {
    lista.sort((a, b) => b.acertos - a.acertos || b.numero - a.numero);
  } else {
    lista.sort((a, b) => b.numero - a.numero);
  }

  const container = el('resultados-list');
  if (!lista.length) {
    container.innerHTML = '<div class="empty-state">Nenhum resultado.</div>';
    return;
  }
  container.innerHTML = lista.map(r => {
    const hit11 = r.acertos === 11;
    return `
    <div class="result-row${hit11 ? ' hit11' : ''}">
      <span>Concurso: ${r.numero} | Total Acertos: ${r.acertos}</span>
      ${hit11 ? '<span class="premio">R$ 7,00</span>' : ''}
    </div>`;
  }).join('');
}

async function salvarJogo() {
  const nums = gridSel.get();
  if (nums.length !== 15) {
    el('alert-area').innerHTML = alertBox('Selecione 15 dezenas antes de salvar.', 'warning');
    return;
  }
  const concurso = el('sel-concurso').value;
  const nome = concurso ? `Jogo Concurso ${concurso}` : `Jogo ${new Date().toLocaleDateString('pt-BR')}`;
  try {
    await API.post('/api/jogos', { nome, dezenas: nums, origem: 'montar' });
    el('alert-area').innerHTML = alertBox(`Jogo salvo${concurso ? ' para o concurso ' + concurso : ''}!`, 'success');
  } catch (err) {
    el('alert-area').innerHTML = alertBox(err.message, 'error');
  }
}

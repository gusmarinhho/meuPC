/* simulador.js — Montar Jogo e Testar */

let gridSel = null;
let ultimoResultado = null;
let ordemAtual = 'sorteio';

document.addEventListener('DOMContentLoaded', async () => {
  injectLayout('montar-jogo');
  gridSel = initNumberGrid('grid-jogo', (nums) => {
    el('sel-count').textContent = `${nums.length} / 15`;
    atualizarStats(nums);
  });
  await carregarConcursos();

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

function limpar() {
  gridSel.clear();
  el('jogo-stats').textContent = 'Par:0 Ímpar:0 | Soma:0';
}

async function conferir() {
  const nums = gridSel.get();
  if (nums.length !== 15) {
    el('alert-area').innerHTML = alertBox('Selecione exatamente 15 dezenas.', 'warning');
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

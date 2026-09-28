/* gerador.js — Gerador com Filtros */

let gridFixas = null, gridExcluir = null, jogosGerados = [];

document.addEventListener('DOMContentLoaded', () => {
  gridFixas = initNumberGrid('grid-fixas', (n) => el('fixas-count').textContent = `${n.length} selecionadas`, 15);
  gridExcluir = initNumberGrid('grid-excluir', (n) => el('excluir-count').textContent = `${n.length} selecionadas`, 25);
});

function presetFiltro(tipo) {
  const set = (id, v) => el(id).value = v;
  if (tipo === 'equilibrado') {
    set('f-min-pares', 6); set('f-max-pares', 9);
    set('f-min-primos', 4); set('f-max-primos', 8);
    set('f-min-soma', 170); set('f-max-soma', 220);
  } else if (tipo === 'maisPares') {
    set('f-min-pares', 8); set('f-max-pares', 11);
    set('f-min-primos', 0); set('f-max-primos', 15);
    set('f-min-soma', 0); set('f-max-soma', 300);
  } else if (tipo === 'maisImpares') {
    set('f-min-pares', 4); set('f-max-pares', 7);
    set('f-min-primos', 0); set('f-max-primos', 15);
    set('f-min-soma', 0); set('f-max-soma', 300);
  } else if (tipo === 'somaMedia') {
    set('f-min-pares', 0); set('f-max-pares', 15);
    set('f-min-primos', 0); set('f-max-primos', 15);
    set('f-min-soma', 180); set('f-max-soma', 210);
  }
}

async function gerar() {
  const btn = el('btn-gerar');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Gerando...';
  try {
    const fixas = gridFixas.get();
    const excluir = gridExcluir.get();
    const sobreposicao = fixas.filter(n => excluir.includes(n));
    if (sobreposicao.length) {
      el('alert-area').innerHTML = alertBox('Uma dezena não pode ser fixa e excluída ao mesmo tempo.', 'error');
      btn.disabled = false; btn.textContent = '⚙️ GERAR JOGOS';
      return;
    }
    const body = {
      quantidade: parseInt(el('f-qtd').value) || 10,
      dezenas_fixas: fixas,
      dezenas_excluir: excluir,
      min_pares: parseInt(el('f-min-pares').value) || 0,
      max_pares: parseInt(el('f-max-pares').value) || 15,
      min_impares: 0,
      max_impares: 15,
      min_primos: parseInt(el('f-min-primos').value) || 0,
      max_primos: parseInt(el('f-max-primos').value) || 15,
      min_soma: parseInt(el('f-min-soma').value) || 0,
      max_soma: parseInt(el('f-max-soma').value) || 300
    };
    const data = await API.post('/api/gerar', body);
    jogosGerados = data.jogos;
    renderGerados();
    el('alert-area').innerHTML = alertBox(`${data.total} jogo(s) gerado(s) com os filtros aplicados.`, 'success');
  } catch (err) {
    el('alert-area').innerHTML = alertBox(err.message, 'error');
  }
  btn.disabled = false; btn.textContent = '⚙️ GERAR JOGOS';
}

function renderGerados() {
  el('result-card').style.display = '';
  el('gerados-count').textContent = `${jogosGerados.length} jogo(s) gerado(s)`;
  el('gerados-area').innerHTML = jogosGerados.map((j, i) => `
    <div class="game-card" style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span class="badge badge-gray">Jogo ${i + 1}</span>
        <span class="badge badge-green">Soma: ${j.reduce((s, n) => s + n, 0)}</span>
      </div>
      <div class="game-numbers">${renderNumbers(j)}</div>
    </div>`).join('');
}

async function salvarGerados() {
  if (!jogosGerados.length) return;
  try {
    for (const j of jogosGerados) {
      await API.post('/api/jogos', { nome: `Gerado ${new Date().toLocaleDateString('pt-BR')}`, dezenas: j, origem: 'gerador' });
    }
    el('alert-area').innerHTML = alertBox(`${jogosGerados.length} jogo(s) salvo(s)!`, 'success');
  } catch (err) {
    el('alert-area').innerHTML = alertBox(err.message, 'error');
  }
}

function imprimirGerados() {
  if (!jogosGerados.length) return;
  const body = `
    <div class="header"><div class="logo">LOTOFÁCIL PRO</div><div>Jogos Gerados — ${new Date().toLocaleDateString('pt-BR')}</div></div>
    ${jogosGerados.map((j, i) => `
      <div class="game"><div><strong>Jogo ${i + 1}</strong><br>${j.map(n => `<span class="game-num">${n}</span>`).join('')}</div></div>
    `).join('')}`;
  printContent('Jogos Gerados', body);
}

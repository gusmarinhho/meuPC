/* resultados.js — Resultados dos Sorteios (grid de cards) */

let todosConcursos = [];
let ordem = 'desc';

document.addEventListener('DOMContentLoaded', async () => {
  injectLayout('resultados');
  await carregarConcursos();
});

async function carregarConcursos() {
  showLoading('cards-area', 'Carregando concursos...');
  try {
    const data = await API.get('/api/concursos?limite=200');
    todosConcursos = data.concursos || [];
    if (todosConcursos.length) {
      el('filtro-inicio').value = todosConcursos[todosConcursos.length - 1].numero;
      el('filtro-fim').value = todosConcursos[0].numero;
    }
    renderCards();
  } catch (err) {
    showError('cards-area', err.message);
  }
}

function aplicarFiltro() {
  renderCards();
}

function renderCards() {
  ordem = el('sel-ordem').value;
  const ini = parseInt(el('filtro-inicio').value);
  const fim = parseInt(el('filtro-fim').value);
  let lista = todosConcursos;
  if (ini && fim) lista = todosConcursos.filter(c => c.numero >= Math.min(ini, fim) && c.numero <= Math.max(ini, fim));
  lista = [...lista].sort((a, b) => ordem === 'desc' ? b.numero - a.numero : a.numero - b.numero);

  el('contagem').textContent = `(${lista.length} concurso${lista.length !== 1 ? 's' : ''})`;

  const container = el('cards-area');
  if (!lista.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div>Nenhum concurso no intervalo. Clique em "Atualizar Online" para importar.</div>';
    return;
  }
  container.innerHTML = lista.map(c => {
    const drawn = new Set(c.dezenas);
    const pares = c.dezenas.filter(n => n % 2 === 0).length;
    const impares = 15 - pares;
    const soma = c.dezenas.reduce((s, n) => s + n, 0);
    let grid = '';
    for (let n = 1; n <= 25; n++) {
      grid += `<span class="rc-num${drawn.has(n) ? ' drawn' : ''}">${String(n).padStart(2, '0')}</span>`;
    }
    return `
      <div class="result-card">
        <div class="result-card-grid">${grid}</div>
        <div class="result-card-footer">
          <strong>Concurso: ${c.numero}</strong><br>
          <span style="color:var(--text-muted)">${fmt(c.data_sorteio)}</span><br>
          Par:${pares} Ímpar:${impares} | Soma:${soma}
        </div>
        <div class="result-card-links">
          <a href="simulador.html?concurso=${c.numero}">Resultado</a> | 
          <a href="simulador.html?concurso=${c.numero}&testar=1">Testar</a>
        </div>
      </div>`;
  }).join('');
}

async function atualizarOnline() {
  el('alert-area').innerHTML = alertBox('Buscando o último sorteio oficial online...', 'info');
  try {
    const data = await API.get('/api/concursos/atualizar');
    el('alert-area').innerHTML = alertBox(`Sorteio atualizado! Concurso ${data.concurso.numero} — ${fmt(data.concurso.data)}.`, 'success');
    await carregarConcursos();
  } catch (err) {
    el('alert-area').innerHTML = `<div class="alert alert-warning">Não foi possível buscar online: ${err.message}. <a href="#" onclick="abrirImportar();return false">Importar intervalo manualmente →</a></div>`;
  }
}

function abrirImportar() {
  const ini = parseInt(el('filtro-inicio').value) || 1;
  const fim = parseInt(el('filtro-fim').value) || 1;
  const s = prompt('Importar concursos online — digite o intervalo (ex: 3784 a 3791):', `${ini} a ${fim}`);
  if (!s) return;
  const m = s.match(/(\d+)\s*a\s*(\d+)/);
  if (!m) { el('alert-area').innerHTML = alertBox('Formato inválido. Use: 3784 a 3791', 'error'); return; }
  importarIntervalo(parseInt(m[1]), parseInt(m[2]));
}

async function importarIntervalo(inicio, fim) {
  el('alert-area').innerHTML = alertBox(`Importando concursos ${inicio} a ${fim}...`, 'info');
  try {
    const data = await API.post('/api/concursos/importar-intervalo', { inicio, fim });
    el('alert-area').innerHTML = alertBox(`Importação concluída! ${data.total_salvos} concurso(s) salvo(s)${data.total_erros ? `, ${data.total_erros} não encontrado(s)` : ''}.`, 'success');
    await carregarConcursos();
  } catch (err) {
    el('alert-area').innerHTML = alertBox(err.message, 'error');
  }
}

function exportarTXT() {
  const ini = parseInt(el('filtro-inicio').value);
  const fim = parseInt(el('filtro-fim').value);
  let lista = todosConcursos.filter(c => c.numero >= Math.min(ini, fim) && c.numero <= Math.max(ini, fim));
  lista = [...lista].sort((a, b) => ordem === 'desc' ? b.numero - a.numero : a.numero - b.numero);
  if (!lista.length) return;
  let txt = 'Concurso;Data;Dezenas\n';
  lista.forEach(c => {
    txt += `${c.numero};${fmt(c.data_sorteio)};${c.dezenas.map(n => String(n).padStart(2, '0')).join('-')}\n`;
  });
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lotofacil_resultados.txt';
  a.click();
}

function exportarExcel() {
  const ini = parseInt(el('filtro-inicio').value);
  const fim = parseInt(el('filtro-fim').value);
  let lista = todosConcursos.filter(c => c.numero >= Math.min(ini, fim) && c.numero <= Math.max(ini, fim));
  lista = [...lista].sort((a, b) => ordem === 'desc' ? b.numero - a.numero : a.numero - b.numero);
  if (!lista.length) return;
  let csv = 'Concurso,Data,Dezenas\n';
  lista.forEach(c => {
    csv += `${c.numero},${fmt(c.data_sorteio)},"${c.dezenas.map(n => String(n).padStart(2, '0')).join('-')}"\n`;
  });
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lotofacil_resultados.csv';
  a.click();
}

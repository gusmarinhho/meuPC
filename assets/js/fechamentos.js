/* fechamentos.js — Fechamentos matemáticos */

let gridFech = null, jogosFechamento = [];

document.addEventListener('DOMContentLoaded', () => {
  gridFech = initNumberGrid('grid-fech', (n) => el('fech-count').textContent = `${n.length} selecionadas`, 22);
});

async function gerarFechamento() {
  const dezenas = gridFech.get();
  if (dezenas.length < 15) {
    el('alert-area').innerHTML = alertBox('Selecione pelo menos 15 dezenas para o fechamento.', 'warning');
    return;
  }
  const btn = el('btn-fech');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Calculando...';
  try {
    const data = await API.post('/api/fechamento', {
      dezenas,
      garantia: parseInt(el('sel-garantia').value),
      limite: parseInt(el('f-limite').value) || 5000
    });
    jogosFechamento = data.jogos;
    renderFechamento(data);
    el('alert-area').innerHTML = alertBox(`Fechamento gerado: ${data.total} jogo(s) com garantia de ${data.garantia} acertos.`, 'success');
  } catch (err) {
    el('alert-area').innerHTML = alertBox(err.message, 'error');
    el('fech-result').style.display = 'none';
  }
  btn.disabled = false; btn.textContent = '🔢 GERAR FECHAMENTO';
}

function renderFechamento(data) {
  el('fech-result').style.display = '';
  el('fech-info').textContent = `${data.total} jogo(s) · Garantia ${data.garantia} · ${data.dezenas_base.length} dezenas`;
  el('fech-area').innerHTML = jogosFechamento.map((j, i) => `
    <div class="game-card" style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span class="badge badge-gray">Jogo ${i + 1}</span>
        <span class="badge badge-green">Soma: ${j.reduce((s, n) => s + n, 0)}</span>
      </div>
      <div class="game-numbers">${renderNumbers(j)}</div>
    </div>`).join('');
}

async function salvarFechamento() {
  if (!jogosFechamento.length) return;
  try {
    for (const j of jogosFechamento) {
      await API.post('/api/jogos', { nome: `Fechamento ${el('sel-garantia').value}pts`, dezenas: j, origem: 'fechamento' });
    }
    el('alert-area').innerHTML = alertBox(`${jogosFechamento.length} jogo(s) salvo(s)!`, 'success');
  } catch (err) {
    el('alert-area').innerHTML = alertBox(err.message, 'error');
  }
}

function imprimirFechamento() {
  if (!jogosFechamento.length) return;
  const body = `
    <div class="header"><div class="logo">LOTOFÁCIL PRO</div><div>Fechamento — Garantia ${el('sel-garantia').value} acertos</div></div>
    <p style="margin-bottom:12px;color:#666">${jogosFechamento.length} jogos · ${new Date().toLocaleDateString('pt-BR')}</p>
    ${jogosFechamento.map((j, i) => `
      <div class="game"><div><strong>Jogo ${i + 1}</strong><br>${j.map(n => `<span class="game-num">${n}</span>`).join('')}</div></div>
    `).join('')}`;
  printContent('Fechamento Lotofácil', body);
}

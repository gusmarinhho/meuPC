/* meus-jogos.js — Jogos salvos */

let todosJogos = [];

document.addEventListener('DOMContentLoaded', carregarJogos);

async function carregarJogos() {
  showLoading('lista-jogos', 'Carregando jogos...');
  try {
    const data = await API.get('/api/jogos');
    todosJogos = data.jogos || [];
    el('jogos-count').textContent = `${todosJogos.length} jogo(s) salvo(s)`;
    renderJogos();
  } catch (err) {
    showError('lista-jogos', err.message);
  }
}

function renderJogos() {
  const container = el('lista-jogos');
  if (!todosJogos.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💾</div>Nenhum jogo salvo ainda. Gere ou crie jogos no Simulador ou Gerador.</div>';
    return;
  }
  container.innerHTML = todosJogos.map(j => `
    <div class="game-card" style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div><strong>${j.nome}</strong> <span class="badge badge-blue" style="margin-left:6px">${j.origem}</span><div style="font-size:12px;color:var(--text-dim);margin-top:2px">${fmt((j.data_criacao || '').split('T')[0])}</div></div>
        <div class="no-print">
          <button class="btn btn-outline btn-sm" onclick="conferirJogo(${j.id})">🎯 Conferir</button>
          <button class="btn btn-danger btn-sm" onclick="excluirJogo(${j.id})">🗑️</button>
        </div>
      </div>
      <div class="game-numbers">${renderNumbers(j.dezenas)}</div>
    </div>`).join('');
}

async function excluirJogo(id) {
  if (!confirm('Excluir este jogo?')) return;
  try {
    await API.del('/api/jogos/' + id);
    carregarJogos();
  } catch (err) {
    el('alert-area').innerHTML = alertBox(err.message, 'error');
  }
}

async function conferirJogo(id) {
  const jogo = todosJogos.find(j => j.id === id);
  if (!jogo) return;
  // Salva o jogo na sessionStorage e redireciona para o simulador
  sessionStorage.setItem('simulador_jogo', JSON.stringify(jogo.dezenas));
  window.location.href = 'simulador.html';
}

function imprimirTodos() {
  if (!todosJogos.length) return;
  const body = `
    <div class="header"><div class="logo">LOTOFÁCIL PRO</div><div>Meus Jogos — ${new Date().toLocaleDateString('pt-BR')}</div></div>
    ${todosJogos.map((j, i) => `
      <div class="game"><div><strong>${j.nome}</strong><br>${j.dezenas.map(n => `<span class="game-num">${n}</span>`).join('')}</div></div>
    `).join('')}`;
  printContent('Meus Jogos', body);
}

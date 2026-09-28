/* simulador.js — Simulador & Conferidor */

let meusJogos = [];
let gridSel = null;
let ultimoResultado = null;

document.addEventListener('DOMContentLoaded', async () => {
  gridSel = initNumberGrid('grid-jogo', (nums) => {
    el('sel-count').textContent = `${nums.length} / 15`;
  });
  await carregarConcursos();
  // Carrega jogo vindo de "Meus Jogos" (via sessionStorage)
  const jogoSalvo = sessionStorage.getItem('simulador_jogo');
  if (jogoSalvo) {
    try { meusJogos.push(...[JSON.parse(jogoSalvo)]); } catch {}
    sessionStorage.removeItem('simulador_jogo');
  }
  renderJogos();
});

async function carregarConcursos() {
  try {
    const data = await API.get('/api/concursos?limite=50');
    const sel = el('sel-concurso');
    sel.innerHTML = '<option value="">Último concurso</option>';
    data.concursos.forEach(c => {
      sel.innerHTML += `<option value="${c.numero}">Concurso ${c.numero} — ${fmt(c.data_sorteio)}</option>`;
    });
  } catch (e) { /* silencioso */ }
}

function adicionarJogo() {
  const nums = gridSel.get();
  if (nums.length !== 15) {
    el('alert-area').innerHTML = alertBox('Selecione exatamente 15 dezenas.', 'error');
    return;
  }
  meusJogos.push([...nums].sort((a, b) => a - b));
  el('alert-area').innerHTML = '';
  limparSelecao();
  renderJogos();
}

function gerarAleatorio() {
  const nums = [];
  while (nums.length < 15) {
    const n = Math.floor(Math.random() * 25) + 1;
    if (!nums.includes(n)) nums.push(n);
  }
  gridSel.set(nums.sort((a, b) => a - b));
}

function limparSelecao() { gridSel.clear(); }

function limparJogos() {
  meusJogos = [];
  el('resultado-card').style.display = 'none';
  renderJogos();
}

function renderJogos() {
  el('jogos-count').textContent = `${meusJogos.length} jogo(s) adicionado(s)`;
  const container = el('lista-jogos');
  if (!meusJogos.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎯</div>Adicione jogos para conferir</div>';
    return;
  }
  container.innerHTML = meusJogos.map((j, i) => `
    <div class="game-card" style="margin-bottom:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span class="badge badge-gray">Jogo ${i + 1}</span>
        <button class="btn btn-danger btn-sm no-print" onclick="removerJogo(${i})">✕</button>
      </div>
      <div class="game-numbers">${renderNumbers(j)}</div>
    </div>`).join('');
}

function removerJogo(i) {
  meusJogos.splice(i, 1);
  renderJogos();
}

async function carregarJogosSalvos() {
  try {
    const data = await API.get('/api/jogos');
    const content = el('modal-salvos-content');
    if (!data.jogos.length) {
      content.innerHTML = '<div class="empty-state">Nenhum jogo salvo.</div>';
    } else {
      content.innerHTML = data.jogos.map(j => `
        <div class="game-card" style="margin-bottom:8px;cursor:pointer" onclick="usarJogoSalvo(${JSON.stringify(j.dezenas).replace(/"/g, '&quot;')})">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <strong>${j.nome}</strong><span class="badge badge-blue">${j.origem}</span>
          </div>
          <div class="game-numbers">${renderNumbers(j.dezenas)}</div>
        </div>`).join('');
    }
    el('modal-salvos').classList.add('show');
  } catch (err) {
    el('alert-area').innerHTML = alertBox(err.message, 'error');
  }
}

function usarJogoSalvo(dezenas) {
  meusJogos.push([...dezenas].sort((a, b) => a - b));
  el('modal-salvos').classList.remove('show');
  renderJogos();
}

async function conferir() {
  if (!meusJogos.length) {
    el('alert-area').innerHTML = alertBox('Adicione ao menos um jogo para conferir.', 'warning');
    return;
  }
  const concursoId = el('sel-concurso').value ? parseInt(el('sel-concurso').value) : null;
  const manual = el('sorteio-manual').value.trim();
  let dezenasSorteio = null;
  if (manual) {
    dezenasSorteio = manual.split(/[\s,;]+/).map(Number).filter(n => n >= 1 && n <= 25);
    if (dezenasSorteio.length !== 15 || new Set(dezenasSorteio).size !== 15) {
      el('alert-area').innerHTML = alertBox('Sorteio manual inválido: informe 15 dezenas únicas de 1 a 25.', 'error');
      return;
    }
  }
  el('alert-area').innerHTML = alertBox('Conferindo...', 'info');
  try {
    const body = { jogos: meusJogos };
    if (dezenasSorteio) body.dezenas_sorteio = dezenasSorteio;
    else if (concursoId) body.concurso_id = concursoId;
    const data = await API.post('/api/conferir', body);
    ultimoResultado = data;
    renderResultado(data);
    el('alert-area').innerHTML = alertBox(`Conferência concluída! ${data.totalJogos} jogo(s) verificado(s).`, 'success');
  } catch (err) {
    el('alert-area').innerHTML = alertBox(err.message, 'error');
  }
}

function renderResultado(data) {
  el('resultado-card').style.display = '';
  const c = data.concurso;
  el('resultado-info').textContent = c ? `Concurso ${c.numero} — ${fmt(c.data_sorteio)}` : 'Sorteio manual';

  // Resumo
  const r = data.resumo;
  const resumo = [
    { label: '15 pts', val: r[15], cls: 'badge-gold' },
    { label: '14 pts', val: r[14], cls: 'badge-green' },
    { label: '13 pts', val: r[13], cls: 'badge-blue' },
    { label: '12 pts', val: r[12], cls: 'badge-purple' },
    { label: '11 pts', val: r[11], cls: 'badge-gray' },
    { label: '< 11', val: r.nenhum, cls: 'badge-red' },
  ];
  el('resumo-area').innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">
      ${resumo.map(s => `<span class="badge ${s.cls}">${s.label}: ${s.val}</span>`).join('')}
    </div>
    <div style="font-size:13px;color:var(--text-muted)">Dezenas sorteadas:</div>
    <div class="game-numbers" style="margin-top:6px">${renderNumbers(data.sorteio, { drawn: data.sorteio })}</div>`;

  // Detalhe por jogo
  el('resultado-area').innerHTML = data.resultados.map((r, i) => {
    const cor = r.acertos >= 14 ? 'badge-gold' : r.acertos >= 13 ? 'badge-green' : r.acertos >= 11 ? 'badge-blue' : 'badge-red';
    return `
    <div class="game-card" style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span class="badge badge-gray">Jogo ${i + 1}</span>
        <span class="badge ${cor}">${r.acertos} acertos</span>
      </div>
      <div class="game-numbers">${renderNumbers(r.dezenas, { hits: r.acertadas })}</div>
    </div>`;
  }).join('');
}

function imprimirResultado() {
  if (!ultimoResultado) return;
  const c = ultimoResultado.concurso;
  const titulo = c ? `Conferência — Concurso ${c.numero}` : 'Conferência Lotofácil';
  const body = `
    <div class="header"><div class="logo">LOTOFÁCIL PRO</div><div>${titulo}</div></div>
    <div class="sorteio"><strong>Dezenas sorteadas:</strong><br><div class="nums" style="margin-top:6px">${ultimoResultado.sorteio.map(n => `<span>${n}</span>`).join('')}</div></div>
    ${ultimoResultado.resultados.map((r, i) => `
      <div class="game"><div><strong>Jogo ${i + 1}</strong><br>${r.dezenas.map(n => `<span class="game-num ${r.acertadas.includes(n) ? 'hit' : ''}">${n}</span>`).join('')}</div><div class="acertos">${r.acertos} acertos</div></div>
    `).join('')}`;
  printContent(titulo, body);
}

async function salvarTodosJogos() {
  if (!meusJogos.length) return;
  try {
    for (const j of meusJogos) {
      await API.post('/api/jogos', { nome: `Jogo ${new Date().toLocaleDateString('pt-BR')}`, dezenas: j, origem: 'simulador' });
    }
    el('alert-area').innerHTML = alertBox(`${meusJogos.length} jogo(s) salvo(s) com sucesso!`, 'success');
  } catch (err) {
    el('alert-area').innerHTML = alertBox(err.message, 'error');
  }
}

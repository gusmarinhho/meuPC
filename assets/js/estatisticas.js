/* estatisticas.js — Estatísticas avançadas */

document.addEventListener('DOMContentLoaded', carregarEstatisticas);

async function carregarEstatisticas() {
  showLoading('mais-sorteadas', 'Calculando estatísticas...');
  try {
    const data = await API.get('/api/estatisticas');
    if (!data.total_concursos) {
      ['mais-sorteadas', 'menos-sorteadas', 'atrasos', 'top-pares', 'freq-completa'].forEach(id => {
        el(id).innerHTML = '<div class="empty-state">Sem dados. Atualize os sorteios no Painel.</div>';
      });
      return;
    }
    el('st-total').textContent = data.total_concursos;
    el('st-soma-media').textContent = data.soma_media;
    el('st-pares').textContent = data.pares_medio;
    el('st-soma-range').textContent = `${data.soma_min}-${data.soma_max}`;

    const maxFreq = Math.max(...data.frequencia.map(f => f.count));

    // Mais sorteadas
    el('mais-sorteadas').innerHTML = data.mais_sorteadas.map(d => `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span class="game-num" style="background:var(--primary);color:#fff;border-color:var(--primary)">${d.dezena}</span>
        <div style="flex:1"><div class="progress"><div class="progress-bar" style="width:${(d.count / maxFreq) * 100}%"></div></div></div>
        <span style="font-size:13px;font-weight:700;min-width:70px;text-align:right">${d.count}× (${d.percentual}%)</span>
      </div>`).join('');

    // Menos sorteadas
    el('menos-sorteadas').innerHTML = data.menos_sorteadas.map(d => `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span class="game-num" style="background:var(--danger);color:#fff;border-color:var(--danger)">${d.dezena}</span>
        <div style="flex:1"><div class="progress"><div class="progress-bar" style="width:${(d.count / maxFreq) * 100}%;background:var(--danger)"></div></div></div>
        <span style="font-size:13px;font-weight:700;min-width:70px;text-align:right">${d.count}× (${d.percentual}%)</span>
      </div>`).join('');

    // Atrasos
    el('atrasos').innerHTML = data.atrasos.slice(0, 10).map(d => `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span class="game-num" style="background:var(--warning);color:#1a1a1a;border-color:var(--warning)">${d.dezena}</span>
        <span style="font-size:13px;color:var(--text-muted)">${d.atraso} concurso(s) de atraso</span>
      </div>`).join('');

    // Top pares
    el('top-pares').innerHTML = data.top_pares.map(p => `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span class="game-num" style="background:var(--purple);color:#fff;border-color:var(--purple)">${p.par[0]}</span>
        <span class="game-num" style="background:var(--purple);color:#fff;border-color:var(--purple)">${p.par[1]}</span>
        <span style="font-size:13px;font-weight:700;margin-left:auto">${p.count}× juntos</span>
      </div>`).join('');

    // Frequência completa
    el('freq-completa').innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px">
      ${data.frequencia.map(d => `
        <div style="text-align:center">
          <span class="game-num" style="${d.count > maxFreq * 0.5 ? 'background:var(--primary);color:#fff;border-color:var(--primary)' : ''}">${d.dezena}</span>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${d.count}×</div>
        </div>`).join('')}
    </div>`;
  } catch (err) {
    showError('alert-area', err.message);
  }
}

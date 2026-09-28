/* ============================================================
   PLATAFORMA LOTOFÁCIL — JS compartilhado
   ============================================================ */

const API = (() => {
  const base = '';
  async function request(path, opts = {}) {
    const token = localStorage.getItem('lotofacil_token');
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(base + path, { ...opts, headers });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.erro || `Erro ${resp.status}`);
    return data;
  }
  return {
    get: (p) => request(p, { method: 'GET' }),
    post: (p, b) => request(p, { method: 'POST', body: JSON.stringify(b) }),
    del: (p) => request(p, { method: 'DELETE' }),
    isAuthed: () => !!localStorage.getItem('lotofacil_token'),
    logout: () => { localStorage.removeItem('lotofacil_token'); localStorage.removeItem('lotofacil_user'); window.location.href = 'login.html'; },
    getUser: () => {
      try { return JSON.parse(localStorage.getItem('lotofacil_user')); } catch { return null; }
    }
  };
})();

// ---------- Guard de auth ----------
function requireAuth() {
  if (!API.isAuthed()) { window.location.href = 'login.html'; return false; }
  return true;
}

// ---------- Sidebar / Layout ----------
function initLayout() {
  const user = API.getUser();
  if (user) {
    const el = document.getElementById('user-name');
    if (el) el.textContent = user.nome || user.email;
  }
  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  if (toggle) toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  });
  if (overlay) overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  });
}

// ---------- Helpers ----------
function el(id) { return document.getElementById(id); }
function fmt(data) {
  if (!data) return '--';
  const datePart = data.split('T')[0];
  const [y, m, d] = datePart.split('-');
  return `${d}/${m}/${y}`;
}

function renderNumbers(arr, opts = {}) {
  const { hits = null, size = 'normal', drawn = null } = opts;
  return arr.map(n => {
    let cls = 'game-num';
    if (hits && hits.includes(n)) cls += ' hit';
    else if (drawn && drawn.includes(n)) cls += ' drawn';
    else if (hits !== null) cls += ' miss';
    return `<span class="${cls}">${n}</span>`;
  }).join('');
}

function showLoading(target, msg = 'Carregando...') {
  const e = el(target);
  if (e) e.innerHTML = `<div class="empty-state"><div class="spinner" style="margin:0 auto 12px"></div>${msg}</div>`;
}

function showError(target, msg) {
  const e = el(target);
  if (e) e.innerHTML = `<div class="alert alert-error">⚠ ${msg}</div>`;
}

function alertBox(msg, type = 'success') {
  return `<div class="alert alert-${type}">${msg}</div>`;
}

// Number grid interativo (seleção de 1-25)
function initNumberGrid(containerId, onChange, max = 15) {
  const container = el(containerId);
  if (!container) return;
  const selected = new Set();

  container.innerHTML = '';
  for (let n = 1; n <= 25; n++) {
    const btn = document.createElement('button');
    btn.className = 'num-btn';
    btn.textContent = n;
    btn.addEventListener('click', () => {
      if (selected.has(n)) {
        selected.delete(n);
        btn.classList.remove('selected');
      } else {
        if (selected.size >= max) return;
        selected.add(n);
        btn.classList.add('selected');
      }
      if (onChange) onChange([...selected].sort((a, b) => a - b));
    });
    container.appendChild(btn);
  }

  return {
    get: () => [...selected].sort((a, b) => a - b),
    set: (nums) => {
      selected.clear();
      container.querySelectorAll('.num-btn').forEach(b => b.classList.remove('selected'));
      nums.forEach(n => {
        selected.add(n);
        const btn = container.querySelector(`.num-btn:nth-child(${n})`);
        if (btn) btn.classList.add('selected');
      });
      if (onChange) onChange([...selected].sort((a, b) => a - b));
    },
    clear: () => {
      selected.clear();
      container.querySelectorAll('.num-btn').forEach(b => b.classList.remove('selected'));
      if (onChange) onChange([]);
    }
  };
}

// ---------- Impressão ----------
function printContent(title, htmlBody) {
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; font-family: Arial, sans-serif; }
    body { padding: 30px; color: #1a1a1a; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 16px; margin-bottom: 16px; color: #555; }
    .game { border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 10px; display: flex; align-items: center; gap: 10px; }
    .game-num { width: 34px; height: 34px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; background: #f0f0f0; border: 1px solid #ccc; margin-right: 4px; }
    .game-num.hit { background: #ffc107; border-color: #ffa000; }
    .acertos { font-weight: 700; margin-left: auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #00a843; padding-bottom: 12px; }
    .logo { font-size: 24px; font-weight: 800; color: #00a843; }
    .sorteio { background: #e8f5e9; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
    .sorteio .nums span { width: 34px; height: 34px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; background: #00c853; color: #fff; margin-right: 4px; }
    @media print { body { padding: 15px; } }
  </style></head><body>${htmlBody}<script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
}

document.addEventListener('DOMContentLoaded', initLayout);

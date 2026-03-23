/* ============================================================
   REWIND — VHS Database · App Logic
   ============================================================ */

// ── Config ────────────────────────────────────────────────────
const GITHUB_USER = 'SrPeterr';
const GITHUB_REPO = 'retro-rewind-db';
const JSON_URL    = `https://${GITHUB_USER}.github.io/${GITHUB_REPO}/vhs.json`;

// ── State ─────────────────────────────────────────────────────
let db           = [];
let currentStars = 0;
let limitedOn    = false;

// ── Data Loading ──────────────────────────────────────────────
async function load() {
  try {
    const res = await fetch(JSON_URL + '?t=' + Date.now());
    db = await res.json();
  } catch (e) {
    db = [];
  }

  const params   = new URLSearchParams(window.location.search);
  const skuParam = params.get('sku');
  if (skuParam) {
    showDetailView(skuParam);
  } else {
    showGridView();
  }
}

// ── Detail View ───────────────────────────────────────────────
function showDetailView(sku) {
  const tape = db.find(t => t.sku === sku);

  document.getElementById('grid-view').style.display   = 'none';
  document.getElementById('detail-view').style.display = 'block';

  const el = document.getElementById('detail-content');

  if (!tape) {
    el.innerHTML = `
      <div class="detail-not-found">
        <p class="empty-title">TAPE NOT FOUND</p>
        <p class="empty-sub">SKU ${esc(sku)} DOES NOT EXIST IN THE DATABASE</p>
        <a href="${baseURL()}" class="btn btn-primary" style="display:inline-block;margin-top:24px;text-decoration:none">← BACK TO CATALOG</a>
      </div>`;
    return;
  }

  el.innerHTML = `
    <a href="${baseURL()}" class="detail-back">← BACK TO CATALOG</a>
    <div class="detail-card ${tape.limited ? 'limited' : ''}">
      <div class="card-tape ${tape.limited ? 'limited' : ''}"></div>
      <div class="detail-body">
        <div class="detail-header-row">
          <h2 class="detail-name">${esc(tape.name)}</h2>
          ${tape.limited ? '<span class="limited-badge">★ LIMITED EDITION</span>' : ''}
        </div>
        <div class="detail-sku-row">
          <button class="detail-sku sku-copy" onclick="copySKU('${esc(tape.sku)}')" title="Click to copy SKU">
            ${esc(tape.sku)} ⎘
          </button>
          <span class="detail-sku-hint">CLICK TO COPY</span>
        </div>
        <div class="detail-meta">
          ${tape.genre ? `<span class="tag tag-genre">${esc(tape.genre)}</span>` : ''}
          ${tape.stars ? `<span class="detail-stars">${starsHtml(tape.stars)}</span>` : ''}
        </div>
        <div class="detail-share">
          <button class="btn btn-ghost" onclick="copyShareLink('${esc(tape.sku)}')">⎘ SHARE THIS TAPE</button>
        </div>
      </div>
    </div>`;
}

function showGridView() {
  document.getElementById('grid-view').style.display   = 'block';
  document.getElementById('detail-view').style.display = 'none';
  renderGrid();
  updateStats();
}

function baseURL() {
  return window.location.pathname;
}

// ── Rendering ─────────────────────────────────────────────────
function renderGrid() {
  const list = getFiltered();
  const grid = document.getElementById('grid');

  document.getElementById('results-count').textContent =
    `${list.length} TAPE${list.length !== 1 ? 'S' : ''} IN COLLECTION`;

  if (!list.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-vhs"></div>
        <p class="empty-title">${db.length ? 'NO RESULTS' : 'NO TAPES YET'}</p>
        <p class="empty-sub">${db.length ? 'TRY ADJUSTING YOUR FILTERS' : 'NO TAPES IN THE DATABASE YET'}</p>
      </div>`;
    return;
  }

  grid.innerHTML = list.map(t => `
    <div class="vhs-card ${t.limited ? 'limited' : ''}" onclick="goToDetail('${esc(t.sku)}')" style="cursor:pointer">
      <div class="card-tape ${t.limited ? 'limited' : ''}"></div>
      <div class="card-body">
        <div class="card-header-row">
          <span class="card-name">${esc(t.name)}</span>
          ${t.limited ? '<span class="limited-badge">★ LIMITED</span>' : ''}
        </div>
        <button class="card-sku sku-copy" onclick="event.stopPropagation(); copySKU('${esc(t.sku)}')" title="Click to copy SKU">
          ${esc(t.sku)} ⎘
        </button>
        <div class="card-meta">
          ${t.genre ? `<span class="tag tag-genre">${esc(t.genre)}</span>` : ''}
        </div>
        ${t.stars ? `<div class="card-stars">${starsHtml(t.stars)}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function updateStats() {
  const total   = db.length;
  const limited = db.filter(t => t.limited).length;
  const genres  = new Set(db.map(t => t.genre).filter(Boolean)).size;

  document.getElementById('stat-total').textContent   = `⬛ ${total} TAPE${total !== 1 ? 'S' : ''}`;
  document.getElementById('stat-limited').textContent = `★ ${limited} LIMITED`;
  document.getElementById('stat-genres').textContent  = `◈ ${genres} GENRE${genres !== 1 ? 'S' : ''}`;

  const genreSelect = document.getElementById('filter-genre');
  const current     = genreSelect.value;
  const allGenres   = [...new Set(db.map(t => t.genre).filter(Boolean))].sort();

  genreSelect.innerHTML = '<option value="">ALL GENRES</option>' +
    allGenres.map(g => `<option ${g === current ? 'selected' : ''}>${g}</option>`).join('');
}

// ── Navigation ────────────────────────────────────────────────
function goToDetail(sku) {
  window.history.pushState({}, '', `${window.location.pathname}?sku=${encodeURIComponent(sku)}`);
  showDetailView(sku);
  window.scrollTo(0, 0);
}

window.addEventListener('popstate', () => {
  const sku = new URLSearchParams(window.location.search).get('sku');
  sku ? showDetailView(sku) : showGridView();
  window.scrollTo(0, 0);
});

// ── Filtering & Sorting ───────────────────────────────────────
function getFiltered() {
  const q       = document.getElementById('search').value.toLowerCase();
  const genre   = document.getElementById('filter-genre').value;
  const limited = document.getElementById('filter-limited').value;
  const sort    = document.getElementById('sort').value;

  let list = db.filter(t => {
    if (q && !t.name.toLowerCase().includes(q) && !t.sku.toLowerCase().includes(q)) return false;
    if (genre && t.genre !== genre) return false;
    if (limited === 'yes' && !t.limited) return false;
    if (limited === 'no'  &&  t.limited) return false;
    return true;
  });

  if      (sort === 'oldest')       list = [...list].reverse();
  else if (sort === 'name')         list.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'rating-stars') list.sort((a, b) => (b.stars || 0) - (a.stars || 0));

  return list;
}

// ── Modal ─────────────────────────────────────────────────────
function openModal() {
  document.getElementById('f-name').value  = '';
  document.getElementById('f-sku').value   = '';
  document.getElementById('f-genre').value = '';
  document.getElementById('f-stars').value = 0;
  currentStars = 0;
  limitedOn    = false;
  document.querySelectorAll('.star-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('toggle-limited').classList.remove('on');
  document.getElementById('toggle-label').textContent = 'NO';
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

function setStar(v) {
  currentStars = currentStars === v ? 0 : v;
  document.getElementById('f-stars').value = currentStars;
  document.querySelectorAll('.star-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.v) <= currentStars);
  });
}

function toggleLimited() {
  limitedOn = !limitedOn;
  document.getElementById('toggle-limited').classList.toggle('on', limitedOn);
  document.getElementById('toggle-label').textContent = limitedOn ? 'YES — LIMITED EDITION' : 'NO';
}

// ── Suggest: download JSON ────────────────────────────────────
function submitSuggestion() {
  const name = document.getElementById('f-name').value.trim();
  const sku  = document.getElementById('f-sku').value.trim();

  if (!name || !sku) {
    showToast('NAME & SKU ARE REQUIRED', true);
    return;
  }

  const entry = {
    name,
    sku,
    genre:   document.getElementById('f-genre').value || null,
    stars:   currentStars || null,
    limited: limitedOn
  };

  // Remove null fields for a clean JSON
  Object.keys(entry).forEach(k => entry[k] === null && delete entry[k]);

  const blob = new Blob([JSON.stringify(entry, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `vhs-${sku}.json`;
  a.click();
  URL.revokeObjectURL(url);

  closeModal();
  showToast('✔ JSON DOWNLOADED — SEND IT TO THE ADMIN!');
}

// ── Utilities ─────────────────────────────────────────────────
async function copySKU(sku) {
  try {
    await navigator.clipboard.writeText(sku);
    showToast('✔ SKU COPIED: ' + sku);
  } catch {
    showToast('SKU: ' + sku);
  }
}

async function copyShareLink(sku) {
  const url = `${window.location.origin}${window.location.pathname}?sku=${encodeURIComponent(sku)}`;
  try {
    await navigator.clipboard.writeText(url);
    showToast('✔ LINK COPIED');
  } catch {
    showToast(url);
  }
}

function showToast(msg, error = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast' + (error ? ' error' : '');
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => t.classList.remove('show'), 3000);
}

function starsHtml(n) {
  return '★'.repeat(n || 0) + '☆'.repeat(5 - (n || 0));
}

function esc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function updateClock() {
  document.getElementById('clock').textContent =
    [new Date().getHours(), new Date().getMinutes(), new Date().getSeconds()]
      .map(n => String(n).padStart(2, '0')).join(' : ');
}

// ── Init ──────────────────────────────────────────────────────
load();
updateClock();
setInterval(updateClock, 1000);
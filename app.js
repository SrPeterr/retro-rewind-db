/* ============================================================
   REWIND — VHS Database · App Logic
   ============================================================ */

// ── Config ────────────────────────────────────────────────────
const GITHUB_USER = 'SrPeterr';
const GITHUB_REPO = 'retro-rewind-db';
const JSON_URL    = `https://${GITHUB_USER}.github.io/${GITHUB_REPO}/vhs.json`;

function buildIssueURL(data) {
  const title = encodeURIComponent(`[VHS] ${data.name} · ${data.sku}`);
  const body  = encodeURIComponent(
`**Name:** ${data.name}
**SKU:** ${data.sku}
**Genre:** ${data.genre || '—'}
**Score:** ${'★'.repeat(data.stars || 0) || '—'}
**Limited Edition:** ${data.limited ? 'Yes' : 'No'}`
  );
  return `https://github.com/${GITHUB_USER}/${GITHUB_REPO}/issues/new?title=${title}&body=${body}&labels=vhs-submission`;
}

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
  renderGrid();
  updateStats();
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
        <p class="empty-sub">${db.length ? 'TRY ADJUSTING YOUR FILTERS' : 'BE THE FIRST TO SUBMIT A VHS'}</p>
      </div>`;
    return;
  }

  grid.innerHTML = list.map(t => `
    <div class="vhs-card ${t.limited ? 'limited' : ''}">
      <div class="card-tape ${t.limited ? 'limited' : ''}"></div>
      <div class="card-body">
        <div class="card-header-row">
          <span class="card-name">${esc(t.name)}</span>
          ${t.limited ? '<span class="limited-badge">★ LIMITED</span>' : ''}
        </div>
        <button class="card-sku sku-copy" onclick="copySKU('${esc(t.sku)}')" title="Click to copy SKU">
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

  // Rebuild genre filter options from current data
  const genreSelect = document.getElementById('filter-genre');
  const current     = genreSelect.value;
  const allGenres   = [...new Set(db.map(t => t.genre).filter(Boolean))].sort();

  genreSelect.innerHTML = '<option value="">ALL GENRES</option>' +
    allGenres.map(g => `<option ${g === current ? 'selected' : ''}>${g}</option>`).join('');
}

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

// ── Form Actions ──────────────────────────────────────────────
function saveTape() {
  const name = document.getElementById('f-name').value.trim();
  const sku  = document.getElementById('f-sku').value.trim();

  if (!name || !sku) {
    showToast('NAME & SKU ARE REQUIRED', true);
    return;
  }

  const data = {
    name,
    sku,
    genre:   document.getElementById('f-genre').value || '',
    stars:   currentStars,
    limited: limitedOn
  };

  window.open(buildIssueURL(data), '_blank');
  closeModal();
  showToast('✔ GITHUB ISSUE OPENED — THANKS!');
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

// ── Utilities ─────────────────────────────────────────────────
async function copySKU(sku) {
  try {
    await navigator.clipboard.writeText(sku);
    showToast('✔ SKU COPIED: ' + sku);
  } catch {
    showToast('SKU: ' + sku);
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

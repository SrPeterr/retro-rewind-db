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
let queue        = [];

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
  skuParam ? showDetailView(skuParam) : showGridView();
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

function baseURL() { return window.location.pathname; }

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
  queue = [];
  resetForm();
  renderQueue();
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

function resetForm() {
  document.getElementById('f-name').value  = '';
  document.getElementById('f-sku').value   = '';
  document.getElementById('f-genre').value = '';
  document.getElementById('f-stars').value = 0;
  currentStars = 0;
  limitedOn    = false;
  document.querySelectorAll('.star-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('toggle-limited').classList.remove('on');
  document.getElementById('toggle-label').textContent = 'NO';
  // Reset scan UI
  const scanStatus = document.getElementById('scan-status');
  if (scanStatus) { scanStatus.textContent = ''; scanStatus.className = 'scan-status'; }
  const imgInput = document.getElementById('scan-input');
  if (imgInput) imgInput.value = '';
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
  document.getElementById('toggle-label').textContent = limitedOn ? 'YES' : 'NO';
}

// ── Image Scan via Puter.js OCR ───────────────────────────────

// Genre map: what the game calls them → our tags
const GENRE_MAP = {
  'science fiction': 'Sci-Fi',
  'sci-fi':          'Sci-Fi',
  'scifi':           'Sci-Fi',
  'horror':          'Horror',
  'action':          'Action',
  'comedy':          'Comedy',
  'drama':           'Drama',
  'thriller':        'Thriller',
  'romance':         'Romance',
  'animation':       'Animation',
  'documentary':     'Documentary',
  'adventure':       'Adventure',
  'fantasy':         'Fantasy',
  'mystery':         'Mystery',
  'western':         'Western',
  'musical':         'Musical',
};

function parseOCRText(text, titleBarText) {
  // Extract name from the bottom title bar first — it's the cleanest text
  // Format: "GALACTIC REBELLION\nMOVIE  SCIENCE FICTION"  or "FAMILY ROBOTS\nMOVIE  SCIENCE FICTION"
  if (titleBarText) {
    const titleLines = titleBarText.split('\n').map(l => l.trim()).filter(Boolean);
    // The name is always the first non-empty line that isn't "MOVIE" or a genre
    for (const line of titleLines) {
      const lower = line.toLowerCase();
      const isGenreOrType = lower === 'movie' || lower === 'series' || lower === 'documentary'
        || Object.values(GENRE_MAP).map(v => v.toLowerCase()).includes(lower)
        || Object.keys(GENRE_MAP).includes(lower);
      if (!isGenreOrType && line.length > 2 && /[A-Za-z]/.test(line)) {
        // This is the name — convert from ALL CAPS to Title Case
        return _parseStats(text, toTitleCase(line));
      }
    }
  }
  return _parseStats(text, '');
}

function _parseStats(text, nameOverride) {
  const result = { name: '', sku: '', genre: '', stars: 0, limited: false };
  const lines  = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const lower = line.toLowerCase();

    // SKU — any 4-8 digit number next to "SKU" label
    const skuMatch = line.match(/SKU[:\s]+([\d]{4,8})/i)
                  || line.match(/^([\d]{4,8})$/)           // standalone number line
                  || line.match(/SKU.*?([\d]{4,8})/i);
    if (skuMatch && !result.sku) { result.sku = skuMatch[1]; continue; }

    // Review Score — stars count or "X/5" pattern
    if (lower.includes('review') || lower.includes('score')) {
      const starCount = (line.match(/★/g) || []).length;
      if (starCount) { result.stars = Math.min(starCount, 5); continue; }
      // Look for a digit 1-5 on the same line as "score"
      const numMatch = line.match(/([1-5])\s*(?:\/\s*5)?/);
      if (numMatch) { result.stars = parseInt(numMatch[1]); continue; }
    }

    // Print Rarity — Limited = not Common
    if (lower.includes('rarity') || lower.includes('print')) {
      result.limited = !lower.includes('common');
      continue;
    }

    // Genre — match against known genres anywhere in the line
    for (const [key, val] of Object.entries(GENRE_MAP)) {
      if (lower.includes(key)) { result.genre = val; break; }
    }
  }

  // SKU fallback: find any 4-8 digit standalone number if not found yet
  if (!result.sku) {
    for (const line of lines) {
      const m = line.match(/^[^a-zA-Z]*([\d]{4,8})[^a-zA-Z]*$/);
      if (m && parseInt(m[1]) > 999) { result.sku = m[1]; break; }
    }
  }

  // Name — look for the longest clean alphabetic line that isn't a label
  const labelWords = ['sku','score','rarity','value','rented','owned','copies','review',
                      'market','print','times','close','inspect','copies','movie','good','critic'];
  const candidates = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    const isLabel = labelWords.some(w => lower.includes(w));
    const isNumber = /^[\d\s£$.,]+$/.test(line);
    const isGenre  = Object.keys(GENRE_MAP).some(k => lower === k);
    const isRoman  = /^(I{1,3}|IV|V?I{0,3}|VI{0,3}|IX|X{1,3})$/i.test(line.trim());
    if (!isLabel && !isNumber && !isGenre && !isRoman && line.length > 2 && line.length < 80 && /[A-Za-z]{2,}/.test(line)) {
      candidates.push(line);
    }
  }
  // Prefer lines with multiple words (likely the title)
  const multiWord = candidates.filter(l => l.split(/\s+/).length >= 2);
  if (multiWord.length) {
    result.name = toTitleCase(multiWord[0]);
  } else if (candidates.length) {
    result.name = toTitleCase(candidates[0]);
  }

  if (nameOverride) result.name = nameOverride;
  return result;
}

function toTitleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function fillFormFromScan(data) {
  if (data.name)  document.getElementById('f-name').value  = data.name;
  if (data.sku)   document.getElementById('f-sku').value   = data.sku;
  if (data.genre) document.getElementById('f-genre').value = data.genre;
  if (data.stars) {
    currentStars = data.stars;
    document.getElementById('f-stars').value = currentStars;
    document.querySelectorAll('.star-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.v) <= currentStars);
    });
  }
  if (data.limited) {
    limitedOn = true;
    document.getElementById('toggle-limited').classList.add('on');
    document.getElementById('toggle-label').textContent = 'YES';
  }
}

// Tesseract worker — created once and reused
let _tesseractWorker = null;
async function getTesseractWorker() {
  if (!_tesseractWorker) {
    _tesseractWorker = await Tesseract.createWorker('eng', 1, {
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 :.,!?\'-/'
    });
  }
  return _tesseractWorker;
}

// Crop and preprocess a zone of the image for OCR
// zone: 'stats' = top-left panel, 'title' = bottom bar
function cropZone(file, zone) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx    = canvas.getContext('2d');
      let sx, sy, sw, sh;

      if (zone === 'stats') {
        // Top-left ~45% x 72% — the black stats panel
        sx = 0;
        sy = 0;
        sw = Math.floor(img.width  * 0.45);
        sh = Math.floor(img.height * 0.72);
      } else {
        // Bottom bar — last ~12% of height, full width
        // This is the black strip: "GALACTIC REBELLION · MOVIE · SCIENCE FICTION"
        sx = 0;
        sy = Math.floor(img.height * 0.86);
        sw = img.width;
        sh = Math.floor(img.height * 0.14);
      }

      // Scale up 3x for better Tesseract accuracy
      canvas.width  = sw * 3;
      canvas.height = sh * 3;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw * 3, sh * 3);

      // Threshold: bright text on dark bg → pure black/white
      const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d  = id.data;
      const threshold = zone === 'title' ? 80 : 100;
      for (let i = 0; i < d.length; i += 4) {
        const grey = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
        const val  = grey > threshold ? 255 : 0;
        d[i] = d[i+1] = d[i+2] = val;
      }
      ctx.putImageData(id, 0, 0);
      canvas.toBlob(resolve, 'image/png');
    };
    img.src = URL.createObjectURL(file);
  });
}

async function scanImage(input) {
  const file = input.files[0];
  if (!file) return;

  const status = document.getElementById('scan-status');
  status.textContent = '⟳ LOADING OCR ENGINE...';
  status.className   = 'scan-status scanning';

  try {
    const worker = await getTesseractWorker();
    status.textContent = '⟳ SCANNING IMAGE...';

    // 1. Stats panel: SKU, genre, score, limited
    const statsBlob = await cropZone(file, 'stats');
    const { data: { text: statsText } } = await worker.recognize(statsBlob);
    console.log('[REWIND OCR] stats:', statsText);

    // 2. Bottom title bar: "GAME NAME · MOVIE · GENRE"
    const titleBlob = await cropZone(file, 'title');
    const { data: { text: titleText } } = await worker.recognize(titleBlob);
    console.log('[REWIND OCR] title bar:', titleText);

    const combined = statsText + '\n' + titleText;

    if (!combined.trim()) {
      status.textContent = '✕ COULD NOT READ IMAGE — FILL MANUALLY';
      status.className   = 'scan-status error';
      return;
    }

    const data = parseOCRText(combined, titleText);
    fillFormFromScan(data);

    const found = [data.name && 'NAME', data.sku && 'SKU', data.genre && 'GENRE', data.stars && 'SCORE']
      .filter(Boolean).join(' · ');

    status.textContent = found ? `✔ DETECTED: ${found}` : '⚠ SCAN DONE — CHECK FIELDS';
    status.className   = found ? 'scan-status success' : 'scan-status warning';

  } catch (e) {
    status.textContent = '✕ SCAN FAILED — FILL MANUALLY';
    status.className   = 'scan-status error';
    console.error('OCR error:', e);
  }
}

// ── Queue ─────────────────────────────────────────────────────
function addToQueue() {
  const name = document.getElementById('f-name').value.trim();
  const sku  = document.getElementById('f-sku').value.trim();

  if (!name || !sku) { showToast('NAME & SKU ARE REQUIRED', true); return; }

  queue.push({
    name,
    sku,
    genre:   document.getElementById('f-genre').value || null,
    stars:   currentStars || null,
    limited: limitedOn
  });

  resetForm();
  renderQueue();
  document.getElementById('f-name').focus();
  showToast(`✔ "${name}" ADDED — KEEP GOING OR SUBMIT`);
}

function removeFromQueue(index) {
  queue.splice(index, 1);
  renderQueue();
}

function renderQueue() {
  const section = document.getElementById('queue-section');
  const list    = document.getElementById('queue-list');
  const count   = document.getElementById('queue-count');
  const btn     = document.getElementById('submit-btn');

  if (!queue.length) {
    section.style.display = 'none';
    btn.disabled = true;
    return;
  }

  section.style.display = 'block';
  btn.disabled = false;
  count.textContent = queue.length;

  list.innerHTML = queue.map((t, i) => `
    <div class="queue-item">
      <div class="queue-item-info">
        <span class="queue-item-name">${esc(t.name)}</span>
        <span class="queue-item-sku">${esc(t.sku)}</span>
        ${t.genre  ? `<span class="tag tag-genre" style="font-size:13px">${esc(t.genre)}</span>` : ''}
        ${t.stars  ? `<span class="queue-stars">${'★'.repeat(t.stars)}</span>` : ''}
        ${t.limited ? '<span class="limited-badge" style="font-size:12px">★ LIMITED</span>' : ''}
      </div>
      <button class="queue-remove" onclick="removeFromQueue(${i})" title="Remove">✕</button>
    </div>
  `).join('');
}

// ── Submit to GitHub Issue ────────────────────────────────────
function submitToGitHub() {
  if (!queue.length) return;

  const rows = queue.map(t =>
    `| ${t.name} | ${t.sku} | ${t.genre || '—'} | ${'★'.repeat(t.stars || 0) || '—'} | ${t.limited ? 'Yes' : 'No'} |`
  ).join('\n');

  const body = encodeURIComponent(
`## VHS Suggestions

| Name | SKU | Genre | Score | Limited |
|------|-----|-------|-------|---------|
${rows}

---
*Submitted via [REWIND VHS Database](https://${GITHUB_USER}.github.io/${GITHUB_REPO})*`
  );

  const count = queue.length;
  const title = encodeURIComponent(
    count === 1
      ? `[VHS] ${queue[0].name} (${queue[0].sku})`
      : `[VHS] ${count} new tape suggestions`
  );

  window.open(
    `https://github.com/${GITHUB_USER}/${GITHUB_REPO}/issues/new?title=${title}&body=${body}&labels=vhs-submission`,
    '_blank'
  );

  closeModal();
  showToast(`✔ ISSUE OPENED WITH ${count} TAPE${count !== 1 ? 'S' : ''}`);
}

// ── Utilities ─────────────────────────────────────────────────
async function copySKU(sku) {
  try {
    await navigator.clipboard.writeText(sku);
    showToast('✔ SKU COPIED: ' + sku);
  } catch { showToast('SKU: ' + sku); }
}

async function copyShareLink(sku) {
  const url = `${window.location.origin}${window.location.pathname}?sku=${encodeURIComponent(sku)}`;
  try {
    await navigator.clipboard.writeText(url);
    showToast('✔ LINK COPIED');
  } catch { showToast(url); }
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
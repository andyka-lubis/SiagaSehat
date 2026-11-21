/**
 * SiagaSehat — panduan.js
 * =======================
 * Mengelola semua interaksi UI halaman panduan.html:
 *  - Render kartu artikel
 *  - Filter kategori & search
 *  - Modal tambah / edit / detail
 *  - Modal konfirmasi hapus
 */

/* ================================================================
   KONSTANTA & UTILITAS
   ================================================================ */

/** Gambar placeholder per kategori */
const IMG_PLACEHOLDER = {
  'Bencana Alam':       'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600&q=80',
  'Kesehatan Darurat':  'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=600&q=80',
  'Kebakaran':          'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=600&q=80',
  'Pertolongan Pertama':'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&q=80',
};

const KATEGORI_EMOJI = {
  'Bencana Alam':        '🌊',
  'Kesehatan Darurat':   '🏥',
  'Kebakaran':           '🔥',
  'Pertolongan Pertama': '🩹',
};

const KATEGORI_CLASS = {
  'Bencana Alam':        'bencana',
  'Kesehatan Darurat':   'kesehatan',
  'Kebakaran':           'kebakaran',
  'Pertolongan Pertama': 'p3k',
};

const URGENSI_CONFIG = {
  'Tinggi': { cls: 'tinggi', icon: '🔴' },
  'Sedang': { cls: 'sedang', icon: '🟡' },
  'Rendah': { cls: 'rendah', icon: '🟢' },
};

function formatTanggal(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ================================================================
   STATE
   ================================================================ */
let _currentQuery    = '';
let _currentKategori = 'semua';
let _pendingDeleteId = null;

/* ================================================================
   RENDER
   ================================================================ */

/**
 * Render satu kartu panduan sebagai string HTML.
 * @param {Object} item
 * @returns {string}
 */
function renderKartu(item) {
  const urgensiCfg = URGENSI_CONFIG[item.urgensi] || URGENSI_CONFIG['Rendah'];
  const katCls     = KATEGORI_CLASS[item.kategori] || 'bencana';
  const katEmoji   = KATEGORI_EMOJI[item.kategori] || '📋';
  const imgSrc     = item.gambar || IMG_PLACEHOLDER[item.kategori] || '';
  const tagHtml    = item.tag.length
    ? item.tag.slice(0, 4).map((t) => `<span class="tag-chip">${escHtml(t)}</span>`).join('')
    : '';

  const imgEl = imgSrc
    ? `<img class="panduan-card__img" src="${escHtml(imgSrc)}" alt="${escHtml(item.judul)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
       <div class="panduan-card__img--placeholder" style="display:none">${katEmoji}</div>`
    : `<div class="panduan-card__img--placeholder">${katEmoji}</div>`;

  // Tombol Baca Panduan Resmi — hanya muncul jika sumberUrl terisi
  const sumberBtn = item.sumberUrl
    ? `<a class="panduan-card__sumber-btn" href="${escHtml(item.sumberUrl)}" target="_blank" rel="noopener noreferrer"
          title="Baca panduan resmi dari ${escHtml(item.sumberNama || 'sumber resmi')}"
          aria-label="Baca panduan resmi: ${escHtml(item.judul)}">
         🔗 Baca Panduan Resmi ↗
       </a>`
    : '';

  return `
    <article class="panduan-card" data-id="${escHtml(item.id)}" role="button" tabindex="0" aria-label="Buka panduan: ${escHtml(item.judul)}">
      ${imgEl}
      <div class="panduan-card__body">
        <div class="panduan-card__meta">
          <span class="badge badge--${urgensiCfg.cls}">${urgensiCfg.icon} ${escHtml(item.urgensi)}</span>
          <span class="badge badge--kategori badge--${katCls}">${katEmoji} ${escHtml(item.kategori)}</span>
        </div>
        <h3 class="panduan-card__title">${escHtml(item.judul)}</h3>
        <p class="panduan-card__excerpt">${escHtml(item.isi)}</p>
        ${tagHtml ? `<div class="panduan-card__tags">${tagHtml}</div>` : ''}
        ${sumberBtn}
      </div>
      <div class="panduan-card__footer">
        <span class="panduan-card__date">🗓️ ${formatTanggal(item.updatedAt)}</span>
        <div class="panduan-card__actions">
          <button class="btn btn--icon btn--sm" data-action="edit" data-id="${escHtml(item.id)}" title="Edit panduan" aria-label="Edit panduan">✏️</button>
          <button class="btn btn--icon btn--sm" data-action="hapus" data-id="${escHtml(item.id)}" title="Hapus panduan" aria-label="Hapus panduan">🗑️</button>
        </div>
      </div>
    </article>`;
}

/**
 * Render seluruh grid panduan berdasarkan query dan filter aktif.
 */
function renderGrid() {
  const grid       = document.getElementById('panduanGrid');
  const emptyState = document.getElementById('emptyState');
  const resultInfo = document.getElementById('resultInfo');

  const list = DB.panduan.search(_currentQuery, _currentKategori);

  if (list.length === 0) {
    grid.innerHTML = '';
    emptyState.hidden = false;
    resultInfo.textContent = '';
  } else {
    emptyState.hidden = true;
    grid.innerHTML    = list.map(renderKartu).join('');
    const total       = DB.panduan.getAll().length;
    resultInfo.textContent = list.length < total
      ? `Menampilkan ${list.length} dari ${total} artikel`
      : `${total} artikel tersedia`;
  }
}

/* ================================================================
   MODAL FORM
   ================================================================ */
const modalPanduan  = document.getElementById('modalPanduan');
const formPanduan   = document.getElementById('formPanduan');
const modalTitle    = document.getElementById('modalPanduanTitle');
const fldId         = document.getElementById('panduanId');
const fldJudul      = document.getElementById('panduanJudul');
const fldKategori   = document.getElementById('panduanKategori');
const fldUrgensi    = document.getElementById('panduanUrgensi');
const fldTag        = document.getElementById('panduanTag');
const fldGambar     = document.getElementById('panduanGambar');
const fldSumberUrl  = document.getElementById('panduanSumberUrl');
const fldSumberNama = document.getElementById('panduanSumberNama');
const fldIsi        = document.getElementById('panduanIsi');

function bukaModalTambah() {
  fldId.value       = '';
  formPanduan.reset();
  clearFormErrors();
  modalTitle.textContent = 'Tambah Panduan';
  document.getElementById('btnSubmitPanduan').textContent = 'Simpan Panduan';
  modalPanduan.hidden = false;
  fldJudul.focus();
}

function bukaModalEdit(id) {
  const item = DB.panduan.getById(id);
  if (!item) return;
  fldId.value         = item.id;
  fldJudul.value      = item.judul;
  fldKategori.value   = item.kategori;
  fldUrgensi.value    = item.urgensi;
  fldTag.value        = item.tag.join(', ');
  fldGambar.value     = item.gambar;
  fldSumberUrl.value  = item.sumberUrl  || '';
  fldSumberNama.value = item.sumberNama || '';
  fldIsi.value        = item.isi;
  clearFormErrors();
  modalTitle.textContent = 'Edit Panduan';
  document.getElementById('btnSubmitPanduan').textContent = 'Perbarui Panduan';
  modalPanduan.hidden = false;
  fldJudul.focus();
}

function tutupModalForm() {
  modalPanduan.hidden = true;
}

/* ---- Validasi Form ---- */
function clearFormErrors() {
  ['errJudul', 'errKategori', 'errUrgensi', 'errGambar', 'errSumberUrl', 'errIsi'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
  [fldJudul, fldKategori, fldUrgensi, fldGambar, fldSumberUrl, fldIsi].forEach((el) => {
    el.classList.remove('is-invalid');
  });
}

function validateForm() {
  clearFormErrors();
  let valid = true;

  if (!fldJudul.value.trim()) {
    document.getElementById('errJudul').textContent = 'Judul wajib diisi.';
    fldJudul.classList.add('is-invalid');
    valid = false;
  }
  if (!fldKategori.value) {
    document.getElementById('errKategori').textContent = 'Pilih kategori.';
    fldKategori.classList.add('is-invalid');
    valid = false;
  }
  if (!fldUrgensi.value) {
    document.getElementById('errUrgensi').textContent = 'Pilih tingkat urgensi.';
    fldUrgensi.classList.add('is-invalid');
    valid = false;
  }
  if (fldGambar.value.trim() && !isValidUrl(fldGambar.value.trim())) {
    document.getElementById('errGambar').textContent = 'URL gambar tidak valid.';
    fldGambar.classList.add('is-invalid');
    valid = false;
  }
  if (fldSumberUrl.value.trim() && !isValidUrl(fldSumberUrl.value.trim())) {
    document.getElementById('errSumberUrl').textContent = 'URL sumber tidak valid.';
    fldSumberUrl.classList.add('is-invalid');
    valid = false;
  }
  if (!fldIsi.value.trim()) {
    document.getElementById('errIsi').textContent = 'Isi panduan wajib diisi.';
    fldIsi.classList.add('is-invalid');
    valid = false;
  }
  return valid;
}

function isValidUrl(str) {
  try { new URL(str); return true; } catch { return false; }
}

/* ---- Submit ---- */
formPanduan.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const tagArr = fldTag.value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const data = {
    judul:      fldJudul.value,
    kategori:   fldKategori.value,
    urgensi:    fldUrgensi.value,
    tag:        tagArr,
    gambar:     fldGambar.value,
    isi:        fldIsi.value,
    sumberUrl:  fldSumberUrl.value,
    sumberNama: fldSumberNama.value,
  };

  if (fldId.value) {
    DB.panduan.update(fldId.value, data);
    App.toast('Panduan berhasil diperbarui! ✅', 'success');
  } else {
    DB.panduan.create(data);
    App.toast('Panduan baru berhasil ditambahkan! ✅', 'success');
  }

  tutupModalForm();
  renderGrid();
});

/* ================================================================
   MODAL DETAIL
   ================================================================ */
const modalDetail     = document.getElementById('modalDetail');
const modalDetailBody = document.getElementById('modalDetailBody');
const modalDetailTitle= document.getElementById('modalDetailTitle');

function bukaModalDetail(id) {
  const item = DB.panduan.getById(id);
  if (!item) return;

  const urgensiCfg = URGENSI_CONFIG[item.urgensi] || URGENSI_CONFIG['Rendah'];
  const katCls     = KATEGORI_CLASS[item.kategori] || 'bencana';
  const katEmoji   = KATEGORI_EMOJI[item.kategori] || '📋';
  const imgSrc     = item.gambar || IMG_PLACEHOLDER[item.kategori] || '';
  const tagHtml    = item.tag.length
    ? item.tag.map((t) => `<span class="tag-chip">${escHtml(t)}</span>`).join('')
    : '';

  const imgHtml = imgSrc
    ? `<img class="detail-img" src="${escHtml(imgSrc)}" alt="${escHtml(item.judul)}" onerror="this.remove()" />`
    : '';

  // Blok sumber resmi di modal detail
  const sumberDetailHtml = item.sumberUrl
    ? `<div class="detail-sumber">
         <span class="detail-sumber__label">📌 Sumber Resmi:</span>
         <a class="detail-sumber__link" href="${escHtml(item.sumberUrl)}" target="_blank" rel="noopener noreferrer">
           ${escHtml(item.sumberNama || item.sumberUrl)} ↗
         </a>
       </div>`
    : '';

  modalDetailTitle.textContent = item.judul;
  modalDetailBody.innerHTML = `
    ${imgHtml}
    <div class="detail-meta">
      <span class="badge badge--${urgensiCfg.cls}">${urgensiCfg.icon} ${escHtml(item.urgensi)}</span>
      <span class="badge badge--kategori badge--${katCls}">${katEmoji} ${escHtml(item.kategori)}</span>
    </div>
    <h2 class="detail-title">${escHtml(item.judul)}</h2>
    ${tagHtml ? `<div class="detail-tags">${tagHtml}</div>` : ''}
    <pre class="detail-isi">${escHtml(item.isi)}</pre>
    ${sumberDetailHtml}
    <p class="detail-date">Terakhir diperbarui: ${formatTanggal(item.updatedAt)}</p>
    <div class="modal__footer" style="margin-top:20px;">
      <button class="btn btn--ghost" id="btnDetailTutup">Tutup</button>
      ${item.sumberUrl ? `<a class="btn btn--outline-primary" href="${escHtml(item.sumberUrl)}" target="_blank" rel="noopener noreferrer">🔗 Baca Panduan Resmi ↗</a>` : ''}
      <button class="btn btn--primary" data-action="edit" data-id="${escHtml(item.id)}">✏️ Edit</button>
    </div>`;

  document.getElementById('btnDetailTutup').addEventListener('click', () => {
    modalDetail.hidden = true;
  });

  modalDetail.hidden = false;
}

/* ================================================================
   MODAL HAPUS
   ================================================================ */
const modalHapus   = document.getElementById('modalHapus');
const hapusJudul   = document.getElementById('hapusJudul');

function bukaModalHapus(id) {
  const item = DB.panduan.getById(id);
  if (!item) return;
  _pendingDeleteId    = id;
  hapusJudul.textContent = item.judul;
  modalHapus.hidden   = false;
}

function tutupModalHapus() {
  modalHapus.hidden   = true;
  _pendingDeleteId    = null;
}

document.getElementById('btnKonfirmasiHapus').addEventListener('click', () => {
  if (!_pendingDeleteId) return;
  DB.panduan.delete(_pendingDeleteId);
  tutupModalHapus();
  renderGrid();
  App.toast('Panduan berhasil dihapus.', 'info');
});

/* ================================================================
   EVENT DELEGATION — Grid
   ================================================================ */
document.getElementById('panduanGrid').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (btn) {
    e.stopPropagation();
    const id = btn.dataset.id;
    if (btn.dataset.action === 'edit') {
      bukaModalEdit(id);
    } else if (btn.dataset.action === 'hapus') {
      bukaModalHapus(id);
    }
    return;
  }
  // Klik di kartu → buka detail
  const card = e.target.closest('.panduan-card');
  if (card) bukaModalDetail(card.dataset.id);
});

// Keyboard support (Enter/Space) untuk kartu
document.getElementById('panduanGrid').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    const card = e.target.closest('.panduan-card');
    if (card) { e.preventDefault(); bukaModalDetail(card.dataset.id); }
  }
});

// Edit dari modal detail
document.getElementById('modalDetail').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action="edit"]');
  if (btn) {
    modalDetail.hidden = true;
    bukaModalEdit(btn.dataset.id);
  }
});

/* ================================================================
   FILTER & SEARCH
   ================================================================ */
document.getElementById('filterKategori').addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('#filterKategori .filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  _currentKategori = btn.dataset.filter;
  renderGrid();
});

let _searchTimer;
document.getElementById('searchPanduan').addEventListener('input', (e) => {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => {
    _currentQuery = e.target.value;
    renderGrid();
  }, 280);
});

/* ================================================================
   TOMBOL BUKA / TUTUP MODAL
   ================================================================ */
document.getElementById('btnTambahPanduan').addEventListener('click', bukaModalTambah);
document.getElementById('btnCloseModalPanduan').addEventListener('click', tutupModalForm);
document.getElementById('btnCancelPanduan').addEventListener('click', tutupModalForm);
document.getElementById('btnCloseDetail').addEventListener('click', () => { modalDetail.hidden = true; });
document.getElementById('btnCloseHapus').addEventListener('click', tutupModalHapus);
document.getElementById('btnCancelHapus').addEventListener('click', tutupModalHapus);

// Tutup modal ketika klik overlay
[modalPanduan, modalDetail, modalHapus].forEach((overlay) => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.hidden = true;
  });
});

// Tutup modal dengan Escape
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!modalPanduan.hidden) tutupModalForm();
  if (!modalDetail.hidden) modalDetail.hidden = true;
  if (!modalHapus.hidden) tutupModalHapus();
});

/* ================================================================
   FILTER DARI URL PARAMS (dari klik kategori di index.html)
   ================================================================ */
(function applyUrlFilter() {
  const params   = new URLSearchParams(window.location.search);
  const kategori = params.get('kategori');
  if (kategori) {
    _currentKategori = kategori;
    document.querySelectorAll('#filterKategori .filter-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === kategori);
    });
  }
})();

/* ================================================================
   INISIALISASI
   ================================================================ */
renderGrid();

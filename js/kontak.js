/**
 * SiagaSehat — kontak.js
 * ======================
 * Mengelola semua interaksi UI halaman kontak.html:
 *  - Render kartu kontak darurat
 *  - Filter kategori & search
 *  - Modal tambah / edit
 *  - Modal konfirmasi hapus
 *  - Tombol: Salin Nomor, WhatsApp, Lihat Peta
 */

/* ================================================================
   KONSTANTA & UTILITAS
   ================================================================ */

const KATEGORI_KONTAK_CFG = {
  'Polisi':             { cls: 'polisi',   icon: '🚔' },
  'Pemadam Kebakaran':  { cls: 'pemadam',  icon: '🚒' },
  'Medis/Ambulans':     { cls: 'medis',    icon: '🚑' },
  'BPBD':               { cls: 'bpbd',     icon: '🏛️' },
  'SAR':                { cls: 'sar',      icon: '⛑️' },
};

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
 * Render satu kartu kontak sebagai string HTML.
 * @param {Object} item
 * @returns {string}
 */
function renderKartu(item) {
  const cfg = KATEGORI_KONTAK_CFG[item.kategori] || { cls: 'bpbd', icon: '📞' };

  // Tombol WhatsApp hanya jika nomor WA tersedia
  const waBtn = item.whatsapp
    ? `<a href="https://wa.me/${escHtml(item.whatsapp.replace(/\D/g,''))}" target="_blank" rel="noopener" class="btn btn--sm" style="background:#25d366;color:#fff;border-color:#25d366;" title="Hubungi via WhatsApp">
         💬 WhatsApp
       </a>`
    : '';

  // Encode alamat + kota untuk URL Google Maps
  const mapsQuery = encodeURIComponent(`${item.alamat}, ${item.kota}`);
  const mapsBtn   = `<a href="https://www.google.com/maps/search/?api=1&query=${mapsQuery}" target="_blank" rel="noopener" class="btn btn--sm btn--ghost" title="Lihat di Google Maps">
      🗺️ Peta
    </a>`;

  const catatanHtml = item.catatan
    ? `<p class="kontak-card__catatan">ℹ️ ${escHtml(item.catatan)}</p>`
    : '';

  return `
    <div class="kontak-card" data-id="${escHtml(item.id)}">
      <div class="kontak-card__header">
        <div>
          <span class="badge badge--kategori badge--${cfg.cls}">${cfg.icon} ${escHtml(item.kategori)}</span>
        </div>
        <div class="kontak-card__edit-actions">
          <button class="btn btn--icon btn--sm" data-action="edit" data-id="${escHtml(item.id)}" title="Edit kontak" aria-label="Edit kontak">✏️</button>
          <button class="btn btn--icon btn--sm" data-action="hapus" data-id="${escHtml(item.id)}" title="Hapus kontak" aria-label="Hapus kontak">🗑️</button>
        </div>
      </div>

      <h3 class="kontak-card__nama">${escHtml(item.nama)}</h3>
      <p class="kontak-card__telepon">${escHtml(item.telepon)}</p>

      <div class="kontak-card__detail">
        <div class="kontak-card__row">
          <span class="kontak-card__row-icon">📍</span>
          <span>${escHtml(item.alamat)}, ${escHtml(item.kota)}</span>
        </div>
      </div>

      ${catatanHtml}

      <div class="kontak-card__actions">
        <button class="btn btn--sm btn--primary" data-action="salin" data-nomor="${escHtml(item.telepon)}" title="Salin nomor telepon">
          📋 Salin Nomor
        </button>
        ${waBtn}
        ${mapsBtn}
      </div>
    </div>`;
}

/**
 * Render seluruh grid kontak berdasarkan query dan filter aktif.
 */
function renderGrid() {
  const grid       = document.getElementById('kontakGrid');
  const emptyState = document.getElementById('emptyStateKontak');
  const resultInfo = document.getElementById('resultInfoKontak');

  const list = DB.kontak.search(_currentQuery, _currentKategori);

  if (list.length === 0) {
    grid.innerHTML   = '';
    emptyState.hidden = false;
    resultInfo.textContent = '';
  } else {
    emptyState.hidden = true;
    grid.innerHTML    = list.map(renderKartu).join('');
    const total       = DB.kontak.getAll().length;
    resultInfo.textContent = list.length < total
      ? `Menampilkan ${list.length} dari ${total} kontak`
      : `${total} kontak tersedia`;
  }
}

/* ================================================================
   MODAL FORM KONTAK
   ================================================================ */
const modalKontak    = document.getElementById('modalKontak');
const formKontak     = document.getElementById('formKontak');
const modalKontakTitle = document.getElementById('modalKontakTitle');
const fldKontakId    = document.getElementById('kontakId');
const fldNama        = document.getElementById('kontakNama');
const fldKategori    = document.getElementById('kontakKategori');
const fldTelepon     = document.getElementById('kontakTelepon');
const fldWhatsapp    = document.getElementById('kontakWhatsapp');
const fldAlamat      = document.getElementById('kontakAlamat');
const fldKota        = document.getElementById('kontakKota');
const fldCatatan     = document.getElementById('kontakCatatan');

function bukaModalTambah() {
  fldKontakId.value = '';
  formKontak.reset();
  clearFormErrors();
  modalKontakTitle.textContent = 'Tambah Kontak Darurat';
  document.getElementById('btnSubmitKontak').textContent = 'Simpan Kontak';
  modalKontak.hidden = false;
  fldNama.focus();
}

function bukaModalEdit(id) {
  const item = DB.kontak.getById(id);
  if (!item) return;
  fldKontakId.value  = item.id;
  fldNama.value      = item.nama;
  fldKategori.value  = item.kategori;
  fldTelepon.value   = item.telepon;
  fldWhatsapp.value  = item.whatsapp;
  fldAlamat.value    = item.alamat;
  fldKota.value      = item.kota;
  fldCatatan.value   = item.catatan;
  clearFormErrors();
  modalKontakTitle.textContent = 'Edit Kontak Darurat';
  document.getElementById('btnSubmitKontak').textContent = 'Perbarui Kontak';
  modalKontak.hidden = false;
  fldNama.focus();
}

function tutupModalForm() {
  modalKontak.hidden = true;
}

/* ---- Validasi Form ---- */
function clearFormErrors() {
  ['errKontakNama','errKontakKategori','errKontakTelepon','errKontakAlamat','errKontakKota'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
  [fldNama, fldKategori, fldTelepon, fldAlamat, fldKota].forEach((el) => {
    el.classList.remove('is-invalid');
  });
}

function validateForm() {
  clearFormErrors();
  let valid = true;

  if (!fldNama.value.trim()) {
    document.getElementById('errKontakNama').textContent = 'Nama instansi wajib diisi.';
    fldNama.classList.add('is-invalid');
    valid = false;
  }
  if (!fldKategori.value) {
    document.getElementById('errKontakKategori').textContent = 'Pilih kategori instansi.';
    fldKategori.classList.add('is-invalid');
    valid = false;
  }
  if (!fldTelepon.value.trim()) {
    document.getElementById('errKontakTelepon').textContent = 'Nomor telepon wajib diisi.';
    fldTelepon.classList.add('is-invalid');
    valid = false;
  }
  if (!fldAlamat.value.trim()) {
    document.getElementById('errKontakAlamat').textContent = 'Alamat wajib diisi.';
    fldAlamat.classList.add('is-invalid');
    valid = false;
  }
  if (!fldKota.value.trim()) {
    document.getElementById('errKontakKota').textContent = 'Wilayah/kota wajib diisi.';
    fldKota.classList.add('is-invalid');
    valid = false;
  }
  return valid;
}

/* ---- Submit ---- */
formKontak.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const data = {
    nama:     fldNama.value,
    kategori: fldKategori.value,
    telepon:  fldTelepon.value,
    whatsapp: fldWhatsapp.value,
    alamat:   fldAlamat.value,
    kota:     fldKota.value,
    catatan:  fldCatatan.value,
  };

  if (fldKontakId.value) {
    DB.kontak.update(fldKontakId.value, data);
    App.toast('Kontak berhasil diperbarui! ✅', 'success');
  } else {
    DB.kontak.create(data);
    App.toast('Kontak baru berhasil ditambahkan! ✅', 'success');
  }

  tutupModalForm();
  renderGrid();
});

/* ================================================================
   MODAL HAPUS
   ================================================================ */
const modalHapusKontak  = document.getElementById('modalHapusKontak');
const hapusNamaKontak   = document.getElementById('hapusNamaKontak');

function bukaModalHapus(id) {
  const item = DB.kontak.getById(id);
  if (!item) return;
  _pendingDeleteId = id;
  hapusNamaKontak.textContent = item.nama;
  modalHapusKontak.hidden = false;
}

function tutupModalHapus() {
  modalHapusKontak.hidden = true;
  _pendingDeleteId = null;
}

document.getElementById('btnKonfirmasiHapusKontak').addEventListener('click', () => {
  if (!_pendingDeleteId) return;
  DB.kontak.delete(_pendingDeleteId);
  tutupModalHapus();
  renderGrid();
  App.toast('Kontak berhasil dihapus.', 'info');
});

/* ================================================================
   EVENT DELEGATION — Grid
   ================================================================ */
document.getElementById('kontakGrid').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const id     = btn.dataset.id;

  if (action === 'edit') {
    bukaModalEdit(id);
  } else if (action === 'hapus') {
    bukaModalHapus(id);
  } else if (action === 'salin') {
    const nomor = btn.dataset.nomor || '';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(nomor).then(() => {
        App.toast(`Nomor <strong>${nomor}</strong> berhasil disalin 📋`, 'success');
      }).catch(() => {
        App.toast('Gagal menyalin nomor. Coba lagi.', 'error');
      });
    } else {
      // Fallback untuk browser lama
      const tmp = document.createElement('textarea');
      tmp.value = nomor;
      tmp.style.position = 'fixed';
      tmp.style.opacity  = '0';
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand('copy');
      document.body.removeChild(tmp);
      App.toast(`Nomor <strong>${nomor}</strong> berhasil disalin 📋`, 'success');
    }
  }
});

/* ================================================================
   FILTER & SEARCH
   ================================================================ */
document.getElementById('filterKontak').addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('#filterKontak .filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  _currentKategori = btn.dataset.filter;
  renderGrid();
});

let _searchTimer;
document.getElementById('searchKontak').addEventListener('input', (e) => {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => {
    _currentQuery = e.target.value;
    renderGrid();
  }, 280);
});

/* ================================================================
   TOMBOL BUKA / TUTUP MODAL
   ================================================================ */
document.getElementById('btnTambahKontak').addEventListener('click', bukaModalTambah);
document.getElementById('btnCloseModalKontak').addEventListener('click', tutupModalForm);
document.getElementById('btnCancelKontak').addEventListener('click', tutupModalForm);
document.getElementById('btnCloseHapusKontak').addEventListener('click', tutupModalHapus);
document.getElementById('btnCancelHapusKontak').addEventListener('click', tutupModalHapus);

// Tutup modal ketika klik overlay
[modalKontak, modalHapusKontak].forEach((overlay) => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.hidden = true;
  });
});

// Tutup modal dengan Escape
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!modalKontak.hidden) tutupModalForm();
  if (!modalHapusKontak.hidden) tutupModalHapus();
});

/* ================================================================
   INISIALISASI
   ================================================================ */
renderGrid();

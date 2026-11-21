/**
 * SiagaSehat — app.js
 * ===================
 * Modul global yang dijalankan di SEMUA halaman.
 * Tanggung jawab:
 *  1. Navigasi mobile (hamburger toggle)
 *  2. Sistem toast notifikasi
 *
 * Dependensi: db.js harus dimuat sebelum app.js.
 * API publik yang diekspos: window.App = { toast }
 */

const App = (() => {

  /* ================================================================
     1. NAVIGASI MOBILE
     ================================================================ */
  function initNavbar() {
    const toggle = document.getElementById('navToggle');
    const mobile = document.getElementById('navMobile');
    if (!toggle || !mobile) return;

    toggle.addEventListener('click', () => {
      const isOpen = mobile.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen);
      toggle.setAttribute('aria-label', isOpen ? 'Tutup menu' : 'Buka menu');
    });

    // Tutup menu ketika salah satu link diklik
    mobile.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        mobile.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Tutup menu ketika klik di luar navbar
    document.addEventListener('click', (e) => {
      if (!mobile.contains(e.target) && !toggle.contains(e.target)) {
        mobile.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ================================================================
     2. TOAST NOTIFICATIONS
     ================================================================ */

  /**
   * Tampilkan notifikasi toast.
   * @param {string} message  — Teks pesan (HTML diizinkan)
   * @param {'success'|'error'|'info'} type
   * @param {number} duration — Durasi tampil dalam ms (default: 3200)
   */
  function toast(message, type = 'info', duration = 3200) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icon = type === 'success' ? '✅'
               : type === 'error'   ? '❌'
               :                     'ℹ️';

    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `<span class="toast__icon">${icon}</span><span>${message}</span>`;

    container.appendChild(el);

    // Auto-remove
    setTimeout(() => {
      el.classList.add('fade-out');
      el.addEventListener('animationend', () => el.remove(), { once: true });
      // Safety net jika animasi tidak berjalan
      setTimeout(() => { if (el.parentNode) el.remove(); }, 400);
    }, duration);
  }

  /* ================================================================
     INIT
     ================================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
  });

  // Jika DOMContentLoaded sudah lewat (skrip di bawah body)
  if (document.readyState !== 'loading') {
    initNavbar();
  }

  /* ================================================================
     PUBLIC API
     ================================================================ */
  return { toast };

})();

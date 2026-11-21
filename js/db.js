/**
 * SiagaSehat — db.js
 * ==================
 * Lapisan tunggal yang mengelola semua akses ke LocalStorage.
 * Tidak ada modul lain yang boleh menyentuh localStorage secara langsung.
 *
 * Skema Panduan:
 *   { id, judul, kategori, urgensi, tag[], gambar, isi, sumberUrl, sumberNama, updatedAt }
 *
 * Skema Kontak:
 *   { id, nama, kategori, telepon, whatsapp, alamat, kota, catatan, createdAt }
 */

const DB = (() => {
  /* ---- Keys ---- */
  const KEY_PANDUAN = 'siagasehat_panduan';
  const KEY_KONTAK  = 'siagasehat_kontak';

  /* ---- Helpers ---- */
  function _read(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  }

  function _write(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function _now() {
    return new Date().toISOString();
  }

  /* ================================================================
     PANDUAN
     ================================================================ */
  const panduan = {
    /**
     * Ambil semua artikel panduan (array).
     * Jika belum ada data sama sekali, inisialisasi dengan 4 artikel seed.
     * @returns {Array}
     */
    getAll() {
      const list = _read(KEY_PANDUAN);
      if (list.length === 0) {
        _write(KEY_PANDUAN, SEED_PANDUAN);
        return [...SEED_PANDUAN];
      }
      return list;
    },

    /**
     * Ambil satu artikel berdasarkan ID.
     * @param {string} id
     * @returns {Object|null}
     */
    getById(id) {
      return this.getAll().find((p) => p.id === id) || null;
    },

    /**
     * Tambah artikel baru.
     * @param {Object} data  — { judul, kategori, urgensi, tag, gambar, isi }
     * @returns {Object}      artikel yang baru dibuat
     */
    create(data) {
      const list = this.getAll();
      const item = {
        id:         _uuid(),
        judul:      (data.judul      || '').trim(),
        kategori:   data.kategori    || '',
        urgensi:    data.urgensi     || 'Rendah',
        tag:        Array.isArray(data.tag)
                      ? data.tag.map((t) => t.trim()).filter(Boolean)
                      : [],
        gambar:     (data.gambar     || '').trim(),
        isi:        (data.isi        || '').trim(),
        sumberUrl:  (data.sumberUrl  || '').trim(),
        sumberNama: (data.sumberNama || '').trim(),
        updatedAt:  _now(),
      };
      list.unshift(item);
      _write(KEY_PANDUAN, list);
      return item;
    },

    /**
     * Perbarui artikel yang sudah ada.
     * @param {string} id
     * @param {Object} data  — field yang diperbarui
     * @returns {Object|null} artikel yang sudah diperbarui, atau null jika tidak ditemukan
     */
    update(id, data) {
      const list = this.getAll();
      const idx  = list.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      const updated = {
        ...list[idx],
        judul:      (data.judul      !== undefined) ? data.judul.trim()      : list[idx].judul,
        kategori:   (data.kategori   !== undefined) ? data.kategori          : list[idx].kategori,
        urgensi:    (data.urgensi    !== undefined) ? data.urgensi           : list[idx].urgensi,
        tag:        Array.isArray(data.tag)
                      ? data.tag.map((t) => t.trim()).filter(Boolean)
                      : list[idx].tag,
        gambar:     (data.gambar     !== undefined) ? data.gambar.trim()     : list[idx].gambar,
        isi:        (data.isi        !== undefined) ? data.isi.trim()        : list[idx].isi,
        sumberUrl:  (data.sumberUrl  !== undefined) ? data.sumberUrl.trim()  : (list[idx].sumberUrl  || ''),
        sumberNama: (data.sumberNama !== undefined) ? data.sumberNama.trim() : (list[idx].sumberNama || ''),
        updatedAt:  _now(),
      };
      list[idx] = updated;
      _write(KEY_PANDUAN, list);
      return updated;
    },

    /**
     * Hapus artikel berdasarkan ID.
     * @param {string} id
     * @returns {boolean}
     */
    delete(id) {
      const list    = this.getAll();
      const filtered = list.filter((p) => p.id !== id);
      if (filtered.length === list.length) return false;
      _write(KEY_PANDUAN, filtered);
      return true;
    },

    /**
     * Cari & filter artikel.
     * @param {string} query     — teks pencarian (judul/tag/isi)
     * @param {string} kategori  — 'semua' atau nilai kategori
     * @returns {Array}
     */
    search(query, kategori) {
      let list = this.getAll();
      if (kategori && kategori !== 'semua') {
        list = list.filter((p) => p.kategori === kategori);
      }
      if (query && query.trim()) {
        const q = query.trim().toLowerCase();
        list = list.filter(
          (p) =>
            p.judul.toLowerCase().includes(q) ||
            p.isi.toLowerCase().includes(q)   ||
            p.tag.some((t) => t.toLowerCase().includes(q))
        );
      }
      return list;
    },
  };

  /* ================================================================
     SEED DATA PANDUAN
     ================================================================ */

  /**
   * 4 artikel panduan bawaan dengan ringkasan akurat dan tautan resmi.
   * Hanya dimuat jika KEY_PANDUAN belum ada di localStorage.
   */
  const SEED_PANDUAN = [
    {
      id:         'panduan-001',
      judul:      'Langkah Evakuasi Darurat Saat Banjir',
      kategori:   'Bencana Alam',
      urgensi:    'Tinggi',
      tag:        ['banjir', 'evakuasi', 'keselamatan', 'BNPB'],
      gambar:     '',
      isi:        '1. Pantau informasi resmi BMKG dan BPBD setempat sejak dini.\n2. Siapkan tas siaga berisi dokumen penting, obat-obatan, air, dan makanan untuk 3 hari.\n3. Matikan aliran listrik dari panel utama sebelum meninggalkan rumah.\n4. Evakuasi segera ke lokasi yang lebih tinggi atau titik kumpul yang sudah ditentukan.\n5. Jangan menyeberangi aliran banjir meski terlihat dangkal — arus tersembunyi sangat berbahaya.\n6. Hindari jembatan di atas sungai yang meluap.\n7. Setelah banjir surut, hati-hati terhadap kontaminasi air bersih dan wabah penyakit.\n8. Laporkan kondisi wilayah Anda ke BPBD setempat.',
      sumberUrl:  'https://bnpb.go.id/berita/kenali-ancaman-banjir-dan-cara-menghadapinya',
      sumberNama: 'BNPB — Badan Nasional Penanggulangan Bencana',
      updatedAt:  '2026-01-01T00:00:00.000Z',
    },
    {
      id:         'panduan-002',
      judul:      'Perlindungan Diri Saat Gempa Bumi',
      kategori:   'Bencana Alam',
      urgensi:    'Tinggi',
      tag:        ['gempa', 'bumi', 'lindungi', 'BNPB'],
      gambar:     '',
      isi:        '1. Jika di dalam gedung: berlindung di bawah meja kokoh, lindungi kepala dengan tangan — DROP, COVER, HOLD ON.\n2. Jauhi jendela, lemari, dan benda yang bisa jatuh.\n3. Jangan berlari keluar saat guncangan masih terjadi — bahaya reruntuhan di ambang pintu sangat tinggi.\n4. Jika di luar gedung: menjauh dari gedung, pohon, tiang listrik, dan jembatan.\n5. Jika di pantai: segera menjauh ke daratan lebih tinggi — waspadai potensi tsunami.\n6. Setelah gempa: matikan gas, periksa kebocoran, dan keluar dengan hati-hati.\n7. Ikuti arahan resmi BPBD dan jangan percaya informasi tidak resmi.',
      sumberUrl:  'https://bnpb.go.id/berita/langkah-yang-harus-dilakukan-saat-gempa-bumi',
      sumberNama: 'BNPB — Badan Nasional Penanggulangan Bencana',
      updatedAt:  '2026-01-01T00:00:00.000Z',
    },
    {
      id:         'panduan-003',
      judul:      'Pertolongan Pertama Henti Jantung (CPR)',
      kategori:   'Pertolongan Pertama',
      urgensi:    'Tinggi',
      tag:        ['CPR', 'henti jantung', 'RJP', 'kemenkes'],
      gambar:     '',
      isi:        '1. Pastikan lokasi aman, lalu tepuk bahu korban dan panggil namanya dengan keras.\n2. Jika tidak ada respons: segera hubungi 119 (ambulans) atau minta orang lain menelepon.\n3. Posisikan korban telentang di permukaan keras dan rata.\n4. Lakukan kompresi dada: tumit telapak tangan di tengah dada, tekan sedalam 5–6 cm dengan kecepatan 100–120 kali/menit.\n5. Jika terlatih: berikan 2 napas buatan setiap 30 kompresi (rasio 30:2).\n6. Jika tidak terlatih: lanjutkan kompresi dada saja tanpa henti hingga bantuan medis tiba.\n7. Gunakan AED (Automated External Defibrillator) jika tersedia — ikuti instruksi suara alat.\n8. Terus lakukan RJP hingga korban bernapas normal atau petugas medis mengambil alih.',
      sumberUrl:  'https://ayosehat.kemkes.go.id/pertolongan-pertama-pada-henti-jantung',
      sumberNama: 'Kemenkes RI — AyoSehat',
      updatedAt:  '2026-01-01T00:00:00.000Z',
    },
    {
      id:         'panduan-004',
      judul:      'Penanganan Luka Bakar Tingkat Ringan hingga Sedang',
      kategori:   'Kesehatan Darurat',
      urgensi:    'Sedang',
      tag:        ['luka bakar', 'pertolongan pertama', 'kemenkes', 'P3K'],
      gambar:     '',
      isi:        '1. Segera jauhkan korban dari sumber panas dan pastikan area aman.\n2. Siram area yang terbakar dengan air mengalir bersuhu normal (bukan dingin/es) selama minimal 20 menit.\n3. JANGAN gunakan pasta gigi, kecap, mentega, atau minyak — dapat memperparah luka dan risiko infeksi.\n4. JANGAN memecahkan lepuhan yang terbentuk.\n5. Lepaskan pakaian dan perhiasan di sekitar luka bakar dengan hati-hati (jangan paksa jika menempel).\n6. Tutup luka dengan perban steril atau kain bersih yang tidak berbulu.\n7. Luka bakar Tingkat 2 (lepuhan, sangat nyeri) dan Tingkat 3 (kulit gosong): segera bawa ke IGD rumah sakit.\n8. Pantau tanda infeksi: kemerahan menyebar, bengkak, nanah, atau demam.',
      sumberUrl:  'https://ayosehat.kemkes.go.id/pertolongan-pertama-pada-luka-bakar',
      sumberNama: 'Kemenkes RI — AyoSehat',
      updatedAt:  '2026-01-01T00:00:00.000Z',
    },
  ];

  /* ================================================================
     KONTAK
     ================================================================ */

  /** Data seed kontak darurat Indonesia */
  const SEED_KONTAK = [
    {
      id:        'seed-001',
      nama:      'Layanan Darurat Nasional',
      kategori:  'Polisi',
      telepon:   '112',
      whatsapp:  '',
      alamat:    'Tersedia di seluruh wilayah Indonesia',
      kota:      'Nasional',
      catatan:   'Layanan darurat terintegrasi 24 Jam — Polisi, Kebakaran, dan Medis',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id:        'seed-002',
      nama:      'Ambulans & Kesehatan Darurat (119)',
      kategori:  'Medis/Ambulans',
      telepon:   '119',
      whatsapp:  '',
      alamat:    'Kementerian Kesehatan RI, Jl. H.R. Rasuna Said Blok X5 Kav. 4-9',
      kota:      'Jakarta Selatan',
      catatan:   'Siaga 24 Jam — Hotline Kemenkes dan Ambulans Nasional',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id:        'seed-003',
      nama:      'Pemadam Kebakaran Jakarta (113)',
      kategori:  'Pemadam Kebakaran',
      telepon:   '113',
      whatsapp:  '',
      alamat:    'Jl. Tanah Abang Selatan No.1',
      kota:      'Jakarta Pusat',
      catatan:   'Siaga 24 Jam — Dinas Penanggulangan Kebakaran dan Penyelamatan DKI Jakarta',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id:        'seed-004',
      nama:      'BPBD DKI Jakarta',
      kategori:  'BPBD',
      telepon:   '(021) 3451777',
      whatsapp:  '6281111573366',
      alamat:    'Jl. Medan Merdeka Selatan No.8-9, Gambir',
      kota:      'Jakarta Pusat',
      catatan:   'Badan Penanggulangan Bencana Daerah — Siaga 24 Jam',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id:        'seed-005',
      nama:      'PMI (Palang Merah Indonesia)',
      kategori:  'SAR',
      telepon:   '021-7992325',
      whatsapp:  '6281234567001',
      alamat:    'Jl. Jenderal Gatot Subroto Kav. 96',
      kota:      'Jakarta Selatan',
      catatan:   'Donor darah, penanganan bencana, dan evakuasi korban',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  const kontak = {
    /**
     * Ambil semua kontak. Jika belum ada data, inisialisasi dengan seed.
     * @returns {Array}
     */
    getAll() {
      const list = _read(KEY_KONTAK);
      if (list.length === 0) {
        _write(KEY_KONTAK, SEED_KONTAK);
        return [...SEED_KONTAK];
      }
      return list;
    },

    /**
     * Ambil satu kontak berdasarkan ID.
     * @param {string} id
     * @returns {Object|null}
     */
    getById(id) {
      return this.getAll().find((k) => k.id === id) || null;
    },

    /**
     * Tambah kontak baru.
     * @param {Object} data
     * @returns {Object}
     */
    create(data) {
      const list = this.getAll();
      const item = {
        id:        _uuid(),
        nama:      (data.nama      || '').trim(),
        kategori:  data.kategori   || '',
        telepon:   (data.telepon   || '').trim(),
        whatsapp:  (data.whatsapp  || '').trim(),
        alamat:    (data.alamat    || '').trim(),
        kota:      (data.kota      || '').trim(),
        catatan:   (data.catatan   || '').trim(),
        createdAt: _now(),
      };
      list.unshift(item);
      _write(KEY_KONTAK, list);
      return item;
    },

    /**
     * Perbarui kontak yang sudah ada.
     * @param {string} id
     * @param {Object} data
     * @returns {Object|null}
     */
    update(id, data) {
      const list = this.getAll();
      const idx  = list.findIndex((k) => k.id === id);
      if (idx === -1) return null;
      const updated = {
        ...list[idx],
        nama:     (data.nama     !== undefined) ? data.nama.trim()     : list[idx].nama,
        kategori: (data.kategori !== undefined) ? data.kategori        : list[idx].kategori,
        telepon:  (data.telepon  !== undefined) ? data.telepon.trim()  : list[idx].telepon,
        whatsapp: (data.whatsapp !== undefined) ? data.whatsapp.trim() : list[idx].whatsapp,
        alamat:   (data.alamat   !== undefined) ? data.alamat.trim()   : list[idx].alamat,
        kota:     (data.kota     !== undefined) ? data.kota.trim()     : list[idx].kota,
        catatan:  (data.catatan  !== undefined) ? data.catatan.trim()  : list[idx].catatan,
      };
      list[idx] = updated;
      _write(KEY_KONTAK, list);
      return updated;
    },

    /**
     * Hapus kontak berdasarkan ID.
     * @param {string} id
     * @returns {boolean}
     */
    delete(id) {
      const list     = this.getAll();
      const filtered = list.filter((k) => k.id !== id);
      if (filtered.length === list.length) return false;
      _write(KEY_KONTAK, filtered);
      return true;
    },

    /**
     * Cari & filter kontak.
     * @param {string} query    — teks pencarian
     * @param {string} kategori — 'semua' atau nilai kategori
     * @returns {Array}
     */
    search(query, kategori) {
      let list = this.getAll();
      if (kategori && kategori !== 'semua') {
        list = list.filter((k) => k.kategori === kategori);
      }
      if (query && query.trim()) {
        const q = query.trim().toLowerCase();
        list = list.filter(
          (k) =>
            k.nama.toLowerCase().includes(q)     ||
            k.telepon.toLowerCase().includes(q)  ||
            k.kota.toLowerCase().includes(q)     ||
            k.alamat.toLowerCase().includes(q)
        );
      }
      return list;
    },
  };

  /* ================================================================
     PUBLIC API
     ================================================================ */
  return { panduan, kontak };
})();

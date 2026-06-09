# Sisa Uang

Aplikasi catatan keuangan pribadi berbasis web. Gratis, tanpa akun wajib, bisa dipakai offline.

**Live:** [sisauang.vercel.app](https://sisauang.vercel.app)

---

## Fitur

### Transaksi
- Catat pemasukan & pengeluaran dengan 14 kategori (Gaji, Makanan, Transport, dll.)
- Edit dan hapus transaksi (dengan konfirmasi)
- Cegah double entry — transaksi dengan nominal, keterangan, dan tanggal sama ditolak
- Maksimal 50 transaksi per hari
- Input nominal maksimal Rp 999.999.999.999

### Ringkasan Dashboard
- Saldo bersih, total pemasukan, total pengeluaran
- Navigasi periode: minggu ini / bulan ini (bisa geser ke periode sebelumnya)
- Grafik bar harian (mode minggu) dan breakdown per minggu (mode bulan)
- Breakdown pengeluaran per kategori dengan progress bar
- 5 transaksi terakhir

### Budget
- Atur budget per kategori pengeluaran
- Progress bar visual penggunaan budget
- Badge **HAMPIR** (>=80%) dan **OVER** saat budget terlampaui
- Budget mengikuti periode aktif, otomatis reset tiap ganti periode

### Riwayat
- Dikelompokkan per tanggal dengan subtotal harian
- Filter: Semua / Masuk / Keluar
- Pencarian transaksi berdasarkan keterangan
- Pagination load-more (20 per load)
- Menampilkan transaksi 6 bulan terakhir

### Export CSV
- Export semua transaksi 1 tahun terakhir
- Format: Tanggal, Tipe, Kategori, Keterangan, Nominal

### Sync & Auth
- Default pakai localStorage — tidak perlu akun
- Login Google opsional untuk sync data antar perangkat via Firestore
- Auto-migrasi data lokal ke cloud saat pertama login (jika cloud masih kosong)
- Offline support — input tetap bisa saat tidak ada koneksi, sync otomatis saat online kembali
- Data lebih dari 1 tahun otomatis dibersihkan

### PWA
- Bisa diinstall di HP / desktop
- Pull-to-refresh untuk update data
- Banner notifikasi saat versi baru tersedia
- Bekerja offline via Service Worker

### UI / UX
- Dark mode & light mode
- Desain glassmorphism mobile-first
- Halaman maintenance jika konfigurasi server belum tersedia
- Tombol support developer via QRIS

---

## Tech Stack

- **Frontend:** React 19 + Vite
- **Auth:** Firebase Authentication (Google OAuth)
- **Database:** Cloud Firestore (dengan offline persistence)
- **Hosting:** Vercel
- **PWA:** Service Worker custom

---

## Setup

```bash
npm install
npm run dev
```

Salin `.env.example` ke `.env` dan isi dengan konfigurasi Firebase:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Tanpa env vars, app tetap berjalan dalam mode localStorage tanpa sync.

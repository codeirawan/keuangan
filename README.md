# Sisa Uang

Aplikasi catatan keuangan pribadi berbasis web. Catat pemasukan dan pengeluaran, lihat ringkasan mingguan/bulanan, dan sync data antar perangkat via Google login.

## Fitur

- Catat transaksi (pemasukan & pengeluaran) dengan kategori
- Ringkasan saldo, pemasukan, dan pengeluaran
- Grafik bar harian (per minggu) dan breakdown per minggu (per bulan)
- Riwayat transaksi dikelompokkan per tanggal
- Dark mode / light mode
- **Login Google opsional** — default pakai localStorage, login untuk sync antar device via Firestore

## Tech Stack

- React + Vite
- Firebase Authentication (Google)
- Cloud Firestore
- Vercel (hosting)

## Setup

```bash
npm install
npm run dev
```

Untuk mengaktifkan Google Sync, isi konfigurasi Firebase di `src/firebase.js`.

## Live

[sisauang.vercel.app](https://sisauang.vercel.app)

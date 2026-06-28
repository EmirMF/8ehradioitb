// ==============================================
// File: app/components/chat/GuestNameModal.tsx
// Tujuan: Pop-up untuk minta nama pengguna
// ==============================================

'use client';

import { useState } from 'react';

// ---- DEFINISI PROPS ----
// Props itu seperti "pesan/instruksi" yang dikirim dari komponen induk (parent).
// Komponen ini membutuhkan satu instruksi: 
//   "Apa yang harus dilakukan setelah nama diisi?"

interface GuestNameModalProps {
  onSaveName: (name: string) => void;
  // ↑ Ini adalah fungsi yang akan dipanggil setelah user memasukkan nama.
  //   Komponen parent (halaman chat) yang menentukan apa yang terjadi.
}

export default function GuestNameModal({ onSaveName }: GuestNameModalProps) {
  // "Kotak penyimpanan" untuk nama yang sedang diketik user
  const [name, setName] = useState('');
  // ↑ name = teks yang ada di kotak input saat ini
  //   setName = fungsi untuk mengubah teks tersebut

  // "Kotak penyimpanan" untuk pesan error (jika nama kosong)
  const [error, setError] = useState('');

  // ---- FUNGSI SAAT TOMBOL DITEKAN ----
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ↑ Mencegah halaman refresh saat form di-submit (perilaku default browser)

    // Hapus spasi di awal dan akhir nama
    const trimmedName = name.trim();

    // Validasi: nama tidak boleh kosong
    if (!trimmedName) {
      setError('Nama tidak boleh kosong ya 😅');
      return; // Berhenti di sini, jangan lanjut
    }

    // Simpan nama ke localStorage (agar browser ingat)
    localStorage.setItem('guest_name', trimmedName);

    // Panggil fungsi dari parent untuk memberitahu bahwa nama sudah diisi
    onSaveName(trimmedName);
  };

  // ---- TAMPILAN (UI) ----
  return (
    // Overlay: latar belakang gelap semi-transparan yang menutupi seluruh layar
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* 
        fixed       = posisi tetap di layar (tidak ikut scroll)
        inset-0     = menutupi dari atas, bawah, kiri, kanan
        z-50        = berada di lapisan paling atas
        flex items-center justify-center = konten di tengah layar
        bg-black/60 = latar hitam dengan transparansi 60%
        backdrop-blur-sm = efek blur pada latar belakang
      */}

      {/* Kotak Modal */}
      <div className="w-full max-w-sm mx-4 rounded-2xl border border-white/20 bg-slate-800/90 p-6 shadow-2xl backdrop-blur-md">
        {/* Judul */}
        <h2 className="text-xl font-bold text-white text-center mb-2">
          👋 Selamat Datang di Live Chat!
        </h2>

        {/* Deskripsi */}
        <p className="text-sm text-slate-400 text-center mb-6">
          Masukkan nama panggilan kamu untuk mulai ngobrol
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Kotak Input Nama */}
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);  // Update nama setiap kali user mengetik
              setError('');             // Hapus pesan error saat user mulai ketik lagi
            }}
            placeholder="Contoh: Andi"
            className="w-full rounded-lg border border-white/10 bg-slate-700/50 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
            autoFocus
            // ↑ autoFocus = kursor otomatis ada di kotak input ini saat modal muncul
            maxLength={30}
            // ↑ Maksimal 30 karakter untuk nama
          />

          {/* Pesan Error (muncul kalau nama kosong) */}
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
          {/* ↑ {error && ...} artinya: HANYA tampilkan ini kalau 'error' ada isinya */}

          {/* Tombol Masuk */}
          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition-all hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95"
          >
            Masuk ke Chat 🚀
          </button>
          {/* 
            hover:bg-indigo-500   = warna berubah saat mouse di atas tombol
            active:scale-95       = tombol mengecil sedikit saat diklik (efek tekan)
            transition-all        = semua perubahan terjadi dengan animasi halus
          */}
        </form>
      </div>
    </div>
  );
}
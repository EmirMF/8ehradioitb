// ==============================================
// File: lib/hooks/useLiveChat.ts
// Tujuan: Hook untuk koneksi real-time ke server
// ==============================================

'use client';
// ↑ Baris ini WAJIB ada di Next.js App Router
//   karena kode ini berjalan di browser (client), bukan di server.

import { useState, useEffect, useCallback } from 'react';
// ↑ Kita import 3 "alat" dari React:
//   - useState    = untuk menyimpan data (seperti variabel yang bisa berubah)
//   - useEffect   = untuk menjalankan kode saat komponen pertama kali muncul
//   - useCallback = untuk membuat fungsi yang efisien (tidak dibuat ulang tiap render)

// ---- DEFINISI TIPE DATA ----
// Ini menjelaskan "bentuk" sebuah pesan chat.
// Bayangkan ini seperti template formulir: setiap pesan HARUS punya field ini.

export interface ChatMessage {
  id: string;            // ID unik untuk setiap pesan (seperti nomor urut)
  senderName: string;    // Nama pengirim (misal: "Andi")
  text: string;          // Isi pesan (misal: "Halo semua!")
  timestamp: Date;       // Waktu pesan dikirim
}

// ---- HOOK UTAMA ----
export function useLiveChat() {
  // Buat "kotak penyimpanan" untuk daftar pesan
  // messages = isi kotak saat ini
  // setMessages = fungsi untuk mengubah isi kotak
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Buat "kotak penyimpanan" untuk status koneksi
  const [isConnected, setIsConnected] = useState(false);

  // ---- KONEKSI KE SERVER (SSE) ----
  // useEffect ini akan berjalan SEKALI saat komponen pertama kali muncul di layar
  useEffect(() => {
    // Buat koneksi SSE ke endpoint API backend
    // (endpoint ini harus sudah disiapkan oleh tim backend)
    const eventSource = new EventSource('/api/chat/stream');
    // ↑ EventSource adalah fitur bawaan browser untuk menerima data real-time
    //   dari server. Seperti "memasang antena radio" ke server.

    // Saat koneksi berhasil terbuka:
    eventSource.onopen = () => {
      setIsConnected(true);  // Update status: "sudah tersambung"
      console.log('✅ Terhubung ke server chat');
    };

    // Saat ada pesan baru datang dari server:
    eventSource.onmessage = (event) => {
      try {
        const newMessage: ChatMessage = JSON.parse(event.data);
        // ↑ event.data berisi teks JSON dari server
        //   JSON.parse mengubah teks itu jadi objek JavaScript

        // Tambahkan pesan baru ke daftar pesan yang sudah ada
        setMessages((prev) => [...prev, {
          ...newMessage,
          timestamp: new Date(newMessage.timestamp),
        }]);
        // ↑ prev = daftar pesan sebelumnya
        //   [...prev, newMessage] = salin semua pesan lama + tambah yang baru
      } catch (error) {
        console.error('Gagal memproses pesan:', error);
      }
    };

    // Saat terjadi error pada koneksi:
    eventSource.onerror = () => {
      setIsConnected(false);  // Update status: "terputus"
      console.log('❌ Koneksi terputus, mencoba menghubungkan kembali...');
      // EventSource akan otomatis mencoba reconnect
    };

    // ---- CLEANUP (Bersih-bersih) ----
    // Ini berjalan saat komponen dihapus dari layar (misal: user pindah halaman)
    return () => {
      eventSource.close();  // Tutup koneksi supaya tidak bocor
      console.log('🔌 Koneksi ditutup');
    };
  }, []);
  // ↑ [] artinya: effect ini HANYA berjalan sekali (saat pertama kali muncul)

  // ---- FUNGSI KIRIM PESAN ----
  const sendMessage = useCallback(async (text: string, senderName: string) => {
    // Kirim pesan ke server melalui HTTP POST
    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          senderName: senderName,
        }),
      });
      // ↑ fetch = fungsi bawaan browser untuk mengirim request ke server
      //   method: 'POST' = kita MENGIRIM data (bukan meminta data)
      //   body = data yang kita kirim (diubah ke format JSON dulu)

      if (!response.ok) {
        console.error('Gagal mengirim pesan');
      }
    } catch (error) {
      console.error('Error saat mengirim pesan:', error);
    }
  }, []);

  // ---- KEMBALIKAN DATA & FUNGSI ----
  // Komponen yang menggunakan hook ini akan mendapat:
  return {
    messages,      // Daftar semua pesan (untuk ditampilkan)
    isConnected,   // Status koneksi (untuk indikator online/offline)
    sendMessage,   // Fungsi untuk mengirim pesan baru
  };
}
'use client';

import { useState } from 'react';

interface GuestNameModalProps {
  onSaveName: (name: string) => void;
}

export default function GuestNameModal(props: GuestNameModalProps) {
  const onSaveName = props.onSaveName;
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Nama tidak boleh kosong');
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 30) {
      setError('Nama panggilan minimal 2 dan maksimal 30 karakter');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/live-chat/guest-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname: trimmedName }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Gagal masuk ke chat');
        return;
      }

      const data = await response.json();

      // Berhasil
      sessionStorage.setItem('guest_name', trimmedName);
      localStorage.setItem('guest_name', trimmedName); // Sinkronisasi dengan localStorage
      localStorage.setItem('chat_session_id', data.sessionId); // Simpan sessionId untuk pengecekan mute client-side
      onSaveName(trimmedName);
    } catch (err) {
      setError('Terjadi kesalahan koneksi ke server');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
          Selamat Datang di Live Chat
        </h2>
        <p className="text-sm text-gray-400 text-center mb-6">
          Masukkan nama panggilan kamu untuk mulai ngobrol
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder="Contoh: Andi"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 transition-all"
            autoFocus
            maxLength={30}
            disabled={loading}
          />

          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-gray-900 px-4 py-3 font-semibold text-white transition-all hover:bg-gray-700 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Menghubungkan...' : 'Masuk ke Chat'}
          </button>
        </form>
      </div>
    </div>
  );
}
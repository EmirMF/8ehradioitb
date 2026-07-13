'use client';

import { useState } from 'react';

interface GuestNameModalProps {
  onSaveName: (name: string) => void;
}

export default function GuestNameModal(props: GuestNameModalProps) {
  const onSaveName = props.onSaveName;
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Nama tidak boleh kosong');
      return;
    }

    sessionStorage.setItem('guest_name', trimmedName); 
    onSaveName(trimmedName);
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
          />

          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-gray-900 px-4 py-3 font-semibold text-white transition-all hover:bg-gray-700 active:scale-95"
          >
            Masuk ke Chat
          </button>
        </form>
      </div>
    </div>
  );
}
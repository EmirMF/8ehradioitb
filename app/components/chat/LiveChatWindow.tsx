'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../../hooks/useLiveChat';

interface LiveChatWindowProps {
  messages: ChatMessage[];
  currentUserName: string | null;
  isAdmin?: boolean;
  onDeleteMessage?: (id: string) => void;
  connectionError?: boolean;
  onReconnect?: () => void;
}

export default function LiveChatWindow({ 
  messages, 
  currentUserName, 
  isAdmin, 
  onDeleteMessage,
  connectionError,
  onReconnect
}: LiveChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Re-render relative time every 30 seconds
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const getRelativeTime = (dateInput: Date) => {
    try {
      const date = new Date(dateInput);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 5) return "Baru saja";
      if (diffInSeconds < 60) return `${diffInSeconds} detik lalu`;

      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;

      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours} jam lalu`;

      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 30) return `${diffInDays} hari lalu`;

      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch {
      return "Baru saja";
    }
  };

  const getAbsoluteTime = (dateInput: Date) => {
    try {
      const date = new Date(dateInput);
      return date.toLocaleString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus pesan ini?')) {
      if (onDeleteMessage) {
        onDeleteMessage(id);
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col">
      {connectionError && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-xs flex items-center justify-between gap-2 shadow-sm animate-in fade-in duration-200 mb-2">
          <div className="flex items-center gap-1.5 font-body">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>Koneksi terputus. Gagal menghubungkan ke server.</span>
          </div>
          {onReconnect && (
            <button
              onClick={onReconnect}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer"
            >
              Coba Lagi
            </button>
          )}
        </div>
      )}

      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-slate-500">
          <p className="text-4xl mb-3">💬</p>
          <p className="text-sm">Belum ada pesan. Mulai ngobrol!</p>
        </div>
      )}

      {messages.map((msg) => {
        const isOwnMessage = msg.senderName === currentUserName;

        return (
          <div
            key={msg.id}
            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
          >
            {isAdmin && !isOwnMessage && !msg.deleted && (
              <button 
                onClick={() => handleDelete(msg.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-red-500 focus:outline-none"
                title="Hapus Pesan (Admin)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            )}

            <div
              className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-2 ${
                isOwnMessage
                  ? 'bg-red-800 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              <p className={`text-xs font-semibold mb-1 ${isOwnMessage ? 'text-red-200' : 'text-red-700'}`}>
                {msg.senderName}
              </p>
              
              {msg.deleted ? (
                <p className={`text-sm leading-relaxed italic ${isOwnMessage ? 'text-red-300' : 'text-gray-400'}`}>
                  Pesan ini dihapus oleh moderator
                </p>
              ) : (
                <p className="text-sm leading-relaxed break-words">{msg.text}</p>
              )}
              
              <p 
                className={`text-[10px] mt-1 text-right cursor-help ${
                  isOwnMessage ? 'text-red-300' : 'text-gray-400'
                }`}
                title={getAbsoluteTime(msg.timestamp)}
              >
                {getRelativeTime(msg.timestamp)}
              </p>
            </div>

            {isAdmin && isOwnMessage && !msg.deleted && (
              <button 
                onClick={() => handleDelete(msg.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-red-500 focus:outline-none"
                title="Hapus Pesan (Admin)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            )}
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}
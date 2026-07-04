'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from '../../hooks/useLiveChat';

interface LiveChatWindowProps {
  messages: ChatMessage[];
  currentUserName: string | null;
  isAdmin?: boolean;
  onDeleteMessage?: (id: string) => void;
}

export default function LiveChatWindow({ messages, currentUserName, isAdmin, onDeleteMessage }: LiveChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus pesan ini?')) {
      if (onDeleteMessage) {
        onDeleteMessage(id);
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
            {isAdmin && !isOwnMessage && (
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
              
              <p className="text-sm leading-relaxed break-words">{msg.text}</p>
              
              <p className={`text-[10px] mt-1 text-right ${
                isOwnMessage ? 'text-red-300' : 'text-gray-400'
              }`}>
                {formatTime(msg.timestamp)}
              </p>
            </div>

            {isAdmin && isOwnMessage && (
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
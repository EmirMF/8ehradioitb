'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from '../../hooks/useLiveChat';

interface LiveChatWindowProps {
  messages: ChatMessage[];
  currentUserName: string | null;
}

export default function LiveChatWindow({ messages, currentUserName }: LiveChatWindowProps) {
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
            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                isOwnMessage
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-slate-700 text-slate-100 rounded-bl-sm'
              }`}
            >
              {!isOwnMessage && (
                <p className="text-xs font-semibold text-indigo-400 mb-1">
                  {msg.senderName}
                </p>
              )}
              
              <p className="text-sm leading-relaxed break-words">{msg.text}</p>
              
              <p className={`text-[10px] mt-1 ${
                isOwnMessage ? 'text-indigo-300' : 'text-slate-500'
              }`}>
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}
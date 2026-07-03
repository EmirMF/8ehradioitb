'use client';

import { useState } from 'react';

interface ChatInputBoxProps {
  onSendMessage: (text: string) => void;
  disabled?: boolean;
}

export default function ChatInputBox({ onSendMessage, disabled = false }: ChatInputBoxProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
  const trimmedText = text.trim();
  if (!trimmedText) return;

  console.log('onSendMessage type:', typeof onSendMessage);
  console.log('onSendMessage value:', onSendMessage);

  if (typeof onSendMessage !== 'function') {
    console.error('onSendMessage bukan fungsi!', onSendMessage);
    return;
  }

  onSendMessage(trimmedText);
  setText('');
};

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-slate-700/50 bg-slate-800/50 backdrop-blur-md p-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Masukkan nama dulu...' : 'Ketik pesan...'}
          disabled={disabled}
          className="flex-1 rounded-full border border-white/10 bg-slate-700/50 px-5 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-white transition-all hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/30 active:scale-90 disabled:opacity-40 disabled:hover:bg-red-600 disabled:hover:shadow-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
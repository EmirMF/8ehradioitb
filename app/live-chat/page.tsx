'use client';

import { useState, useEffect } from 'react';
import { useLiveChat } from '../hooks/useLiveChat';
import GuestNameModal from '../components/chat/GuestNameModal';
import LiveChatWindow from '../components/chat/LiveChatWindow';
import ChatInputBox from '../components/chat/ChatInputBox';

export default function LiveChatPage() {
  const [userName, setUserName] = useState<string | null>(null);
  const { messages, sendMessage, isConnected } = useLiveChat();

  useEffect(() => {
    const savedName = localStorage.getItem('guest_name');
    if (savedName) {
      setUserName(savedName);
    }
  }, []);

  const handleSendMessage = (text: string) => {
    if (userName) {
      sendMessage(text, userName);
    }
  };

  const handleSaveName = (name: string) => {
    setUserName(name);
  };

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-slate-900 text-white border-x border-slate-800">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">📡</span>
          <div>
            <h1 className="text-base font-bold">8Eh Radio Live Chat</h1>
            {userName && (
              <p className="text-xs text-slate-500">Halo, {userName}!</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs text-slate-500">
            {isConnected ? 'Online' : 'Offline'}
          </span>
        </div>
      </header>

      {!userName && <GuestNameModal onSaveName={handleSaveName} />}

      <LiveChatWindow messages={messages} currentUserName={userName} />

      <ChatInputBox onSendMessage={handleSendMessage} disabled={!userName} />
    </div>
  );
}
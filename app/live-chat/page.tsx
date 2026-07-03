'use client';

import { useState, useEffect } from 'react';
import { useLiveChat } from '../hooks/useLiveChat';
import GuestNameModal from '../components/chat/GuestNameModal';
import LiveChatWindow from '../components/chat/LiveChatWindow';
import ChatInputBox from '../components/chat/ChatInputBox';
import ModerationPanel from '../components/chat/ModerationPanel';

export default function LiveChatPage() {
  const [userName, setUserName] = useState<string | null>(null);
  
  // Deteksi mode admin secara sederhana lewat query params (untuk testing)
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerationPanelOpen, setIsModerationPanelOpen] = useState(false);

  const { 
    messages, 
    sendMessage, 
    isConnected, 
    activeListeners, 
    activeGuests, 
    deleteMessage, 
    muteGuest 
  } = useLiveChat();

  useEffect(() => {
    // Cek localStorage
    const savedName = localStorage.getItem('guest_name');
    if (savedName) {
      setUserName(savedName);
    }
    
    // Cek apakah URL ada ?admin=true
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('admin') === 'true') {
        setIsAdmin(true);
      }
    }
  }, []);

  const handleSendMessage = (text: string) => {
    if (userName && typeof sendMessage === 'function') {
      sendMessage(text, userName);
    }
  };

  const handleSaveName = (name: string) => {
    setUserName(name);
  };

  return (
    // Responsive: w-full di mobile, max-w-lg di layar besar
    <div className="flex flex-col h-screen w-full md:max-w-lg md:mx-auto bg-slate-900 text-white md:border-x border-slate-800 relative overflow-hidden">
      
      {/* HEADER */}
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-900 z-10">
        <div className="flex items-center gap-3">
          <span className="text-xl">📡</span>
          <div>
            <h1 className="text-base font-bold flex items-center gap-2">
              8Eh Radio Chat
              {isAdmin && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-normal">ADMIN</span>}
            </h1>
            {/* Task 27: Counter Jumlah Pendengar */}
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              {activeListeners} Online
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setIsModerationPanelOpen(true)}
              className="text-xs bg-slate-800 border border-slate-700 hover:bg-slate-700 px-3 py-1.5 rounded-md transition-colors"
            >
              🛡️ Moderasi
            </button>
          )}
        </div>
      </header>

      {/* OVERLAYS */}
      {!userName && <GuestNameModal onSaveName={handleSaveName} />}
      
      {isAdmin && isModerationPanelOpen && (
        <ModerationPanel 
          activeGuests={activeGuests} 
          onMuteGuest={muteGuest} 
          onClose={() => setIsModerationPanelOpen(false)} 
        />
      )}

      {/* CHAT WINDOW */}
      <LiveChatWindow 
        messages={messages} 
        currentUserName={userName} 
        isAdmin={isAdmin}
        onDeleteMessage={deleteMessage}
      />

      {/* CHAT INPUT */}
      {typeof handleSendMessage === 'function' && (
        <ChatInputBox onSendMessage={handleSendMessage} disabled={!userName} />
      )}
    </div>
  );
}
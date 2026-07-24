'use client';

import { useState, useEffect } from 'react';
import { useLiveChat } from '../hooks/useLiveChat';
import GuestNameModal from '../components/chat/GuestNameModal';
import LiveChatWindow from '../components/chat/LiveChatWindow';
import ChatInputBox from '../components/chat/ChatInputBox';
import ModerationPanel from '../components/chat/ModerationPanel';

export default function LiveChatPage() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState<boolean | null>(null); // null = loading, false = not live, true = live
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
  } = useLiveChat(roomId);

  useEffect(() => {
    // 1. Cek admin mode
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('admin') === 'true') {
        setIsAdmin(true);
      }
    }

    // Helper: safe JSON fetch
    const safeJson = async (res: Response) => {
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Server mengembalikan non-JSON (HTTP ${res.status})`);
      }
      return res.json();
    };

    // 2. Cek active room dan status sesi guest
    const checkActiveRoomAndSession = async () => {
      try {
        const roomRes = await fetch('/api/live-chat/active-room');
        const roomData = await safeJson(roomRes);
        
        setIsLive(roomData.live);
        if (roomData.live && roomData.roomId) {
          setRoomId(roomData.roomId);

          // Cek guest session jika room active
          try {
            const sessionRes = await fetch('/api/live-chat/guest-session');
            const sessionData = await safeJson(sessionRes);
            if (sessionData.active && sessionData.guestName) {
              setUserName(sessionData.guestName);
            }
          } catch (sessionErr) {
            // Session belum ada — GuestNameModal akan tampil
            console.warn('Belum ada sesi guest aktif:', sessionErr);
          }
        }
      } catch (err) {
        console.error('Gagal memverifikasi status siaran:', err);
        setIsLive(false);
      }
    };

    checkActiveRoomAndSession();
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
          {isAdmin && isLive && (
            <button
              onClick={() => setIsModerationPanelOpen(true)}
              className="text-xs bg-slate-800 border border-slate-700 hover:bg-slate-700 px-3 py-1.5 rounded-md transition-colors"
            >
              🛡️ Moderasi
            </button>
          )}
        </div>
      </header>

      {/* CHAT WINDOW & OVERLAYS */}
      {isLive === null ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-2"></div>
          <p className="text-sm">Memeriksa status siaran...</p>
        </div>
      ) : !isLive ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-950">
          <span className="text-4xl mb-3">📡</span>
          <h2 className="text-lg font-bold text-white mb-1">Siaran Belum Dimulai</h2>
          <p className="text-xs max-w-xs text-slate-500">
            Live chat belum diaktifkan oleh penyiar. Silakan tunggu hingga siaran dimulai untuk bergabung dalam obrolan!
          </p>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
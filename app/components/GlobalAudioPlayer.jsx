"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";

import LiveChatWindow from "@/app/components/chat/LiveChatWindow";
import ChatInputBox from "@/app/components/chat/ChatInputBox";
import ModerationPanel from "@/app/components/chat/ModerationPanel";
import { useLiveChat } from "@/app/hooks/useLiveChat";


// Form nama inline untuk chat panel di player (harus komponen terpisah agar hooks bisa dipakai)
function InlineNameForm({ onSubmit }) {
  const [submitting, setSubmitting] = React.useState(false);
  const [formErr, setFormErr] = React.useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = e.target.elements.nickname.value.trim();
    if (val.length < 2 || val.length > 30) {
      setFormErr('Nama minimal 2, maksimal 30 karakter');
      return;
    }
    setSubmitting(true);
    setFormErr('');
    const result = await onSubmit(val);
    if (result?.error) setFormErr(result.error);
    setSubmitting(false);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
      <p className="font-bold text-gray-800 text-sm text-center">Masukkan nama panggilan kamu</p>
      <form className="w-full flex flex-col gap-2" onSubmit={handleSubmit}>
        <input
          name="nickname"
          type="text"
          maxLength={30}
          placeholder="Contoh: Andi"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
          autoFocus
          disabled={submitting}
        />
        {formErr && <p className="text-xs text-red-500">{formErr}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {submitting ? 'Menghubungkan...' : 'Masuk ke Chat'}
        </button>
      </form>
    </div>
  );
}

const GlobalAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showPlayer, setShowPlayer] = useState(false);
  const [error, setError] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [guestName, setGuestName] = useState(null);
  const [roomId, setRoomId] = useState(null);       // untuk cek status live
  const [chatRoomId, setChatRoomId] = useState(null); // untuk useLiveChat (diset setelah sesi valid)
  const [isLiveActive, setIsLiveActive] = useState(null); // null=loading, true/false
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerationPanelOpen, setIsModerationPanelOpen] = useState(false);

  // Ambil nama tersimpan saat refresh + cek admin
  useEffect(() => {
    const savedName = localStorage.getItem('guest_name');
    if (savedName) setGuestName(savedName);

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
      setIsAdmin(true);
    }
  }, []);

 useEffect(() => {
  if (isPlaying) {
    const wasOffAir = sessionStorage.getItem('was_off_air');
    if (wasOffAir === 'true') {
      localStorage.removeItem('guest_name');
      setGuestName(null);
      setShowLiveChat(false);
      sessionStorage.removeItem('was_off_air');
    }
  } else {
    const everPlayed = sessionStorage.getItem('ever_played');
    if (everPlayed === 'true') {
      sessionStorage.setItem('was_off_air', 'true');
    }
  }
}, [isPlaying]);

  // chatRoomId hanya di-pass ke useLiveChat setelah sesi guest valid
  const { messages, sendMessage, activeListeners, activeGuests, deleteMessage, muteGuest } = useLiveChat(chatRoomId);

  const [playerConfig, setPlayerConfig] = useState({
    title: "",
    subtitle: "",
    coverImage: "",
  });

  useEffect(() => {
    fetch("/api/player-config")
      .then((res) => {
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || !ct.includes('application/json')) return null;
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setPlayerConfig({
          title: data?.title || "",
          subtitle: data?.subtitle || "",
          coverImage: data?.coverImage || "",
        });
      })
      .catch(() => {
        setPlayerConfig({ title: "", subtitle: "", coverImage: "" });
      });
  }, []);

 useEffect(() => {
  let externalPause = false;
  const handler = (e) => {
    const playing = e.detail.isPlaying;
    setIsPlaying(playing);
    if (playing) {
      setShowPlayer(true);
      sessionStorage.setItem('ever_played', 'true'); // ← tambahkan ini
    }
  };

  window.addEventListener("audioStateChanged", handler);
  const handlePodcastPlay = () => {
    setIsPlaying(false);
    setShowPlayer(false);
    externalPause = true;
    window.dispatchEvent(new CustomEvent("pauseRequested"));
  };
  window.addEventListener("podcastPlayRequested", handlePodcastPlay);

  if (!isPlaying && externalPause) {
    setShowPlayer(false);
    externalPause = false;
  }

  if (isPlaying) {
    window.dispatchEvent(new CustomEvent("radioPlayRequested"));
  }

  return () => {
    window.removeEventListener("audioStateChanged", handler);
    window.removeEventListener("podcastPlayRequested", handlePodcastPlay);
  };
}, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      window.dispatchEvent(new CustomEvent("radioPlayRequested"));
    }
  }, [isPlaying]);

  const togglePlay = () => {
    if (isPlaying) {
      window.dispatchEvent(new CustomEvent("pauseRequested"));
    } else {
      window.dispatchEvent(new CustomEvent("playRequested"));
    }
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    window.dispatchEvent(
      new CustomEvent("volumeChanged", { detail: { volume: newVol } }),
    );
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(1);
      window.dispatchEvent(
        new CustomEvent("volumeChanged", { detail: { volume: 1 } }),
      );
    } else {
      setIsMuted(true);
      setVolume(0);
      window.dispatchEvent(
        new CustomEvent("volumeChanged", { detail: { volume: 0 } }),
      );
    }
  };

  const toggleLiveChat = async () => {
    if (!showLiveChat && roomId === null) {
      // Pertama kali dibuka — fetch active room
      try {
        const res = await fetch('/api/live-chat/active-room');
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          if (data.live && data.roomId) {
            setRoomId(data.roomId);
            setIsLiveActive(true);
          } else {
            setIsLiveActive(false);
          }
        } else {
          setIsLiveActive(false);
        }
      } catch (err) {
        console.warn('[GlobalAudioPlayer] Gagal cek active room:', err);
        setIsLiveActive(false);
      }
    }
    setShowLiveChat((prev) => !prev);
  };

  const handleNameSubmit = async (name) => {
    try {
      const res = await fetch('/api/live-chat/guest-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: name }),
      });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok) {
        const errData = ct.includes('application/json') ? await res.json() : {};
        return { error: errData.error || 'Gagal masuk ke chat' };
      }
      const data = ct.includes('application/json') ? await res.json() : {};
      localStorage.setItem('guest_name', name);
      if (data.sessionId) localStorage.setItem('chat_session_id', data.sessionId);
      setGuestName(name);
      // Baru sekarang aktifkan koneksi Pusher + fetch riwayat pesan
      setChatRoomId(roomId);
      return { error: null };
    } catch {
      return { error: 'Terjadi kesalahan koneksi' };
    }
  };

  const handleSendMessage = (text) => {
    sendMessage(text, guestName);
  };

  const isVisible = showPlayer;

  return (
    <>
      {isVisible && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          {showLiveChat && (
            <div className="absolute bottom-full right-2 left-2 md:left-auto md:right-60 mb-2 md:w-[380px] h-[65vh] md:h-[440px] max-h-[500px] bg-white border border-gray-200 rounded-lg shadow-2xl flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <p className="font-heading font-bold text-gray-800 text-sm">
                    Live Chat
                  </p>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    {activeListeners}
                  </span>
                  {isAdmin && <span className="text-[10px] bg-red-500/10 text-red-600 px-2 py-0.5 rounded-md font-bold">ADMIN</span>}
                </div>
                
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      onClick={() => setIsModerationPanelOpen(true)}
                      className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-md transition-colors"
                    >
                      Moderasi
                    </button>
                  )}
                  <button
                    onClick={toggleLiveChat}
                    className="text-gray-400 hover:text-gray-700 transition-colors"
                    aria-label="Tutup live chat"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden relative">
                {isAdmin && isModerationPanelOpen && (
                  <ModerationPanel 
                    activeGuests={activeGuests} 
                    onMuteGuest={muteGuest} 
                    onClose={() => setIsModerationPanelOpen(false)} 
                  />
                )}

                {/* Saat room belum diketahui (loading) */}
                {isLiveActive === null && (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                    <span>Memeriksa status siaran...</span>
                  </div>
                )}

                {/* Tidak ada siaran aktif */}
                {isLiveActive === false && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4 text-center">
                    <span className="text-2xl">📻</span>
                    <p className="font-semibold text-gray-700 text-sm">Siaran Belum Dimulai</p>
                    <p className="text-gray-400 text-xs">Live chat akan tersedia saat kami sedang on air.</p>
                  </div>
                )}

                {/* Ada siaran aktif */}
                {isLiveActive === true && (
                  !guestName ? (
                    <InlineNameForm onSubmit={handleNameSubmit} />
                  ) : (
                    <>
                      <LiveChatWindow 
                        messages={messages} 
                        currentUserName={guestName} 
                        isAdmin={isAdmin}
                        onDeleteMessage={deleteMessage}
                      />
                      <ChatInputBox onSendMessage={handleSendMessage} />
                    </>
                  )
                )}
              </div>
            </div>
          )}

          <div className="bg-white shadow-2xl border border-gray-200/80">
            <div className="max-w-full mx-auto px-2 md:px-6 lg:px-60 py-1 md:py-2 flex flex-col md:flex-row items-center gap-2 md:gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto md:flex-shrink-0">
                <button onClick={togglePlay} className="md:hidden w-8 h-8 rounded-full ring-1 ring-gray-300 hover:ring-gray-900 text-gray-800 flex items-center justify-center text-xl transition-all flex-shrink-0">
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M8 5v14l11-7z"></path></svg>
                  )}
                </button>
                <div className="w-10 h-10 md:w-14 md:h-14 bg-gray-200 rounded-md relative overflow-hidden shadow-sm flex-shrink-0">
                  <img src={playerConfig.coverImage || "/8eh.png"} alt="cover" className="object-cover w-full h-full absolute inset-0" />
                </div>
                <div className="text-sm min-w-0 flex-1 md:w-60 flex-shrink-0">
                  <p className="font-heading font-bold text-gray-800 truncate text-xs md:text-sm">{playerConfig.title || "8EH Radio ITB"}</p>
                  <p className="text-gray-500 flex items-center gap-2 font-body text-xs md:text-sm">
                    <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-red-500"></span>
                    </span>
                    Live Now
                  </p>
                </div>
                
                <button type="button" onClick={toggleLiveChat} className={`md:hidden w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${showLiveChat ? "bg-gray-900 text-white" : "ring-1 ring-gray-300 hover:ring-gray-900 text-gray-700"}`} aria-label="Buka live chat">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4.5 h-4.5">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </button>
              </div>

              <div className="hidden md:flex flex-1 flex-col items-center justify-center mx-2 min-w-0">
                <div className="flex items-center justify-center w-full gap-6">
                  <button className="text-gray-500 hover:text-black disabled:opacity-40 text-xl" disabled>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"></path></svg>
                  </button>
                  <button onClick={togglePlay} className="w-10 h-10 rounded-full ring-1 ring-gray-300 hover:ring-gray-900 text-gray-800 flex items-center justify-center text-xl transition-all">
                    {isPlaying ? (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M8 5v14l11-7z"></path></svg>
                    )}
                  </button>
                  <button className="text-gray-500 hover:text-black disabled:opacity-40 text-xl" disabled>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"></path></svg>
                  </button>
                </div>
                <div className="w-full flex items-center gap-2 text-[10px] text-gray-500 mt-2 min-w-0">
                  <div className="flex-grow h-1 bg-gray-200 rounded-full relative min-w-0">
                    <div className="absolute h-full bg-gray-800 rounded-full" style={{ width: "0%" }} />
                  </div>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-3 flex-shrink-0 w-auto justify-end">
                <button type="button" onClick={handleMuteToggle} className="text-gray-600 focus:outline-none cursor-pointer">
                  {isMuted || volume === 0 ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M16.5 12a6.5 6.5 0 0 0-6.5-6.5v2A4.5 4.5 0 0 1 14.5 12h2z" fill="#d1d5db" />
                      <path d="M3 9v6h4l5 5V4L7 9H3zm16.5 3a6.5 6.5 0 0 0-6.5-6.5v2A4.5 4.5 0 0 1 17.5 12h2z" />
                      <line x1="19" y1="5" x2="5" y2="19" stroke="#ef4444" strokeWidth="2" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path>
                    </svg>
                  )}
                </button>
                <input type="range" min="0" max="1" step="0.1" value={volume} onChange={handleVolumeChange} className="w-20 md:w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800" />
                <button type="button" onClick={toggleLiveChat} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${showLiveChat ? "bg-gray-900 text-white" : "ring-1 ring-gray-300 hover:ring-gray-900 text-gray-700"}`} aria-label="Buka live chat">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4.5 h-4.5">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalAudioPlayer;
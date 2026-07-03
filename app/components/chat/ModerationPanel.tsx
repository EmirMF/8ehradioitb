'use client';

import { ActiveGuest } from '../../hooks/useLiveChat';

interface ModerationPanelProps {
  activeGuests: ActiveGuest[];
  onMuteGuest: (sessionId: string, action: 'mute' | 'unmute') => void;
  onClose: () => void;
}

export default function ModerationPanel({ activeGuests, onMuteGuest, onClose }: ModerationPanelProps) {
  return (
    <div className="absolute inset-0 z-40 flex justify-end">
      {/* Overlay background (to click and close) */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative w-72 h-full bg-slate-800 border-l border-slate-700 p-4 shadow-xl flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            🛡️ Moderasi Chat
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="text-xs text-slate-400 mb-3 flex justify-between">
          <span>Tamu Aktif</span>
          <span className="font-mono bg-slate-700 px-2 rounded-full">{activeGuests.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {activeGuests.length === 0 ? (
            <p className="text-xs text-slate-500 text-center mt-10">Belum ada tamu aktif</p>
          ) : (
            activeGuests.map((guest, idx) => (
              <div 
                key={`${guest.sessionId}-${idx}`} 
                className="flex items-center justify-between bg-slate-700/50 p-2 rounded-lg border border-white/5"
              >
                <div className="truncate pr-2">
                  <p className="text-sm text-indigo-300 font-semibold truncate">{guest.name}</p>
                  <p className="text-[10px] text-slate-500 truncate" title={guest.sessionId}>
                    {guest.sessionId.slice(0, 8)}...
                  </p>
                </div>
                <button
                  onClick={() => {
                    const action = confirm(`Mute ${guest.name}? Mereka tidak akan bisa mengirim pesan lagi selama sesi ini.`) ? 'mute' : null;
                    if (action) onMuteGuest(guest.sessionId, action);
                  }}
                  className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/40 hover:text-red-300 text-xs rounded-md transition-colors whitespace-nowrap"
                >
                  Mute
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

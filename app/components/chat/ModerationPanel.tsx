'use client';

import { ActiveGuest } from '../../hooks/useLiveChat';

interface ModerationPanelProps {
  activeGuests: ActiveGuest[];
  onMuteGuest: (sessionId: string, action: 'mute' | 'unmute') => void;
  onClose: () => void;
}

export default function ModerationPanel({ activeGuests, onMuteGuest, onClose }: ModerationPanelProps) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-bold text-gray-800">
          Moderasi Chat
        </h2>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Guest count */}
      <div className="text-xs text-gray-500 px-4 py-2 flex justify-between border-b border-gray-100">
        <span>Tamu Aktif</span>
        <span className="font-medium text-gray-700 bg-gray-100 px-2 rounded-full">{activeGuests.length}</span>
      </div>

      {/* Guest list */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {activeGuests.length === 0 ? (
          <p className="text-xs text-gray-400 text-center mt-10">Belum ada tamu aktif</p>
        ) : (
          activeGuests.map((guest, idx) => (
            <div 
              key={`${guest.sessionId}-${idx}`} 
              className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100"
            >
              <div className="truncate pr-2">
                <p className="text-sm text-gray-800 font-semibold truncate">{guest.name}</p>
                <p className="text-[10px] text-gray-400 truncate" title={guest.sessionId}>
                  {guest.sessionId.slice(0, 8)}...
                </p>
              </div>
              <button
                onClick={() => {
                  const action = confirm(`Mute ${guest.name}?`) ? 'mute' : null;
                  if (action) onMuteGuest(guest.sessionId, action);
                }}
                className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium rounded-md transition-colors whitespace-nowrap border border-red-200"
              >
                Mute
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

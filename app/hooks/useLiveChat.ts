'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  timestamp: Date;
}

export interface ActiveGuest {
  sessionId: string;
  name: string;
}

export function useLiveChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  
  // States untuk Admin / Moderasi
  const [activeListeners, setActiveListeners] = useState<number>(0);
  const [activeGuests, setActiveGuests] = useState<ActiveGuest[]>([]);

  useEffect(() => {
    // Generate atau ambil session ID unik untuk user ini
    let storedSessionId = localStorage.getItem('chat_session_id');
    if (!storedSessionId) {
      storedSessionId = crypto.randomUUID();
      localStorage.setItem('chat_session_id', storedSessionId);
    }
    setSessionId(storedSessionId);

    const userName = localStorage.getItem('guest_name') || 'Guest';
    
    // Hubungkan ke stream dengan menyertakan sessionId dan nama
    const eventSource = new EventSource(`/api/chat/stream?sessionId=${storedSessionId}&name=${encodeURIComponent(userName)}`);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        // Karena ada beberapa tipe event, kita parse dulu
        const parsed = JSON.parse(event.data);

        // Jika ini adalah event hapus pesan
        if (parsed.type === 'delete_message') {
          setMessages((prev) => prev.filter(m => m.id !== parsed.messageId));
          return;
        }

        // Jika ini adalah event update sistem (jumlah user, dll)
        if (parsed.type === 'system_event') {
          setActiveListeners(parsed.activeListeners || 0);
          setActiveGuests(parsed.activeGuests || []);
          return;
        }

        // Jika ini adalah pesan biasa (format asli dari kode lama atau format type 'new_message')
        const messageData = parsed.type === 'new_message' ? parsed.message : parsed;
        
        // Abaikan jika tidak ada text (misal event ping)
        if (!messageData || !messageData.text) return;

        const newMessage: ChatMessage = messageData;
        setMessages((prev) => {
          // Cegah duplikasi pesan
          if (prev.some(m => m.id === newMessage.id)) return prev;
          return [...prev, {
            ...newMessage,
            timestamp: new Date(newMessage.timestamp),
          }];
        });
      } catch (error) {
        console.error('Gagal memproses event:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const sendMessage = useCallback(async (text: string, senderName: string) => {
    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          senderName: senderName,
          sessionId: sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Gagal mengirim pesan');
      }
    } catch (error) {
      console.error('Error saat mengirim pesan:', error);
    }
  }, [sessionId]);

  // Fungsi khusus Admin untuk menghapus pesan
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await fetch(`/api/chat/delete?id=${messageId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Gagal menghapus pesan', error);
    }
  }, []);

  // Fungsi khusus Admin untuk membisukan (mute) user
  const muteGuest = useCallback(async (targetSessionId: string, action: 'mute' | 'unmute') => {
    try {
      await fetch('/api/chat/mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: targetSessionId,
          action: action
        }),
      });
      alert(`User berhasil di-${action}`);
    } catch (error) {
      console.error('Gagal mengubah status mute', error);
    }
  }, []);

  return {
    messages,
    isConnected,
    sendMessage,
    activeListeners,
    activeGuests,
    deleteMessage,
    muteGuest
  };
}
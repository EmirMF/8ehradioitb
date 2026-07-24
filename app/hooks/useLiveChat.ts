'use client';

import { useState, useEffect, useCallback } from 'react';
import Pusher from 'pusher-js';

export interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  timestamp: Date;
  deleted?: boolean;
}

export interface ActiveGuest {
  sessionId: string;
  name: string;
  isMuted: boolean; 
}

export function useLiveChat(roomId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [reconnectTrigger, setReconnectTrigger] = useState(0);
  
  // States untuk Admin / Moderasi
  const [activeListeners, setActiveListeners] = useState<number>(0);
  const [activeGuests, setActiveGuests] = useState<ActiveGuest[]>([]);

  const reconnect = useCallback(() => {
    setConnectionError(false);
    setReconnectTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!roomId) {
      setIsConnected(false);
      return;
    }

    // 1. Ambil riwayat pesan yang sudah ada di server
    fetch(`/api/live-chat/${roomId}/messages`)
      .then(res => {
        if (!res.ok) throw new Error('Gagal mengambil pesan');
        return res.json();
      })
      .then(data => {
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages.map((m: any) => ({
            id: m.id,
            senderName: m.guestName,
            text: m.content,
            timestamp: new Date(m.createdAt),
            deleted: m.isDeleted,
          })));
        }
      })
      .catch(err => {
        console.error('Gagal memuat riwayat pesan:', err);
        setConnectionError(true);
      });

    // 2. Fetch stats awal & lakukan polling berkala untuk active listeners & guests
    const fetchStats = () => {
      fetch(`/api/live-chat/${roomId}/stats`)
        .then(res => {
          if (!res.ok) throw new Error('Gagal mengambil stats');
          return res.json();
        })
        .then(data => {
          if (data.activeListeners !== undefined) setActiveListeners(data.activeListeners);
          if (data.activeGuests !== undefined) setActiveGuests(data.activeGuests);
        })
        .catch(err => console.error('Gagal memuat stats:', err));
    };

    fetchStats();
    const statsInterval = setInterval(fetchStats, 15000);

    // 3. Hubungkan ke Pusher untuk real-time events
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY || '';
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1';

    if (!pusherKey) {
      console.error('Pusher key tidak ditemukan di environment variables.');
      setConnectionError(true);
      return;
    }

    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
      forceTLS: true
    });

    const channelName = `chat-room-${roomId}`;
    const channel = pusher.subscribe(channelName);

    pusher.connection.bind('connected', () => {
      setIsConnected(true);
      setConnectionError(false);
    });

    pusher.connection.bind('error', () => {
      setIsConnected(false);
      setConnectionError(true);
    });

    pusher.connection.bind('disconnected', () => {
      setIsConnected(false);
    });

    // Event: Pesan baru masuk
    channel.bind('new-message', (data: any) => {
      setMessages((prev) => {
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, {
          id: data.id,
          senderName: data.guestName,
          text: data.content,
          timestamp: new Date(data.createdAt),
          deleted: false
        }];
      });
    });

    // Event: Pesan dihapus
    channel.bind('message-deleted', (data: any) => {
      setMessages((prev) => prev.map(m => 
        m.id === data.id 
          ? { ...m, text: "Pesan ini dihapus oleh moderator", deleted: true } 
          : m
      ));
    });

    // Event: User di-mute atau unmute
    channel.bind('guest-muted', (data: any) => {
      setActiveGuests((prev) => prev.map(g => 
        g.sessionId === data.sessionId 
          ? { ...g, isMuted: data.isMuted } 
          : g
      ));

      // Cek jika diri sendiri yang di-mute
      const mySessionId = localStorage.getItem('chat_session_id');
      if (mySessionId === data.sessionId && data.isMuted) {
        alert('Anda telah di-mute oleh moderator.');
      }
    });

    // Event: Status room berubah (active/inactive)
    channel.bind('room-status', (data: any) => {
      if (!data.isActive) {
        alert('Room chat telah dinonaktifkan.');
      }
    });

    return () => {
      clearInterval(statsInterval);
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [roomId, reconnectTrigger]);

  const sendMessage = useCallback(async (text: string, senderName: string) => {
    if (!roomId) return;
    try {
      const response = await fetch(`/api/live-chat/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Gagal mengirim pesan');
      }
    } catch (error) {
      console.error('Error saat mengirim pesan:', error);
    }
  }, [roomId]);

  // Fungsi khusus Admin untuk menghapus pesan
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!roomId) return;
    try {
      const response = await fetch(`/api/live-chat/${roomId}/messages/${messageId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Gagal menghapus pesan');
      }
    } catch (error) {
      console.error('Gagal menghapus pesan', error);
    }
  }, [roomId]);

  // Fungsi khusus Admin untuk membisukan (mute) user
  const muteGuest = useCallback(async (targetSessionId: string, action: 'mute' | 'unmute') => {
    if (!roomId) return;
    try {
      const response = await fetch(`/api/live-chat/${roomId}/mute/${targetSessionId}`, {
        method: action === 'mute' ? 'POST' : 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || `Gagal mengubah status mute`);
        return;
      }
      
      alert(`User berhasil di-${action}`);
    } catch (error) {
      console.error('Gagal mengubah status mute', error);
    }
  }, [roomId]);

  return {
    messages,
    isConnected,
    connectionError,
    reconnect,
    sendMessage,
    activeListeners,
    activeGuests,
    deleteMessage,
    muteGuest
  };
}
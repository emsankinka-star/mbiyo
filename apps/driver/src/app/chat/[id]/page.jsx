'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { getSocket } from '../../../lib/socket';
import useAuthStore from '../../../stores/authStore';
import { FiArrowLeft, FiSend, FiUser } from 'react-icons/fi';

export default function DriverChatPage() {
  const { id: orderId } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Load order + messages
  useEffect(() => {
    async function load() {
      try {
        const [orderRes, chatRes] = await Promise.all([
          api.get(`/orders/${orderId}`),
          api.get(`/chat/${orderId}`),
        ]);
        setOrder(orderRes.data.data);
        setMessages(chatRes.data.data || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orderId]);

  // Listen for new messages via socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleMessage = (data) => {
      if (data.order_id === orderId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, {
            id: data.id || Date.now(),
            sender_id: data.sender_id || data.from_user_id,
            receiver_id: data.receiver_id,
            content: data.content || data.message,
            sender_name: data.sender_name,
            is_read: false,
            created_at: data.created_at || data.timestamp,
          }];
        });
        // Mark as read
        api.patch(`/chat/${orderId}/read`).catch(() => {});
      }
    };

    const handleRead = (data) => {
      if (data.order_id === orderId) {
        setMessages((prev) => prev.map((m) =>
          m.sender_id === user?.id ? { ...m, is_read: true } : m
        ));
      }
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:read', handleRead);

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:read', handleRead);
    };
  }, [orderId, user?.id]);

  // Scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSend = useCallback(async () => {
    const text = newMessage.trim();
    if (!text || sending) return;

    setSending(true);
    setNewMessage('');

    const optimistic = {
      id: 'temp-' + Date.now(),
      sender_id: user?.id,
      content: text,
      sender_name: user?.full_name || 'Moi',
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const { data } = await api.post(`/chat/${orderId}`, { content: text });
      setMessages((prev) =>
        prev.map((m) => m.id === optimistic.id ? { ...data.data, sender_name: optimistic.sender_name } : m)
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setNewMessage(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [newMessage, sending, orderId, user]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clientName = order?.client_name || 'Client';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => router.back()} className="p-1">
          <FiArrowLeft size={20} />
        </button>
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <FiUser size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{clientName}</p>
          <p className="text-xs text-blue-200">Commande #{order?.order_number}</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-3">
              <FiSend className="text-gray-300" size={24} />
            </div>
            <p className="text-sm text-gray-400">Discutez avec le client</p>
            <p className="text-xs text-gray-300 mt-1">Coordonnez-vous pour la livraison</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                isMine
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-white text-gray-800 shadow-sm rounded-bl-md'
              }`}>
                {!isMine && (
                  <p className="text-xs font-medium text-blue-600 mb-0.5">{msg.sender_name || clientName}</p>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                <div className={`flex items-center justify-end gap-1 mt-1 ${
                  isMine ? 'text-blue-200' : 'text-gray-300'
                }`}>
                  <span className="text-[10px]">
                    {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isMine && (
                    <span className="text-[10px]">{msg.is_read ? '✓✓' : '✓'}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      {!['delivered', 'cancelled'].includes(order?.status) && (
        <div className="shrink-0 bg-white border-t px-4 py-3">
          <div className="flex items-end gap-2 max-w-lg mx-auto">
            <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5">
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrire un message..."
                rows={1}
                className="w-full bg-transparent text-sm resize-none outline-none max-h-24"
                style={{ minHeight: '20px' }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-blue-700 transition"
            >
              <FiSend size={16} className="ml-0.5" />
            </button>
          </div>
        </div>
      )}

      {['delivered', 'cancelled'].includes(order?.status) && (
        <div className="shrink-0 bg-gray-100 px-4 py-3 text-center">
          <p className="text-xs text-gray-400">Livraison {order.status === 'delivered' ? 'terminée' : 'annulée'} — chat terminé</p>
        </div>
      )}
    </div>
  );
}

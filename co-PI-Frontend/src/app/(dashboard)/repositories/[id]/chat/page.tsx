'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { apiFetch, getUser } from '@/lib/api';
import { PROJECTS } from '@/lib/endpoints';
import Link from 'next/link';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  isAiResponse: boolean;
  createdAt: string;
  user?: User;
  isStreaming?: boolean;
}

export default function RepositoryChatPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const repositoryId = resolvedParams.id;
  const router = useRouter();
  const currentUser = getUser<User>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map()); // map of userId -> name
  const [onlineUsers, setOnlineUsers] = useState<Map<string, number>>(new Map()); // map of userId -> lastSeenTimestamp
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!currentUser) return;

    // Load history
    apiFetch<ChatMessage[]>(PROJECTS.CHAT_HISTORY(repositoryId))
      .then(res => {
        setMessages(res || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load chat history', err);
        setLoading(false);
      });

    // Setup Socket
    const socket = getSocket();
    socket.connect();

    socket.emit('join-chat', repositoryId, currentUser.id);

    // Socket Event Listeners
    socket.on('receive-chat-message', (msg: any) => {
      setMessages(prev => {
        // Find if we have an optimistic message to replace by EXACT tempId
        if (msg.tempId) {
          const tempIndex = prev.findIndex(m => m.id === msg.tempId);
          if (tempIndex !== -1) {
            const next = [...prev];
            next[tempIndex] = msg;
            return next;
          }
        }
        // Fallback for messages from others or if tempId didn't match
        // Prevent duplicate real messages just in case
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('chat-copi-start', (msg: ChatMessage) => {
      setMessages(prev => [...prev, { ...msg, isStreaming: true }]);
    });

    socket.on('chat-copi-chunk', ({ id, chunk }: { id: string, chunk: string }) => {
      setMessages(prev => prev.map(m => 
        m.id === id ? { ...m, content: m.content + chunk } : m
      ));
    });

    socket.on('chat-copi-end', ({ id }: { id: string }) => {
      setMessages(prev => prev.map(m => 
        m.id === id ? { ...m, isStreaming: false } : m
      ));
    });

    socket.on('typing-start', (payload: { userId: string, name: string }) => {
      setTypingUsers(prev => {
        const next = new Map(prev);
        next.set(payload.userId, payload.name);
        return next;
      });
    });

    socket.on('typing-stop', (payload: { userId: string }) => {
      setTypingUsers(prev => {
        const next = new Map(prev);
        next.delete(payload.userId);
        return next;
      });
    });

    socket.on('user-status-changed', (payload: { userId: string, status: string }) => {
      if (payload.status === 'online') {
        setOnlineUsers(prev => {
          const next = new Map(prev);
          next.set(payload.userId, Date.now());
          return next;
        });
      }
    });

    // Clean up stale online users every 15s
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setOnlineUsers(prev => {
        let changed = false;
        const next = new Map(prev);
        for (const [uid, lastSeen] of next.entries()) {
          if (now - lastSeen > 15000) {
            next.delete(uid);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 15000);

    return () => {
      clearInterval(cleanupInterval);
      socket.emit('leave-chat', repositoryId, currentUser.id);
      socket.off('receive-chat-message');
      socket.off('chat-copi-start');
      socket.off('chat-copi-chunk');
      socket.off('chat-copi-end');
      socket.off('typing-start');
      socket.off('typing-stop');
      socket.off('user-status-changed');
    };
  }, [repositoryId, currentUser?.id]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isUserScrolling.current && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // If we are within 50px of the bottom, we consider it at the bottom
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    isUserScrolling.current = !isNearBottom;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    if (currentUser) {
      const socket = getSocket();
      socket.emit('typing-start', repositoryId, { userId: currentUser.id, name: currentUser.firstName });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing-stop', repositoryId, currentUser.id);
      }, 1000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !currentUser) return;

    const socket = getSocket();
    
    // Optimistic UI Update
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      content: input.trim(),
      userId: currentUser.id,
      isAiResponse: false,
      createdAt: new Date().toISOString(),
      user: currentUser,
    };
    setMessages(prev => [...prev, optimisticMsg]);

    socket.emit('send-chat-message', repositoryId, {
      userId: currentUser.id,
      content: input.trim(),
      tempId,
    });

    setInput('');
    socket.emit('typing-stop', repositoryId, currentUser.id);
    
    // Force scroll to bottom when sending a message
    isUserScrolling.current = false;
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  if (!mounted || !currentUser) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f9f9f8' }}>
      {/* Header */}
      <div style={{ padding: '1rem 1.5rem', background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111' }}>Team Chat</h2>
      </div>

      {/* Messages Area */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        {loading && <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading messages...</div>}
        
        {messages.map((msg, i) => {
          const isMe = msg.userId === currentUser.id && !msg.isAiResponse;
          return (
            <div key={msg.id || i} style={{ display: 'flex', gap: '0.75rem', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
              
              {/* Avatar */}
              {!isMe && (
                <div style={{ position: 'relative' }}>
                  <Link href={msg.isAiResponse ? '#' : `/profiles/${msg.user?.email.split('@')[0]}`}>
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', background: msg.isAiResponse ? '#6b21a8' : '#2A7C75', 
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600,
                      cursor: msg.isAiResponse ? 'default' : 'pointer',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}>
                      {msg.isAiResponse ? 'AI' : (msg.user?.firstName?.[0] || 'U')}
                    </div>
                  </Link>
                  {/* Online Indicator */}
                  {!msg.isAiResponse && onlineUsers.has(msg.userId) && (
                    <div style={{
                      position: 'absolute', bottom: 0, right: 0,
                      width: '10px', height: '10px', borderRadius: '50%', background: '#10b981',
                      border: '2px solid #fff', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }} />
                  )}
                </div>
              )}

              {/* Bubble */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                {!isMe && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', marginLeft: '0.5rem' }}>
                    {msg.isAiResponse ? 'coPI Assistant' : `${msg.user?.firstName} ${msg.user?.lastName}`}
                  </span>
                )}
                <div style={{
                  background: isMe ? '#2A7C75' : (msg.isAiResponse ? '#f3e8ff' : '#fff'),
                  color: isMe ? '#fff' : (msg.isAiResponse ? '#4c1d95' : '#111'),
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  borderBottomRightRadius: isMe ? 0 : '12px',
                  borderBottomLeftRadius: isMe ? '12px' : 0,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  border: isMe ? 'none' : '1px solid rgba(0,0,0,0.05)',
                  lineHeight: '1.5',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  position: 'relative'
                }}>
                  {msg.content}
                  {msg.isStreaming && <span className="blinking-cursor">|</span>}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', marginRight: isMe ? '0.5rem' : 0, marginLeft: !isMe ? '0.5rem' : 0 }}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

            </div>
          );
        })}

        {/* Typing Indicators */}
        {Array.from(typingUsers.entries()).map(([userId, name]) => (
           <div key={`typing-${userId}`} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ccc', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600 }}>
              {name[0]}
            </div>
            <div style={{ background: '#e5e7eb', padding: '0.5rem 1rem', borderRadius: '12px', display: 'flex', gap: '4px', alignItems: 'center' }}>
               <span style={{ width: '6px', height: '6px', background: '#9ca3af', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }} />
               <span style={{ width: '6px', height: '6px', background: '#9ca3af', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.2s' }} />
               <span style={{ width: '6px', height: '6px', background: '#9ca3af', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.4s' }} />
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '1rem 1.5rem', background: '#fff', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={(e) => handleInputChange(e as any)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message or tag @coPI..."
            rows={input.split('\n').length > 1 ? Math.min(input.split('\n').length, 5) : 1}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: '24px',
              border: '1px solid rgba(0,0,0,0.2)',
              outline: 'none',
              fontSize: '0.95rem',
              resize: 'none',
              minHeight: '44px',
              fontFamily: 'inherit',
              lineHeight: '1.5'
            }}
          />
          <button
            type="submit"
            style={{
              background: '#2A7C75',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() ? 'pointer' : 'default',
              opacity: input.trim() ? 1 : 0.6,
              transition: 'all 0.2s'
            }}
            disabled={!input.trim()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
      
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        .blinking-cursor {
          animation: blink 1s step-end infinite;
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

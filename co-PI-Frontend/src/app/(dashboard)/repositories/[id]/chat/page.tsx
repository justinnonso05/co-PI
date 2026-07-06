'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
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
  const [onlineUsers, setOnlineUsers] = useState<Map<string, { lastSeen: number, firstName: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
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

    socket.on('user-status-changed', (payload: { userId: string, firstName?: string, status: string }) => {
      if (payload.status === 'online') {
        setOnlineUsers(prev => {
          const next = new Map(prev);
          next.set(payload.userId, { lastSeen: Date.now(), firstName: payload.firstName || 'Unknown' });
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
        for (const [uid, data] of next.entries()) {
          if (now - data.lastSeen > 15000) {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    // Sync scroll
    if (overlayRef.current) {
      overlayRef.current.scrollTop = e.target.scrollTop;
    }

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
      
      // If autocomplete is open, select the suggestion instead of sending
      if (showAutocomplete) {
        insertSuggestion();
        return;
      }
      
      handleSend();
    }
  };

  const insertSuggestion = () => {
    setInput(prev => prev.replace(/(^|\s)@$/, '$1@coPI '));
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

  const overlayRef = useRef<HTMLDivElement>(null);
  const showAutocomplete = /(?:^|\s)@$/.test(input);

  const renderHighlightedText = (text: string) => {
    if (!text) return <span style={{ color: '#aaa' }}>Type your message or tag @coPI...</span>;
    const parts = text.split(/(@copi)/i);
    return parts.map((part, i) => 
      part.toLowerCase() === '@copi' 
        ? <span key={i} style={{ color: '#2A7C75', background: 'rgba(42,124,117,0.15)', padding: '0 2px', borderRadius: '4px', fontWeight: 600 }}>{part}</span> 
        : <span key={i}>{part}</span>
    );
  };

  const renderMessageContent = (msg: ChatMessage, isMe: boolean) => {
    const parts = msg.content.split(/(@copi)/i);
    return parts.map((part, i) => 
      part.toLowerCase() === '@copi' 
        ? (
          <span 
            key={i} 
            onClick={() => setActiveModal(msg.id)}
            style={{ 
              color: isMe ? '#2A7C75' : '#2A7C75', 
              background: isMe ? '#fff' : 'rgba(42,124,117,0.15)', 
              padding: '0 4px', borderRadius: '4px', fontWeight: 600,
              cursor: 'pointer', display: 'inline-block',
              boxShadow: isMe ? '0 2px 4px rgba(0,0,0,0.1)' : '0 1px 2px rgba(42,124,117,0.2)'
            }}
          >
            {part}
          </span>
        ) 
        : <span key={i}>{part}</span>
    );
  };

  if (!mounted || !currentUser) return null;

  // Render Portal Header
  const headerPortal = document.getElementById('ds-topbar-portal-target');
  const onlineList = Array.from(onlineUsers.values());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      {/* Header Portal */}
      {headerPortal && createPortal(
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#111' }}>Team Chat</h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {onlineList.length} online
            {onlineList.length > 0 && ': '}
            {onlineList.slice(0, 3).map(u => u.firstName).join(', ')}
            {onlineList.length > 3 && '...'}
          </div>
        </div>,
        headerPortal
      )}

      {/* Messages Area */}
      <div 
        className="chat-scroll-container"
        ref={chatContainerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
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
                  background: isMe ? '#2A7C75' : (msg.isAiResponse ? '#f3e8ff' : '#f3f4f6'),
                  color: isMe ? '#fff' : (msg.isAiResponse ? '#4c1d95' : '#111'),
                  padding: '0.75rem 1rem',
                  borderRadius: '16px',
                  borderBottomRightRadius: isMe ? '4px' : '16px',
                  borderBottomLeftRadius: isMe ? '16px' : '4px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  lineHeight: '1.5',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  position: 'relative'
                }}>
                  {renderMessageContent(msg, isMe)}
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
      <div style={{ padding: '0.75rem 1rem', background: '#fff', borderTop: '1px solid rgba(0,0,0,0.1)', position: 'relative' }}>
        
        {/* Autocomplete Popover */}
        {showAutocomplete && (
          <div style={{
            position: 'absolute', bottom: '100%', left: '1rem', marginBottom: '0.5rem',
            background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden'
          }}>
            <button
              onClick={(e) => { e.preventDefault(); insertSuggestion(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem',
                border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.95rem',
                color: '#111', width: '100%', textAlign: 'left', fontWeight: 500
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ color: '#2A7C75' }}>✨</span> @coPI
            </button>
          </div>
        )}

        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'stretch' }}>
            {/* The underlying Highlighted Text */}
            <div
              ref={overlayRef}
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                lineHeight: '1.5',
                fontFamily: 'inherit',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: '#111',
                pointerEvents: 'none',
                overflowY: 'auto',
                overflowX: 'hidden'
              }}
            >
              {renderHighlightedText(input)}
            </div>
            
            {/* The transparent interactive textarea */}
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onScroll={(e) => { if (overlayRef.current) overlayRef.current.scrollTop = e.currentTarget.scrollTop; }}
              placeholder=""
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
                lineHeight: '1.5',
                color: 'transparent',
                caretColor: '#111',
                background: 'transparent',
                zIndex: 2,
              }}
            />
          </div>
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
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        /* Responsive Modal CSS */
        .copi-action-modal {
          position: fixed;
          z-index: 1000;
          background: #fff;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        @media (max-width: 767px) {
          .copi-action-modal {
            bottom: 0;
            left: 0;
            right: 0;
            border-top-left-radius: 24px;
            border-top-right-radius: 24px;
            padding: 1.5rem;
            padding-bottom: 2.5rem;
            box-shadow: 0 -10px 40px rgba(0,0,0,0.1);
          }
          .chat-scroll-container::-webkit-scrollbar {
            display: none;
          }
          .chat-scroll-container {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        }
        
        @media (min-width: 768px) {
          .copi-action-modal {
            bottom: 2rem;
            right: 2rem;
            width: 360px;
            border-radius: 16px;
            padding: 1.5rem;
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          }
        }
      `}</style>

      {/* @coPI Action Modal */}
      {activeModal && createPortal(
        <>
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999, animation: 'fadeIn 0.2s' }}
            onClick={() => setActiveModal(null)}
          />
          <div className="copi-action-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#111', fontSize: '1.1rem' }}>
                <span style={{ color: '#2A7C75', fontSize: '1.2rem' }}>✨</span> @coPI Action
              </h3>
              <button 
                onClick={() => setActiveModal(null)}
                style={{ background: '#f3f4f6', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#666' }}
              >
                ✕
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              You interacted with a @coPI mention. What would you like to do?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button className="dash-btn-primary" style={{ background: '#2A7C75', justifyContent: 'center', padding: '0.8rem' }}>Extract Action Items</button>
              <button className="dash-btn-ghost" style={{ justifyContent: 'center', border: '1px solid rgba(0,0,0,0.1)', padding: '0.8rem' }}>Summarize Context</button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

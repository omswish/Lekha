// frontend/src/components/ChatbotWidget.jsx

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, ShieldAlert, Sparkles, Navigation } from 'lucide-react';

/**
 * ChatbotWidget Component: Floating chat assistant in the bottom right.
 * Understands natural English, queries database, and assists with navigation.
 * Designed with Maximo colors (Cream and Dark Orange) and Nice Rounded Corners (12px-16px).
 * 
 * @param {Object} props
 * @param {string} props.token - Authorization JWT.
 * @param {Function} props.setActiveTab - Navigate to other sections.
 */
export default function ChatbotWidget({ token, setActiveTab }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hello! I am Lekha, your compliance assistant. I can query the database or guide you around. What can I help you with today?'
    }
  ]);
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input || input.trim() === '') return;

    const userText = input.trim();
    setInput('');

    // Add user message to state
    const userMsgId = `user-${Date.now()}`;
    setMessages(prev => [...prev, { id: userMsgId, sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/chatbot/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userText })
      });
      const data = await response.json();
      
      const botMsgId = `bot-${Date.now()}`;
      if (response.ok) {
        setMessages(prev => [...prev, { 
          id: botMsgId, 
          sender: 'bot', 
          text: data.reply, 
          recordData: data.data 
        }]);
        if (data.action && data.action.type === 'NAVIGATE') {
          setActiveTab(data.action.tab);
        }
      } else {
        setMessages(prev => [...prev, { 
          id: botMsgId, 
          sender: 'bot', 
          text: data.error || 'Failed to process request.' 
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        id: botMsgId, 
        sender: 'bot', 
        text: 'Connection error. Make sure the API backend is active.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000, fontFamily: 'var(--font-family)' }}>
      {/* Floating Chat Bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-primary)',
            color: '#ffffff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(230, 95, 0, 0.4)',
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title="Open Compliance Assistant"
        >
          <MessageSquare size={26} />
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div
          style={{
            width: '380px',
            height: '520px',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              padding: '1rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} />
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Lekha</div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.8 }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '0.8'}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Body */}
          <div
            style={{
              flex: 1,
              padding: '1.25rem',
              overflowY: 'auto',
              backgroundColor: 'var(--bg-primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  width: '100%'
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    lineHeight: 1.4,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    backgroundColor: msg.sender === 'user' ? 'var(--accent-primary)' : '#ffffff',
                    color: msg.sender === 'user' ? '#ffffff' : 'var(--color-text-primary)',
                    border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                    borderBottomRightRadius: msg.sender === 'user' ? '2px' : '12px',
                    borderBottomLeftRadius: msg.sender === 'bot' ? '2px' : '12px',
                    whiteSpace: 'pre-line'
                  }}
                >
                  {msg.text}

                  {/* Render Nested Database Record Cards if available */}
                  {msg.recordData && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {/* If data is array (list of items) */}
                      {Array.isArray(msg.recordData) ? (
                        msg.recordData.map((item, index) => (
                          <div 
                            key={index} 
                            style={{ 
                              padding: '0.5rem 0.75rem', 
                              backgroundColor: 'var(--bg-tertiary)', 
                              borderRadius: '8px', 
                              border: '1px solid var(--border-color)',
                              fontSize: '0.8rem',
                              color: 'var(--color-text-primary)'
                            }}
                          >
                            {Object.entries(item).map(([key, val]) => (
                              <div key={key}>
                                <strong style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}:</strong> {String(val)}
                              </div>
                            ))}
                          </div>
                        ))
                      ) : (
                        // If data is single object
                        <div 
                          style={{ 
                            padding: '0.5rem 0.75rem', 
                            backgroundColor: 'var(--bg-tertiary)', 
                            borderRadius: '8px', 
                            border: '1px solid var(--border-color)',
                            fontSize: '0.8rem',
                            color: 'var(--color-text-primary)'
                          }}
                        >
                          {Object.entries(msg.recordData).map(([key, val]) => (
                            <div key={key}>
                              <strong style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}:</strong> {String(val)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '0.5rem 1rem', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                  Thinking...
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Form Footer */}
          <form
            onSubmit={handleSend}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#ffffff',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: '0.5rem'
            }}
          >
            <input
              type="text"
              placeholder="Ask a compliance question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.65rem 1rem',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                fontSize: '0.85rem',
                outline: 'none',
                backgroundColor: 'var(--bg-primary)',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                backgroundColor: input.trim() ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: input.trim() ? '#ffffff' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: '12px',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() ? 'pointer' : 'default',
                transition: 'all 0.2s ease'
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

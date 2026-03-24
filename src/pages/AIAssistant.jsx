import React, { useState, useEffect, useRef } from 'react';
import { FiSend, FiZap, FiTrash2 } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import API from '../utils/api';
import BotMessage from '../components/BotMessage';

const VESSELX_AVATAR = { name: 'Vesselx AI', username: 'vesselx_ai', profilePicture: null };

export default function AIAssistant({ currentUser, unreadCounts }) {
  const [convId, setConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { initConversation(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const initConversation = async () => {
    setLoading(true);
    try {
      const data = await API.startAIConversation();
      setConvId(data.conversationId);
      setMessages(data.messages || []);
    } catch { }
    finally { setLoading(false); }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending || !convId) return;
    const msg = input.trim();
    setInput('');
    setSending(true);
    const userMsg = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    try {
      const data = await API.sendAIMessage(convId, msg);
      const aiMsg = { role: 'assistant', content: data.response, timestamp: data.timestamp || new Date().toISOString() };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble responding right now. Please try again.", timestamp: new Date().toISOString() }]);
    } finally { setSending(false); }
  };

  const handleClear = async () => {
    if (!confirm('Clear this conversation?')) return;
    try {
      if (convId) await API.request(`/api/ai/conversations/${convId}`, { method: 'DELETE' });
      await initConversation();
    } catch { }
  };

  const SUGGESTIONS = [
    "How do I create a post?",
    "What is VesselX about?",
    "How do groups work?",
    "Tell me something interesting",
  ];

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="max-w-2xl mx-auto flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-discord-bg/95 backdrop-blur border-b border-discord-hover px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-discord-brand to-purple-600 flex items-center justify-center">
              <FiZap size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-discord-text text-sm">Vesselx AI</h1>
              <p className="text-discord-green text-xs">● Online</p>
            </div>
          </div>
          <button className="p-2 rounded-lg text-discord-muted hover:text-discord-red hover:bg-discord-red/10 transition-colors" onClick={handleClear} title="Clear conversation">
            <FiTrash2 size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ maxHeight: 'calc(100vh - 160px)' }}>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-discord-brand to-purple-600 flex items-center justify-center mx-auto mb-3">
                <FiZap size={28} className="text-white" />
              </div>
              <p className="text-discord-text font-bold">Vesselx AI</p>
              <p className="text-discord-muted text-sm mt-1">Your intelligent assistant. Ask me anything!</p>
            </div>
          ) : messages.map((msg, i) => {
            const isAI = msg.role === 'assistant';
            return (
              <div key={i} className={`flex items-start gap-3 animate-slide-up ${!isAI ? 'flex-row-reverse' : ''}`}>
                <div className="flex-shrink-0">
                  {isAI ? (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-discord-brand to-purple-600 flex items-center justify-center">
                      <FiZap size={16} className="text-white" />
                    </div>
                  ) : (
                    <Avatar user={currentUser} size={36} />
                  )}
                </div>
                <div className={`max-w-xs lg:max-w-md ${isAI ? '' : 'items-end'} flex flex-col`}>
                  <div
                    className={`px-4 py-3 rounded-2xl ${isAI ? 'bg-discord-sidebar text-discord-text rounded-tl-sm' : 'bg-discord-brand text-white rounded-tr-sm'}`}
                  >
                    <BotMessage text={msg.content} />
                  </div>
                  <span className="text-discord-muted text-[10px] mt-1">
                    {msg.timestamp ? formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true }) : ''}
                  </span>
                </div>
              </div>
            );
          })}
          {sending && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-discord-brand to-purple-600 flex items-center justify-center flex-shrink-0">
                <FiZap size={16} className="text-white" />
              </div>
              <div className="bg-discord-sidebar px-4 py-3 rounded-2xl rounded-tl-sm">
                <div className="typing-indicator"><span/><span/><span/></div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && !loading && (
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s} className="text-xs bg-discord-sidebar text-discord-muted border border-discord-hover rounded-full px-3 py-1.5 hover:bg-discord-hover hover:text-discord-text transition-colors" onClick={() => setInput(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSend} className="px-4 py-3 border-t border-discord-hover">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask Vesselx AI anything..."
              className="discord-input flex-1"
              disabled={sending}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
            />
            <button type="submit" disabled={!input.trim() || sending} className="discord-btn p-2.5 rounded-lg disabled:opacity-40">
              <FiSend size={16} />
            </button>
          </div>
        </form>
        <div className="h-20 md:h-2" />
      </div>
    </Layout>
  );
}

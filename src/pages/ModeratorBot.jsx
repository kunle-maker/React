import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShield, FiArrowLeft, FiAlertTriangle, FiCheckCircle, FiClock } from 'react-icons/fi';
import Layout from '../components/Layout';
import API from '../utils/api';
import BotMessage from '../components/BotMessage';

const STATUS_CONFIG = {
  active: { icon: FiCheckCircle, color: '#3ba55c', label: 'Good Standing', bg: 'rgba(59,165,92,0.1)' },
  warning: { icon: FiAlertTriangle, color: '#faa61a', label: 'Warning Issued', bg: 'rgba(250,166,26,0.1)' },
  limited: { icon: FiClock, color: '#eb459e', label: 'Account Limited', bg: 'rgba(235,69,158,0.1)' },
  banned: { icon: FiAlertTriangle, color: '#ed4245', label: 'Account Banned', bg: 'rgba(237,66,69,0.1)' },
};

export default function ModeratorBot({ currentUser, unreadCounts }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { fetchStatus(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await API.getModeratorBotStatus();
      setStatus(data);
      setMessages([{
        from: 'bot',
        text: data.greeting || "Hello. I'm the VesselX Moderator Bot. I can explain your account status and answer questions about any restrictions.",
        buttons: data.buttons || [],
      }]);
    } catch (err) {
      setStatus({ status: 'active', buttons: [] });
      setMessages([{
        from: 'bot',
        text: "Hello! Your account is in good standing. No restrictions apply to your account right now.",
        buttons: [],
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleButton = async (action, label) => {
    if (chatLoading) return;
    setMessages(prev => [...prev, { from: 'user', text: label }]);
    setChatLoading(true);
    try {
      const data = await API.chatWithModeratorBot(action);
      setMessages(prev => [...prev, {
        from: 'bot',
        text: data.reply || data.message || 'I understand. Is there anything else you need help with?',
        buttons: data.buttons || [],
      }]);
    } catch {
      setMessages(prev => [...prev, {
        from: 'bot',
        text: 'Sorry, I had trouble processing that. Please try again.',
        buttons: status?.buttons || [],
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const currentStatus = status?.status || 'active';
  const cfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.active;
  const StatusIcon = cfg.icon;
  const lastBotMsg = [...messages].reverse().find(m => m.from === 'bot');

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="max-w-2xl mx-auto flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-discord-hover sticky top-0 bg-discord-bg z-10">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-discord-muted hover:text-discord-text hover:bg-discord-hover transition-colors">
            <FiArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5865f2, #eb459e)' }}>
              <FiShield size={16} className="text-white" />
            </div>
            <div>
              <p className="text-discord-text font-semibold text-sm leading-tight">Moderator Bot</p>
              <p className="text-discord-muted text-xs leading-tight">VesselX Trust & Safety</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div
              className="mx-4 mt-4 mb-3 p-3.5 rounded-2xl flex items-center gap-3"
              style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.color}30` }}
            >
              <StatusIcon size={22} style={{ color: cfg.color, flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm" style={{ color: cfg.color }}>{cfg.label}</p>
                {status?.banReason && (
                  <p className="text-discord-muted text-xs mt-0.5 truncate">{status.banReason}</p>
                )}
                {status?.bannedUntil && (
                  <p className="text-discord-muted text-xs mt-0.5">
                    Until: {new Date(status.bannedUntil).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
                {status?.isPermanentBan && currentStatus === 'limited' && (
                  <p className="text-xs mt-0.5" style={{ color: cfg.color }}>Permanent restriction</p>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'} flex-col gap-2`}>
                  {msg.from === 'bot' && (
                    <div className="flex items-start gap-2 max-w-xs">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #5865f2, #eb459e)' }}>
                        <FiShield size={13} className="text-white" />
                      </div>
                      <div className="bg-discord-dark border border-discord-hover rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[calc(100%-2.5rem)] text-discord-text">
                        <BotMessage text={msg.text} />
                      </div>
                    </div>
                  )}
                  {msg.from === 'user' && (
                    <div className="flex justify-end">
                      <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-white text-sm max-w-xs" style={{ background: 'linear-gradient(135deg, #5865f2, #7b6cf2)' }}>
                        {msg.text}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {chatLoading && (
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #5865f2, #eb459e)' }}>
                    <FiShield size={13} className="text-white" />
                  </div>
                  <div className="bg-discord-dark border border-discord-hover rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-discord-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-discord-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-discord-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {lastBotMsg?.buttons?.length > 0 && !chatLoading && (
              <div className="px-4 pt-2 pb-24 md:pb-6 border-t border-discord-hover/50 flex-shrink-0">
                <p className="text-discord-muted text-xs mb-2 text-center">Select a question</p>
                <div className="flex flex-col gap-2">
                  {lastBotMsg.buttons.map((btn, i) => (
                    <button
                      key={i}
                      onClick={() => handleButton(btn.action || btn.value || btn, btn.label || btn)}
                      className="w-full px-4 py-2.5 rounded-xl text-sm text-discord-text border border-discord-hover hover:border-discord-brand hover:text-discord-brand hover:bg-discord-brand/5 transition-all text-left"
                    >
                      {btn.label || btn}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {lastBotMsg?.buttons?.length === 0 && !chatLoading && currentStatus === 'active' && (
              <div className="px-4 pb-24 md:pb-6 pt-2 text-center flex-shrink-0">
                <p className="text-discord-muted text-sm">You have no active restrictions. Everything looks good!</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

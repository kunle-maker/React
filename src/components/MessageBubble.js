import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../utils/api';

const LinkPreview = ({ url }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const domain = new URL(url).hostname;
        setPreview({
          title: domain,
          description: `Visit ${domain}`,
          icon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
          url: url
        });
      } catch (e) {
        console.error('Failed to parse URL', e);
      } finally {
        setLoading(false);
      }
    };
    fetchPreview();
  }, [url]);

  if (loading || !preview) return null;

  return (
    <a href={preview.url} target="_blank" rel="noopener noreferrer" className="link-preview-card" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px',
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '8px',
      marginTop: '8px',
      textDecoration: 'none',
      color: 'inherit',
      border: '1px solid rgba(255,255,255,0.2)'
    }}>
      <img src={preview.icon} alt="" style={{ width: '32px', height: '32px', borderRadius: '4px' }} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview.title}</div>
        <div style={{ fontSize: '11px', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview.description}</div>
      </div>
    </a>
  );
};

const MentionLink = ({ username, text }) => {
  const [exists, setExists] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        await API.getUser(username);
        setExists(true);
      } catch (e) {
        setExists(false);
      }
    };
    checkUser();
  }, [username]);

  if (exists === false) return <span>{text}</span>;
  
  return (
    <Link 
      to={`/profile/${username}`} 
      style={{ 
        color: 'var(--mention-color)', 
        fontWeight: '600', 
        textDecoration: 'none',
        textShadow: '0 0 1px rgba(0,0,0,0.2)'
      }}
    >
      {text}
    </Link>
  );
};

const MessageBubble = ({ message, isOwn }) => {
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderText = (text) => {
    if (!text) return null;

    // URL Regex
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    // Mention Regex
    const mentionRegex = /(@[a-zA-Z0-9_]+)/g;

    const parts = text.split(/((?:https?:\/\/[^\s]+)|(?:@[a-zA-Z0-9_]+))/g);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'underline' }}>{part}</a>;
      }
      if (part.match(mentionRegex)) {
        const username = part.substring(1);
        return <MentionLink key={i} username={username} text={part} />;
      }
      return part;
    });
  };

  const urls = message.text?.match(/(https?:\/\/[^\s]+)/g) || [];

  return (
    <div className={`message-bubble-container ${isOwn ? 'own' : 'other'}`}>
      <div className={`message-bubble ${isOwn ? 'own' : 'other'}`}>
        <div className="message-text">
          {renderText(message.text)}
        </div>
        {urls.length > 0 && <LinkPreview url={urls[0]} />}
        <div className="message-time">
          {formatTime(message.createdAt)}
          {isOwn && message.status && (
            <span className={`message-status ${message.status}`}>
              {message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
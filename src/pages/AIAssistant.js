import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import API from '../utils/api';
import { FiSend, FiCpu, FiUser, FiPlus, FiMessageCircle } from 'react-icons/fi';

const AIAssistant = () => {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const data = await API.getAIConversations();
      setConversations(data || []);
      if (data.length > 0 && !currentConversation) {
        handleSelectConversation(data[0]);
      }
    } catch (error) {
      console.error('Error fetching AI conversations:', error);
    }
  };

  const handleSelectConversation = async (conv) => {
    setCurrentConversation(conv);
    try {
      const data = await API.request(`/api/ai/conversations/${conv.conversationId}`);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching conversation details:', error);
    }
  };

  const handleStartNew = async () => {
    try {
      const data = await API.startAIConversation();
      setConversations([data, ...conversations]);
      setCurrentConversation(data);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error starting new AI conversation:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !currentConversation || isLoading) return;

    const userMessage = { role: 'user', content: input, timestamp: new Date() };
    setMessages([...messages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await API.sendAIMessage(currentConversation.conversationId, input);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response, timestamp: data.timestamp }]);
    } catch (error) {
      console.error('Error sending AI message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-page">
      <Navbar user={user} />
      <main className="main-content">
        <div className="ai-layout">
          <div className="ai-sidebar">
            <button className="btn btn-primary w-100 mb-4" onClick={handleStartNew}>
              <FiPlus className="mr-2" /> New Chat
            </button>
            <div className="ai-conv-list">
              {conversations.map(conv => (
                <div 
                  key={conv.conversationId} 
                  className={`ai-conv-item ${currentConversation?.conversationId === conv.conversationId ? 'active' : ''}`}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <FiMessageCircle className="mr-2" />
                  <span className="text-truncate">{conv.title || 'Untitled Chat'}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="ai-chat-container">
            {!currentConversation ? (
              <div className="ai-welcome">
                <FiCpu size={64} className="mb-4 text-primary" />
                <h2>Welcome to Vesselx AI</h2>
                <p>Start a new conversation to begin chatting with your personal assistant.</p>
                <button className="btn btn-primary mt-4" onClick={handleStartNew}>Start Chatting</button>
              </div>
            ) : (
              <>
                <div className="ai-messages">
                  {messages.map((msg, i) => (
                    <div key={i} className={`ai-message ${msg.role}`}>
                      <div className="ai-message-avatar">
  {msg.role === 'user' ? (
    user?.profilePicture ? 
      <img src={user.profilePicture} alt="User" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : 
      <FiUser />
  ) : (
    <FiCpu className="text-primary" />
  )}
</div>
                      <div className="ai-message-content">
                        <div className="ai-message-bubble">{msg.content}</div>
                        <div className="ai-message-time">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="ai-message assistant">
                      <div className="ai-message-avatar"><FiCpu className="text-primary" /></div>
                      <div className="ai-message-bubble loading-dots">
                        <span>.</span><span>.</span><span>.</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                <form className="ai-input-form" onSubmit={handleSendMessage}>
                  <input 
                    type="text" 
                    placeholder="Ask Vesselx AI anything..." 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                  />
                  <button type="submit" className="ai-send-btn" disabled={!input.trim() || isLoading}>
                    <FiSend size={20} />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AIAssistant;
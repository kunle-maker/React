import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ConversationList from '../components/ConversationList';
import MessageThread from '../components/MessageThread';
import { FiSearch, FiEdit, FiMoreVertical } from 'react-icons/fi';
import API from '../utils/api';

const Messages = ({ unreadCounts }) => {
  const { username } = useParams();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  const navigate = useNavigate();
  const isFetchingRef = useRef(false);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    
    const params = new URLSearchParams(window.location.search);
    const directUser = params.get('user');
    
    // Initial fetch with delay
    setTimeout(() => {
      fetchConversations(directUser);
    }, 100);
  }, []);

  // Handle URL param changes
  useEffect(() => {
    if (!initialLoadRef.current && username) {
      const params = new URLSearchParams(window.location.search);
      const directUser = params.get('user') || username;
      
      if (directUser) {
        // Find or create conversation for this user
        const targetConv = conversations.find(c => 
          (c.user && c.user.username === directUser) || 
          (c.otherUser && c.otherUser.username === directUser)
        );
        
        if (targetConv) {
          handleSelectConversation(targetConv);
        } else {
          // Try to fetch user and create temp conversation
          fetchUserAndCreateConversation(directUser);
        }
      }
    }
  }, [username, conversations]);

  const fetchConversations = async (directUser = null) => {
    if (isFetchingRef.current) return;
    
    setIsLoading(true);
    isFetchingRef.current = true;
    
    try {
      const data = await API.getConversations();
      setConversations(data || []);
      
      if (directUser) {
        const targetConv = (data || []).find(c => 
          (c.user && c.user.username === directUser) || 
          (c.otherUser && c.otherUser.username === directUser)
        );
        
        if (targetConv) {
          handleSelectConversation(targetConv);
        } else {
          // If no conversation exists, create a temp one
          fetchUserAndCreateConversation(directUser);
        }
      } else if (data.length > 0 && !selectedConversation) {
        // Select first conversation if none selected
        handleSelectConversation(data[0]);
      }
      
      initialLoadRef.current = false;
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  const fetchUserAndCreateConversation = async (username) => {
    try {
      const userData = await API.getUser(username);
      const targetUser = userData.user || userData;
      const tempConv = {
        _id: 'temp-' + Date.now(),
        user: targetUser,
        messages: []
      };
      setSelectedConversation(tempConv);
      setMessages([]);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setMessages([]);
    setPage(1);
    setHasMore(true);
    
    // Small delay to ensure state updates
    setTimeout(() => {
      fetchMessages(conversation);
    }, 50);
  };

  const fetchMessages = async (conversation, loadMore = false) => {
    if (!conversation || !conversation.user?.username) return;
    if (isFetchingRef.current) return;
    
    if (loadMore) {
      setIsLoadingMore(true);
    }
    
    isFetchingRef.current = true;
    
    try {
      const data = await API.getConversation(conversation.user.username);
      const messagesArray = data.messages || data || [];
      
      if (loadMore) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m._id));
          const newMessages = messagesArray.filter(m => !existingIds.has(m._id));
          return [...prev, ...newMessages];
        });
        setHasMore(messagesArray.length === 20); // Assuming 20 per page
      } else {
        setMessages(messagesArray);
        setHasMore(messagesArray.length === 20);
      }
      
      // Mark as read
      try {
        await API.request(`/api/conversations/${conversation.user.username}/read`, { method: 'POST' });
        window.dispatchEvent(new Event('messagesRead'));
        
        // Update unread count in conversations list
        setConversations(prev => prev.map(c => 
          c.user?.username === conversation.user.username
            ? { ...c, unreadCount: 0 }
            : c
        ));
      } catch (e) {
        console.error('Error marking conversation read:', e);
      }
      
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isFetchingRef.current = false;
    }
  };

  const handleSendMessage = async (text) => {
    if (!selectedConversation || !text.trim()) return;

    try {
      const messageData = {
        receiverUsername: selectedConversation.user.username,
        text: text.trim()
      };

      const data = await API.sendMessage(messageData);
      
      // Create a properly formatted message object
      const newMessage = {
        _id: data._id || data.message?._id || Date.now().toString(),
        text: text.trim(),
        senderId: user?._id || user?.id,
        sender: {
          _id: user?._id || user?.id,
          username: user?.username
        },
        receiverId: selectedConversation.user?._id || selectedConversation.otherUser?._id,
        conversationId: data.conversationId || data.message?.conversationId,
        createdAt: new Date().toISOString(),
        status: 'sent'
      };

      // Add the new message to the messages list
      setMessages(prev => [...prev, newMessage]);
      
      // Update conversations list
      setConversations(prev => {
        const updated = prev.map(conv => 
          conv.user?.username === selectedConversation.user.username
            ? { 
                ...conv, 
                lastMessage: { 
                  text: text.trim(), 
                  createdAt: new Date().toISOString() 
                },
                unreadCount: 0
              }
            : conv
        ).sort((a, b) => 
          new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0)
        );
        
        // If this conversation wasn't in the list, add it
        if (!updated.some(c => c.user?.username === selectedConversation.user.username)) {
          updated.unshift({
            user: selectedConversation.user,
            lastMessage: { text: text.trim(), createdAt: new Date().toISOString() },
            unreadCount: 0
          });
        }
        
        return updated;
      });
      
      // If this was a temp conversation, replace it with real one
      if (selectedConversation._id?.startsWith('temp-')) {
        setSelectedConversation(prev => ({
          ...prev,
          _id: data.conversationId || data.message?.conversationId
        }));
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleStartNewChat = () => {
    navigate('/search');
  };

  if (isLoading && conversations.length === 0) {
    return (
      <>
        <Navbar user={user} unreadCounts={unreadCounts} />
        <main className="main-content">
          <div className="messages-layout">
            <div className="messages-sidebar">
              <div className="conversation-search">
                <FiSearch size={16} />
                <input type="text" placeholder="Search conversations..." disabled />
              </div>
              <div className="conversations-loading">
                <div className="loading-spinner small"></div>
                <p>Loading conversations...</p>
              </div>
            </div>
            <div className="message-thread">
              <div className="select-conversation">
                <div className="select-conversation-icon">💬</div>
                <h3>Loading your messages...</h3>
                <div className="loading-spinner small"></div>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar user={user} unreadCounts={unreadCounts} />
      
      <main className="main-content">
        <div className={`messages-layout ${selectedConversation ? 'chat-open' : ''}`}>
          <div className="messages-sidebar">
            <div className="conversation-search">
              <FiSearch size={16} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <ConversationList
              conversations={conversations}
              onSelectConversation={handleSelectConversation}
              searchQuery={searchQuery}
              selectedConversationId={selectedConversation?.user?._id}
            />
          </div>
          
          <div className="message-thread">
            {selectedConversation ? (
              <MessageThread
                conversation={selectedConversation}
                messages={messages}
                onSendMessage={handleSendMessage}
                onBack={() => setSelectedConversation(null)}
                isLoadingMore={isLoadingMore}
                hasMore={hasMore}
                onLoadMore={() => {
                  setPage(prev => prev + 1);
                  fetchMessages(selectedConversation, true);
                }}
              />
            ) : (
              <div className="select-conversation">
                <div className="select-conversation-icon">💬</div>
                <h3>Your Messages</h3>
                <p>Select a conversation or start a new one</p>
                <button 
                  className="btn btn-primary"
                  onClick={handleStartNewChat}
                >
                  <FiEdit size={16} /> Start New Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default Messages;
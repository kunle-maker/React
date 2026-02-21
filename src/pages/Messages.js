import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ConversationList from '../components/ConversationList';
import MessageThread from '../components/MessageThread';
import { FiSearch, FiEdit, FiMoreVertical } from 'react-icons/fi';
import API from '../utils/api';

const Messages = ({ unreadCounts }) => {  // Add unreadCounts prop
  const { username } = useParams();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    
    const params = new URLSearchParams(window.location.search);
    const directUser = params.get('user');
    
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const data = await API.getConversations();
        setConversations(data || []);
        
        if (directUser) {
          const targetConv = data.find(c => 
            (c.user && c.user.username === directUser) || 
            (c.otherUser && c.otherUser.username === directUser)
          );
          
          if (targetConv) {
            handleSelectConversation(targetConv);
          } else {
            // New conversation
            const userData = await API.getUser(directUser);
            const targetUser = userData.user || userData;
            const tempConv = {
              _id: 'temp-' + Date.now(),
              user: targetUser,
              messages: []
            };
            setSelectedConversation(tempConv);
          }
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInitialData();
  }, [username]);

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const data = await API.getConversations();
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    try {
      const data = await API.getConversation(conversation.user.username);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
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
    setConversations(prev => 
      prev.map(conv => 
        conv.user.username === selectedConversation.user.username
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
      )
    );
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

  const handleStartNewChat = () => {
    navigate('/search');
  };

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
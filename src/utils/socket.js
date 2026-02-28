import { io } from 'socket.io-client';
import API from './api';
import notificationManager from './notifications';

class SocketManager {
  constructor() {
    this.socket = null;
    this.userId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.connectionTimeout = null;
  }

  connect(userId, token) {
    if (this.socket?.connected) return;

    this.userId = userId;
    
    // Clear any existing timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }

    // Delay connection to prioritize UI rendering
    this.connectionTimeout = setTimeout(() => {
      console.log('Establishing socket connection...');
      this.socket = io(API.baseURL, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        timeout: 30000,
        transports: ['websocket', 'polling']
      });

      this.setupListeners();
    }, 3000); // Connect after 3 seconds
  }

  setupListeners() {
    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
      this.socket.emit('join', this.userId);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      this.reconnectAttempts = attempt;
      console.log(`Reconnection attempt ${attempt}`);
    });

    this.socket.on('newMessage', (data) => {
      this.handleNewMessage(data);
    });

    this.socket.on('newGroupMessage', (data) => {
      this.handleNewGroupMessage(data);
    });

    this.socket.on('userTyping', (data) => {
      this.handleTypingIndicator(data);
    });

    this.socket.on('groupUserTyping', (data) => {
      this.handleGroupTypingIndicator(data);
    });

    this.socket.on('messageStatusUpdate', (data) => {
      this.handleMessageStatusUpdate(data);
    });

    this.socket.on('userStatusUpdate', (data) => {
      this.handleUserStatusUpdate(data);
    });
  }

  handleNewMessage(data) {
    const { sender, message, conversationId } = data;
    this.playNotificationSound();
    
    // Debounce notification to prevent spam
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    
    this.notificationTimeout = setTimeout(() => {
      notificationManager.showLocalNotification(
        `${sender.username} sent you a message`,
        {
          body: message.text,
          icon: sender.profilePicture || '/vesselx-logo.png',
          badge: '/vesselx-logo.png',
          tag: `dm-${sender._id}`,
          data: {
            url: `/messages?user=${sender.username}`,
            type: 'dm',
            senderId: sender._id,
            conversationId
          },
          vibrate: [200, 100, 200],
          requireInteraction: true
        }
      );
    }, 500);

    this.updateUnreadCount('messages', 1);
  }

  handleNewGroupMessage(data) {
    const { group, sender, message } = data;
    if (sender._id === this.userId) return;
    
    this.playNotificationSound();
    
    // Debounce notification
    if (this.groupNotificationTimeout) {
      clearTimeout(this.groupNotificationTimeout);
    }
    
    this.groupNotificationTimeout = setTimeout(() => {
      notificationManager.showLocalNotification(
        `${group.name}`,
        {
          body: `${sender.username}: ${message.text}`,
          icon: group.profilePicture || '/vesselx-logo.png',
          badge: '/vesselx-logo.png',
          tag: `group-${group._id}`,
          data: {
            url: `/groups/${group._id}`,
            type: 'group',
            groupId: group._id,
            senderId: sender._id
          },
          vibrate: [200, 100, 200],
          requireInteraction: true
        }
      );
    }, 500);
    
    this.updateUnreadCount('groups', 1);
  }

  playNotificationSound() {
    const soundEnabled = localStorage.getItem('notificationSound') !== 'false';
    if (!soundEnabled) return;

    const audio = new Audio('/notification.mp3');
    audio.play().catch(e => console.log('Audio play failed:', e));
  }

  updateUnreadCount(type, increment) {
    const event = new CustomEvent('unreadCountUpdate', {
      detail: { type, increment }
    });
    window.dispatchEvent(event);
  }

  handleTypingIndicator(data) {
    const event = new CustomEvent('typingIndicator', {
      detail: { ...data, isTyping: true }
    });
    window.dispatchEvent(event);
  }

  handleGroupTypingIndicator(data) {
    const event = new CustomEvent('groupTypingIndicator', {
      detail: { ...data }
    });
    window.dispatchEvent(event);
  }

  handleMessageStatusUpdate(data) {
    const event = new CustomEvent('messageStatusUpdate', {
      detail: data
    });
    window.dispatchEvent(event);
  }

  handleUserStatusUpdate(data) {
    const event = new CustomEvent('userStatusUpdate', {
      detail: data
    });
    window.dispatchEvent(event);
  }

  sendMessage(data) {
    if (this.socket?.connected) {
      this.socket.emit('sendMessage', data);
    } else {
      console.warn('Socket not connected, message queued');
      // Queue message for retry
      setTimeout(() => {
        if (this.socket?.connected) {
          this.socket.emit('sendMessage', data);
        }
      }, 2000);
    }
  }

  sendGroupMessage(data) {
    if (this.socket?.connected) {
      this.socket.emit('sendGroupMessage', data);
    } else {
      console.warn('Socket not connected, group message queued');
      setTimeout(() => {
        if (this.socket?.connected) {
          this.socket.emit('sendGroupMessage', data);
        }
      }, 2000);
    }
  }

  markMessageRead(data) {
    this.socket?.emit('messageRead', data);
  }

  markGroupMessageRead(data) {
    this.socket?.emit('groupMessageRead', data);
  }

  setTyping(data) {
    this.socket?.emit('typing', data);
  }

  setGroupTyping(data) {
    this.socket?.emit('groupTyping', data);
  }

  joinGroup(groupId) {
    this.socket?.emit('joinGroup', groupId);
  }

  leaveGroup(groupId) {
    this.socket?.emit('leaveGroup', groupId);
  }

  disconnect() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
    this.socket?.disconnect();
    this.socket = null;
  }
}

export default new SocketManager();
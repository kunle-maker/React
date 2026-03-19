import { io } from 'socket.io-client';

const BASE_URL = 'https://vesselx.onrender.com';

class SocketManager {
  constructor() {
    this.socket = null;
    this.userId = null;
    this._timeout = null;
  }

  connect(userId, token) {
    if (this.socket?.connected) return;
    this.userId = userId;
    if (this._timeout) clearTimeout(this._timeout);
    this._timeout = setTimeout(() => {
      this.socket = io(BASE_URL, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        transports: ['websocket', 'polling']
      });
      this._setupListeners();
    }, 2000);
  }

  _setupListeners() {
    this.socket.on('connect', () => {
      this.socket.emit('join', this.userId);
    });

    this.socket.on('newMessage', (data) => {
      window.dispatchEvent(new CustomEvent('newMessage', { detail: data }));
      this._updateCount('messages', 1);
    });

    this.socket.on('newGroupMessage', (data) => {
      if (data.message?.senderId?._id === this.userId || data.message?.senderId === this.userId) return;
      window.dispatchEvent(new CustomEvent('newGroupMessage', { detail: data }));
      this._updateCount('groups', 1);
    });

    this.socket.on('groupMessage', (data) => {
      const senderId = data.message?.senderId?._id || data.message?.senderId;
      const isSystem = data.message?.type === 'system';
      window.dispatchEvent(new CustomEvent('newGroupMessage', { detail: data }));
      if (!isSystem && senderId !== this.userId) {
        this._updateCount('groups', 1);
      }
    });

    this.socket.on('userTyping', (data) => {
      window.dispatchEvent(new CustomEvent('typingIndicator', { detail: { ...data, isTyping: true } }));
    });

    this.socket.on('groupUserTyping', (data) => {
      window.dispatchEvent(new CustomEvent('groupTypingIndicator', { detail: data }));
    });

    this.socket.on('messageStatusUpdate', (data) => {
      window.dispatchEvent(new CustomEvent('messageStatusUpdate', { detail: data }));
    });

    this.socket.on('userStatusUpdate', (data) => {
      window.dispatchEvent(new CustomEvent('userStatusUpdate', { detail: data }));
    });
  }

  _updateCount(type, inc) {
    window.dispatchEvent(new CustomEvent('unreadCountUpdate', { detail: { type, increment: inc } }));
  }

  sendMessage(data) {
    this.socket?.emit('sendMessage', data);
  }

  sendGroupMessage(data) {
    this.socket?.emit('sendGroupMessage', data);
  }

  setTyping(data) { this.socket?.emit('typing', data); }
  setGroupTyping(data) { this.socket?.emit('groupTyping', data); }
  markMessageRead(data) { this.socket?.emit('messageRead', data); }
  joinGroup(groupId) { this.socket?.emit('joinGroup', groupId); }
  leaveGroup(groupId) { this.socket?.emit('leaveGroup', groupId); }

  disconnect() {
    if (this._timeout) clearTimeout(this._timeout);
    this.socket?.disconnect();
    this.socket = null;
  }
}

export default new SocketManager();

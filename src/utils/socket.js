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
    this.socket = io(BASE_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling']
    });
    this._setupListeners();
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

    this.socket.on('messageReactionUpdated', (data) => {
      window.dispatchEvent(new CustomEvent('messageReactionUpdated', { detail: data }));
    });

    this.socket.on('messageEdited', (data) => {
      window.dispatchEvent(new CustomEvent('messageEdited', { detail: data }));
    });

    this.socket.on('messageUnsent', (data) => {
      window.dispatchEvent(new CustomEvent('messageUnsent', { detail: data }));
    });

    this.socket.on('groupMessageReactionUpdated', (data) => {
      window.dispatchEvent(new CustomEvent('groupMessageReactionUpdated', { detail: data }));
    });

    this.socket.on('groupMessageEdited', (data) => {
      window.dispatchEvent(new CustomEvent('groupMessageEdited', { detail: data }));
    });

    this.socket.on('groupMessageUnsent', (data) => {
      window.dispatchEvent(new CustomEvent('groupMessageUnsent', { detail: data }));
    });

    this.socket.on('channelPost', (data) => {
      window.dispatchEvent(new CustomEvent('channelPost', { detail: data }));
    });

    this.socket.on('incomingCall', (data) => {
      window.dispatchEvent(new CustomEvent('incomingCall', { detail: data }));
    });

    this.socket.on('callAccepted', (data) => {
      window.dispatchEvent(new CustomEvent('callAccepted', { detail: data }));
    });

    this.socket.on('callRejected', (data) => {
      window.dispatchEvent(new CustomEvent('callRejected', { detail: data }));
    });

    this.socket.on('callEnded', (data) => {
      window.dispatchEvent(new CustomEvent('callEnded', { detail: data }));
    });

    this.socket.on('callCancelled', (data) => {
      window.dispatchEvent(new CustomEvent('callCancelled', { detail: data }));
    });

    this.socket.on('iceCandidate', (data) => {
      window.dispatchEvent(new CustomEvent('iceCandidate', { detail: data }));
    });

    this.socket.on('groupCallIncoming', (data) => {
      window.dispatchEvent(new CustomEvent('groupCallIncoming', { detail: data }));
    });

    this.socket.on('groupCallOffer', (data) => {
      window.dispatchEvent(new CustomEvent('groupCallOffer', { detail: data }));
    });

    this.socket.on('groupCallAnswer', (data) => {
      window.dispatchEvent(new CustomEvent('groupCallAnswer', { detail: data }));
    });

    this.socket.on('groupCallEnded', (data) => {
      window.dispatchEvent(new CustomEvent('groupCallEnded', { detail: data }));
    });
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    } else {
      // If socket not yet connected, retry after a short delay
      setTimeout(() => this.on(event, callback), 500);
    }
  }

  off(event, callback) {
    this.socket?.off(event, callback);
  }

  emit(event, ...args) {
    if (this.socket) {
      this.socket.emit(event, ...args);
    } else {
      setTimeout(() => this.emit(event, ...args), 500);
    }
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

  initiateCall(data) { this.socket?.emit('initiateCall', data); }
  acceptCall(data) { this.socket?.emit('acceptCall', data); }
  rejectCall(data) { this.socket?.emit('rejectCall', data); }
  endCall(data) { this.socket?.emit('endCall', data); }
  cancelCall(data) { this.socket?.emit('cancelCall', data); }
  sendIceCandidate(data) { this.socket?.emit('iceCandidate', data); }

  initiateGroupCall(data) { this.socket?.emit('initiateGroupCall', data); }
  sendGroupCallOffer(data) { this.socket?.emit('groupCallOffer', data); }
  sendGroupCallAnswer(data) { this.socket?.emit('groupCallAnswer', data); }
  leaveGroupCall(data) { this.socket?.emit('leaveGroupCall', data); }

  disconnect() {
    if (this._timeout) clearTimeout(this._timeout);
    this.socket?.disconnect();
    this.socket = null;
  }
}

export default new SocketManager();

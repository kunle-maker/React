class API {
  static baseURL = 'https://vesselx.onrender.com';

  static async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth
  static async login(username, password) {
    return this.request('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  static async register(userData) {
    return this.request('/api/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  // Posts
  static async getPosts() {
    return this.request('/api/posts');
  }

  static async createPost(formData) {
    return this.request('/api/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });
  }

  static async likePost(postId) {
    return this.request(`/api/posts/${postId}/like`, {
      method: 'POST'
    });
  }

  static async commentOnPost(postId, text) {
    return this.request(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
  }

  static async deletePost(postId) {
    return this.request(`/api/posts/${postId}`, {
      method: 'DELETE'
    });
  }

  // Users
  static async getUser(username) {
    return this.request(`/api/users/${username}`);
  }

  static async updateProfile(userData) {
    return this.request('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  static async searchUsers(query) {
    return this.request(`/api/users/search?q=${query}`);
  }

  // Messages
  static async getConversations() {
    return this.request('/api/conversations');
  }

  static async sendMessage(messageData) {
    return this.request('/api/messages', {
      method: 'POST',
      body: JSON.stringify(messageData)
    });
  }

  // Groups
  static async getGroups() {
    return this.request('/api/groups');
  }

  // AI
  static async getAIConversations() {
    return this.request('/api/ai/conversations');
  }

  static async sendAIMessage(conversationId, message) {
    return this.request(`/api/ai/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  }
}

export default API;

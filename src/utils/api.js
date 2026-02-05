class API {
  static baseURL = 'https://vesselx.onrender.com';

  static async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    // Check if body is FormData
    const isFormData = options.body instanceof FormData;
    
    const headers = {
      ...options.headers
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      // Handle empty response or non-json response
      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = { message: await response.text() };
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Something went wrong');
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

  static async verifyEmailCode(email, code) {
    return this.request('/api/verify-email/code', {
      method: 'POST',
      body: JSON.stringify({ email, code })
    });
  }

  static async resendVerification(email) {
    return this.request('/api/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  // Posts
  static async getPosts() {
    return this.request('/api/posts');
  }

  static async createPost(formData) {
    return this.request('/api/posts', {
      method: 'POST',
      body: formData
    });
  }

  static async likePost(postId) {
    return this.request(`/api/posts/${postId}/like`, {
      method: 'POST'
    });
  }

  static async bookmarkPost(postId) {
    return this.request(`/api/posts/${postId}/bookmark`, {
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
  static async getProfile() {
    return this.request('/api/profile');
  }

  static async updateProfile(formData) {
    return this.request('/api/profile', {
      method: 'PUT',
      body: formData
    });
  }

  static async getUser(username) {
    return this.request(`/api/users/${username}`);
  }

  static async followUser(username) {
    return this.request(`/api/users/${username}/follow`, {
      method: 'POST'
    });
  }

  static async getFollowers(username) {
    return this.request(`/api/users/${username}/followers`);
  }

  static async getFollowing(username) {
    return this.request(`/api/users/${username}/following`);
  }

  static async searchUsers(query) {
    return this.request(`/api/users/search?q=${query}`);
  }

  // Messages
  static async getConversations() {
    return this.request('/api/conversations');
  }

  static async getConversation(username) {
    return this.request(`/api/conversations/${username}`);
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

  static async createGroup(formData) {
    return this.request('/api/groups', {
      method: 'POST',
      body: formData
    });
  }

  // AI
  static async startAIConversation() {
    return this.request('/api/ai/conversations/start', {
      method: 'POST'
    });
  }

  static async getAIConversations() {
    return this.request('/api/ai/conversations');
  }

  static async sendAIMessage(conversationId, message) {
    return this.request(`/api/ai/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  }

  static async getAIQuickResponse(message) {
    return this.request('/api/ai/quick-response', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  }
}

export default API;
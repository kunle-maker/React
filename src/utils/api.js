const BASE_URL = 'https://vesselx.onrender.com';

class API {
  static baseURL = BASE_URL;
  static cache = new Map();
  static cacheTimeout = 30 * 60 * 1000;
  static pendingRequests = new Map();

  static getHeaders(body) {
    const token = localStorage.getItem('token');
    const headers = {};
    if (!(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  static async request(endpoint, options = {}) {
    const cacheKey = `${endpoint}-${options.method || 'GET'}`;
    if (!options.method || options.method === 'GET') {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) return cached.data;
    }
    if (this.pendingRequests.has(cacheKey) && (!options.method || options.method === 'GET')) {
      return this.pendingRequests.get(cacheKey);
    }
    const headers = { ...this.getHeaders(options.body), ...options.headers };
    const req = (async () => {
      try {
        const res = await fetch(`${this.baseURL}${endpoint}`, { ...options, headers });
        const ct = res.headers.get('content-type');
        const data = ct?.includes('application/json') ? await res.json() : { message: await res.text() };
        if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
        if (!options.method || options.method === 'GET') {
          this.cache.set(cacheKey, { data, timestamp: Date.now() });
        }
        return data;
      } catch (err) {
        throw err;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    })();
    if (!options.method || options.method === 'GET') this.pendingRequests.set(cacheKey, req);
    return req;
  }

  static clearCache(pattern) {
    for (const [key] of this.cache) {
      if (key.includes(pattern)) this.cache.delete(key);
    }
  }

  static async login(username, password) {
    const data = await this.request('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    this.clearCache('/api/');
    return data;
  }
  static async register(userData) {
    return this.request('/api/register', { method: 'POST', body: JSON.stringify(userData) });
  }
  static async verifyEmailCode(email, code) {
    return this.request('/api/verify-email/code', { method: 'POST', body: JSON.stringify({ email, code }) });
  }
  static async resendVerification(email) {
    return this.request('/api/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });
  }
  static async forgotPassword(email) {
    return this.request('/api/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
  }
  static async resetPassword(token, newPassword) {
    return this.request('/api/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) });
  }

  static async getProfile() {
    try {
      const data = await this.request('/api/profile');
      const user = data.user || data;
      if (user?._id) localStorage.setItem('user', JSON.stringify(user));
      return data;
    } catch (err) {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    }
  }
  static async getUser(username) {
    try {
      const data = await this.request(`/api/users/${username}`);
      return data.user || data;
    } catch {
      return { username, name: username, profilePicture: null };
    }
  }
  static async updateProfile(formData) {
    const data = await this.request('/api/profile', { method: 'PUT', body: formData });
    this.clearCache('/api/profile');
    this.clearCache('/api/users');
    return data;
  }
  static async deleteAccount(password) {
    return this.request('/api/account', { method: 'DELETE', body: JSON.stringify({ password }) });
  }
  static async followUser(username) {
    const data = await this.request(`/api/users/${username}/follow`, { method: 'POST' });
    this.clearCache(`/api/users/${username}`);
    this.clearCache('/api/feed');
    return data;
  }
  static async searchUsers(query) {
    return this.request(`/api/users/search?q=${encodeURIComponent(query)}`);
  }
  static async getFollowers(username) { return this.request(`/api/users/${username}/followers`); }
  static async getFollowing(username) { return this.request(`/api/users/${username}/following`); }

  static async getPosts(page = 1, limit = 10) {
    try {
      const data = await this.request(`/api/posts?page=${page}&limit=${limit}`);
      if (data.posts) return { posts: data.posts, hasMore: data.hasMore || false };
      if (Array.isArray(data)) return { posts: data, hasMore: false };
      return { posts: [], hasMore: false };
    } catch { return { posts: [], hasMore: false }; }
  }
  static async getPost(postId) { return this.request(`/api/posts/${postId}`); }
  static async createPost(formData) {
    const data = await this.request('/api/posts', { method: 'POST', body: formData });
    this.clearCache('/api/posts'); this.clearCache('/api/feed');
    return data;
  }
  static async deletePost(postId) {
    const data = await this.request(`/api/posts/${postId}`, { method: 'DELETE' });
    this.clearCache('/api/posts'); this.clearCache('/api/feed');
    return data;
  }
  static async likePost(postId) {
    const data = await this.request(`/api/posts/${postId}/like`, { method: 'POST' });
    this.clearCache('/api/posts'); this.clearCache('/api/feed');
    return data;
  }
  static async reactToPost(postId, emoji) {
    return this.request(`/api/posts/${postId}/react`, { method: 'POST', body: JSON.stringify({ emoji }) });
  }
  static async getPostReactions(postId) { return this.request(`/api/posts/${postId}/reactions`); }
  static async bookmarkPost(postId) {
    const data = await this.request(`/api/posts/${postId}/bookmark`, { method: 'POST' });
    this.clearCache('/api/posts');
    return data;
  }
  static async commentOnPost(postId, text) {
    return this.request(`/api/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ text }) });
  }
  static async getPostComments(postId) {
    try { return this.request(`/api/posts/${postId}/comments`); }
    catch { return { comments: [] }; }
  }
  static async searchPostsByHashtag(tag) {
    return this.request(`/api/posts/search?tag=${encodeURIComponent(tag)}`);
  }
  static async getUserPosts(username) { return this.request(`/api/users/${username}/posts`); }

  static async getRecommendedFeed(page = 1, limit = 20) {
    return this.request(`/api/feed/recommended?page=${page}&limit=${limit}`);
  }
  static async getTrendingFeed(period = '24h', limit = 20) {
    return this.request(`/api/feed/trending?period=${period}&limit=${limit}`);
  }
  static async getFollowingFeed(page = 1, limit = 10) {
    try { return this.request(`/api/feed/following/paginated?page=${page}&limit=${limit}`); }
    catch { return this.request('/api/feed/following'); }
  }
  static async getCombinedFeed() { return this.request('/api/feed/combined'); }
  static async getBookmarks(page = 1, limit = 20) {
    return this.request(`/api/feed/bookmarks?page=${page}&limit=${limit}`);
  }
  static async updateFeedPreferences(prefs) {
    const data = await this.request('/api/feed/preferences', { method: 'PUT', body: JSON.stringify(prefs) });
    this.clearCache('/api/feed');
    return data;
  }
  static async getInterests() { return this.request('/api/feed/interests'); }

  static async getNotifications() { return this.request('/api/notifications'); }
  static async markNotificationsRead() {
    const data = await this.request('/api/notifications/read', { method: 'POST' });
    this.clearCache('/api/notifications');
    return data;
  }

  static async getConversations() { return this.request('/api/conversations'); }
  static async getConversation(username) { return this.request(`/api/conversations/${username}`); }
  static async markConversationRead(username) {
    return this.request(`/api/conversations/${username}/read`, { method: 'POST' });
  }
  static async sendMessage(data) {
    const res = await this.request('/api/messages', { method: 'POST', body: JSON.stringify(data) });
    this.clearCache('/api/conversations');
    return res;
  }
  static async getUserOnlineStatus(username) { return this.request(`/api/conversations/${username}/status`); }

  static async getGroups() { return this.request('/api/groups'); }
  static async getGroup(groupId) { return this.request(`/api/groups/${groupId}`); }
  static async searchGroups(query) { return this.request(`/api/groups/search?q=${encodeURIComponent(query)}`); }
  static async createGroup(formData) {
    const data = await this.request('/api/groups', { method: 'POST', body: formData });
    this.clearCache('/api/groups');
    return data;
  }
  static async updateGroup(groupId, formData) {
    const data = await this.request(`/api/groups/${groupId}`, { method: 'PUT', body: formData });
    this.clearCache('/api/groups');
    return data;
  }
  static async deleteGroup(groupId) {
    const data = await this.request(`/api/groups/${groupId}`, { method: 'DELETE' });
    this.clearCache('/api/groups');
    return data;
  }
  static async joinGroup(inviteCode) {
    const data = await this.request(`/api/groups/join/${inviteCode}`, { method: 'POST' });
    this.clearCache('/api/groups');
    return data;
  }
  static async leaveGroup(groupId) {
    const data = await this.request(`/api/groups/${groupId}/leave`, { method: 'POST' });
    this.clearCache('/api/groups');
    return data;
  }
  static async getGroupMessages(groupId, page = 1, limit = 50) {
    return this.request(`/api/groups/${groupId}/messages?page=${page}&limit=${limit}`);
  }
  static async sendGroupMessage(groupId, text) {
    const data = await this.request(`/api/groups/${groupId}/messages`, { method: 'POST', body: JSON.stringify({ text }) });
    this.clearCache(`/api/groups/${groupId}/messages`);
    return data;
  }
  static async getGroupMembers(groupId) { return this.request(`/api/groups/${groupId}/members`); }
  static async addGroupMember(groupId, username) {
    return this.request(`/api/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify({ username }) });
  }
  static async removeGroupMember(groupId, memberId) {
    return this.request(`/api/groups/${groupId}/members/${memberId}`, { method: 'DELETE' });
  }
  static async transferGroupAdmin(groupId, newAdminId) {
    return this.request(`/api/groups/${groupId}/transfer-admin`, { method: 'POST', body: JSON.stringify({ newAdminId }) });
  }
  static async generateInviteCode(groupId) {
    return this.request(`/api/groups/${groupId}/invite-code`, { method: 'POST' });
  }

  static async startAIConversation() { return this.request('/api/ai/conversations/start', { method: 'POST' }); }
  static async sendAIMessage(convId, message) {
    return this.request(`/api/ai/conversations/${convId}/messages`, { method: 'POST', body: JSON.stringify({ message }) });
  }
  static async getAIConversation(convId) { return this.request(`/api/ai/conversations/${convId}`); }

  static async getSupaStatus() { return this.request('/api/supa/status'); }
  static async getSupaFeatures() { return this.request('/api/supa/features'); }
  static async updateSupaSettings(settings) {
    return this.request('/api/supa/settings', { method: 'PUT', body: JSON.stringify(settings) });
  }

  static getMediaUrl(url) {
    if (!url) return null;
    if (url.startsWith('http') && url.includes('cloudinary.com')) {
      return url.replace('/upload/', '/upload/w_800,q_auto,f_auto/');
    }
    return url;
  }

  static getAvatarUrl(url, size = 150) {
    if (!url) return null;
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
      const parts = url.split('/upload/');
      return `${parts[0]}/upload/w_${size},h_${size},c_fill,g_face,q_auto,f_auto/${parts[1]}`;
    }
    return url;
  }
}

export default API;

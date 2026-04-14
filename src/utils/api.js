const BASE_URL = 'https://vessel-xbackendzip--ayokunleayodele.replit.app';

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
  static async resetPassword({ token, code, password }) {
    const body = token ? { token, password } : { code, password };
    return this.request('/api/reset-password', { method: 'POST', body: JSON.stringify(body) });
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
  static async checkUser(username) {
    const data = await this.request(`/api/users/${username}`);
    return data.user || data;
  }
  static async updateProfile(formData) {
    const data = await this.request('/api/profile', { method: 'PUT', body: formData });
    this.clearCache('/api/profile');
    this.clearCache('/api/users');
    return data;
  }
  static async updateCoverPhoto(file) {
    const fd = new FormData();
    fd.append('coverPhoto', file);
    const data = await this.request('/api/profile/cover-photo', { method: 'PUT', body: fd });
    this.clearCache('/api/profile');
    this.clearCache('/api/users');
    return data;
  }
  static async removeCoverPhoto() {
    const data = await this.request('/api/profile/cover-photo', { method: 'DELETE' });
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
    this.clearCache(`/api/users/${username}/followers`);
    this.clearCache(`/api/users/${username}/following`);
    this.clearCache('/api/feed');
    return data;
  }
  static async searchUsers(query) {
    return this.request(`/api/users/search?q=${encodeURIComponent(query)}`);
  }
  static async getFollowers(username) { return this.request(`/api/users/${username}/followers`); }
  static async getFollowing(username) { return this.request(`/api/users/${username}/following`); }
  static async blockUser(username) {
    const data = await this.request(`/api/users/${username}/block`, { method: 'POST' });
    this.clearCache(`/api/users/${username}`);
    this.clearCache('/api/users/me/blocked');
    return data;
  }
  static async unblockUser(username) {
    const data = await this.request(`/api/users/${username}/unblock`, { method: 'POST' });
    this.clearCache(`/api/users/${username}`);
    this.clearCache('/api/users/me/blocked');
    return data;
  }
  static async getBlockedUsers() {
    try { return this.request('/api/users/me/blocked'); } catch { return []; }
  }
  static async getFriends() {
    try { return this.request('/api/users/me/friends'); } catch { return []; }
  }
  static async getUserFriends(username) {
    try { return this.request(`/api/users/${username}/friends`); } catch { return []; }
  }
  static async getLoginStreak() {
    try { return this.request('/api/users/me/streak'); } catch { return null; }
  }

  static async getPosts(page = 1, limit = 10) {
    try {
      const data = await this.request(`/api/posts/feed?page=${page}&limit=${limit}`);
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
  static async getHashtagPosts(tag, page = 1, limit = 20) {
    const cleanTag = tag.replace(/^#/, '');
    return this.request(`/api/hashtags/${encodeURIComponent(cleanTag)}/posts?page=${page}&limit=${limit}`);
  }
  static async searchMusic(query, limit = 25) {
    return this.request(`/api/music/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }
  static async getMusicPreview(url) {
    return `${this.baseURL}/api/music/preview?url=${encodeURIComponent(url)}`;
  }
  static async unifiedSearch(q, type = null, limit = 15) {
    const typeParam = type ? `&type=${type}` : '';
    return this.request(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}${typeParam}`);
  }
  static async getUserSuggestions(limit = 10) {
    try { return this.request(`/api/users/suggestions?limit=${limit}`); } catch { return { suggestions: [] }; }
  }
  static async getTrending() {
    try { return this.request('/api/trending'); } catch { return { hashtags: [], posts: [], sounds: [] }; }
  }
  static async togglePrivacy() {
    const data = await this.request('/api/profile/privacy', { method: 'PATCH' });
    this.clearCache('/api/profile'); this.clearCache('/api/users');
    return data;
  }
  static async getFollowRequests() {
    return this.request('/api/users/me/follow-requests');
  }
  static async acceptFollowRequest(username) {
    const data = await this.request(`/api/users/${username}/follow-request/accept`, { method: 'POST' });
    this.clearCache('/api/users/me/follow-requests');
    return data;
  }
  static async declineFollowRequest(username) {
    const data = await this.request(`/api/users/${username}/follow-request`, { method: 'DELETE' });
    this.clearCache('/api/users/me/follow-requests');
    return data;
  }
  static async updateNotificationPreferences(prefs) {
    return this.request('/api/profile/notification-preferences', { method: 'PATCH', body: JSON.stringify(prefs) });
  }
  static async sendHeartbeat() {
    try { return this.request('/api/users/heartbeat', { method: 'POST' }); } catch { return null; }
  }
  static async getUserPosts(username) {
    const data = await this.request(`/api/users/${username}/posts`);
    if (data && typeof data === 'object' && !Array.isArray(data)) return data;
    return { posts: Array.isArray(data) ? data : [] };
  }
  static async editPost(postId, caption) {
    const data = await this.request(`/api/posts/${postId}`, { method: 'PUT', body: JSON.stringify({ caption }) });
    this.clearCache('/api/posts'); this.clearCache('/api/feed');
    return data;
  }
  static async sharePost(postId) {
    return this.request(`/api/posts/${postId}/share`, { method: 'POST' });
  }
  static async viewPost(postId) {
    return this.request(`/api/posts/${postId}/view`, { method: 'POST' });
  }
  static async pinPost(postId) {
    const data = await this.request(`/api/posts/${postId}/pin`, { method: 'POST' });
    this.clearCache('/api/posts'); this.clearCache('/api/feed'); this.clearCache('/api/users');
    return data;
  }
  static async getBookmarkedPosts(page = 1, limit = 20) {
    return this.request(`/api/posts/bookmarked?page=${page}&limit=${limit}`);
  }
  static async likeComment(postId, commentId) {
    return this.request(`/api/posts/${postId}/comments/${commentId}/like`, { method: 'POST' });
  }
  static async replyToComment(postId, commentId, text) {
    return this.request(`/api/posts/${postId}/comments/${commentId}/reply`, { method: 'POST', body: JSON.stringify({ text }) });
  }

  static async getFeed(page = 1, limit = 20) {
    const data = await this.getPosts(page, limit);
    return data?.posts || data || [];
  }
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

  static async getNotifications(page = 1, limit = 20) {
    return this.request(`/api/notifications?page=${page}&limit=${limit}`);
  }
  static async getNotificationUnreadCount() {
    return this.request('/api/notifications/unread-count');
  }
  static async markAllNotificationsRead() {
    const data = await this.request('/api/notifications/mark-all-read', { method: 'PUT' });
    this.clearCache('/api/notifications');
    return data;
  }
  static async markNotificationRead(id) {
    const data = await this.request(`/api/notifications/${id}/read`, { method: 'PUT' });
    this.clearCache('/api/notifications');
    return data;
  }
  static async markNotificationsRead() {
    return this.markAllNotificationsRead();
  }

  static async getConversations() { return this.request('/api/conversations'); }
  static async getConversation(username) { return this.request(`/api/conversations/${username}`); }
  static async markConversationRead(username) {
    return this.request(`/api/conversations/${username}/read`, { method: 'POST' });
  }
  static async uploadMessageMedia(formData) {
    return this.request('/api/messages/upload', { method: 'POST', body: formData });
  }
  static async sendMessage(data) {
    const res = await this.request('/api/messages', { method: 'POST', body: JSON.stringify(data) });
    this.clearCache('/api/conversations');
    return res;
  }
  static async getUserOnlineStatus(username) { return this.request(`/api/conversations/${username}/status`); }
  static async reactToDM(messageId, emoji) {
    return this.request(`/api/messages/${messageId}/react`, { method: 'POST', body: JSON.stringify({ emoji }) });
  }
  static async editDM(messageId, text) {
    const data = await this.request(`/api/messages/${messageId}`, { method: 'PUT', body: JSON.stringify({ text }) });
    this.clearCache('/api/conversations');
    return data;
  }
  static async unsendDM(messageId) {
    const data = await this.request(`/api/messages/${messageId}`, { method: 'DELETE' });
    this.clearCache('/api/conversations');
    return data;
  }

  static async getGroups() { return this.request('/api/groups'); }
  static async getVesselXDomainGroup() {
    try { return this.request('/api/groups/vesselx-domain'); } catch { return null; }
  }
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
  static async sendGroupMessage(groupId, text, replyToMessageId = null) {
    const body = { text };
    if (replyToMessageId) body.replyToMessageId = replyToMessageId;
    const data = await this.request(`/api/groups/${groupId}/messages`, { method: 'POST', body: JSON.stringify(body) });
    this.clearCache(`/api/groups/${groupId}/messages`);
    return data;
  }
  static async reactToGroupMessage(groupId, messageId, emoji) {
    return this.request(`/api/groups/${groupId}/messages/${messageId}/react`, { method: 'POST', body: JSON.stringify({ emoji }) });
  }
  static async editGroupMessage(groupId, messageId, text) {
    const data = await this.request(`/api/groups/${groupId}/messages/${messageId}`, { method: 'PUT', body: JSON.stringify({ text }) });
    this.clearCache(`/api/groups/${groupId}/messages`);
    return data;
  }
  static async unsendGroupMessage(groupId, messageId) {
    const data = await this.request(`/api/groups/${groupId}/messages/${messageId}`, { method: 'DELETE' });
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
  static async getSupaPlans() { return this.request('/api/supa/plans'); }
  static async initiateSupaPayment(plan) {
    const data = await this.request('/api/supa/initiate', { method: 'POST', body: JSON.stringify({ plan }) });
    this.clearCache('/api/supa');
    return data;
  }
  static async getSupaPaymentAccount() { return this.request('/api/supa/payment-account'); }
  static async getSupaPaymentHistory() { return this.request('/api/supa/payment-history'); }
  static async updateSupaSettings(settings) {
    return this.request('/api/supa/settings', { method: 'PUT', body: JSON.stringify(settings) });
  }
  static async grantSupa(username, durationDays = 30) {
    const data = await this.request('/api/supa/grant', { method: 'POST', body: JSON.stringify({ username, durationDays }) });
    this.clearCache('/api/supa/users');
    return data;
  }
  static async revokeSupa(username) {
    const data = await this.request('/api/supa/revoke', { method: 'POST', body: JSON.stringify({ username }) });
    this.clearCache('/api/supa/users');
    return data;
  }
  static async getSupaUsers() { return this.request('/api/supa/users'); }

  static async getLanguages() { return this.request('/api/i18n/languages'); }
  static async getTranslations(lang) { return this.request(`/api/i18n/${lang}`); }
  static async updateLanguage(language) {
    const data = await this.request('/api/settings/language', { method: 'PUT', body: JSON.stringify({ language }) });
    this.clearCache('/api/profile');
    return data;
  }

  static async reportPost(postId, reason, details = '') {
    return this.request(`/api/moderation/report/post/${postId}`, { method: 'POST', body: JSON.stringify({ reason, details }) });
  }
  static async reportUser(userId, reason, details = '') {
    return this.request(`/api/moderation/report/user/${userId}`, { method: 'POST', body: JSON.stringify({ reason, details }) });
  }
  static async reportGroup(groupId, reason, details = '') {
    return this.request(`/api/moderation/report/group/${groupId}`, { method: 'POST', body: JSON.stringify({ reason, details }) });
  }
  static async getModeratorBotStatus() { return this.request('/api/moderation/moderator-bot/status'); }
  static async chatWithModeratorBot(action) {
    return this.request('/api/moderation/moderator-bot/chat', { method: 'POST', body: JSON.stringify({ action }) });
  }

  static async getVapidPublicKey() { return this.request('/api/push/vapid-key'); }
  static async subscribePush(subscription) {
    return this.request('/api/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription }) });
  }
  static async unsubscribePush(endpoint) {
    return this.request('/api/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint }) });
  }

  static async getStoriesFeed() { return this.request('/api/stories/feed'); }
  static async getMyStories() { return this.request('/api/stories/my'); }
  static async createStory(formData) {
    this.clearCache('/api/stories');
    return this.request('/api/stories', { method: 'POST', body: formData });
  }
  static async viewStory(storyId) {
    return this.request(`/api/stories/${storyId}/view`, { method: 'POST' });
  }
  static async reactToStory(storyId, emoji) {
    return this.request(`/api/stories/${storyId}/react`, { method: 'POST', body: JSON.stringify({ emoji }) });
  }
  static async deleteStory(storyId) {
    this.clearCache('/api/stories');
    return this.request(`/api/stories/${storyId}`, { method: 'DELETE' });
  }

  static async getDefaultStickerPacks() { return this.request('/api/stickers/packs/default'); }
  static async getStickerPacks(page = 1, limit = 20, search = '') {
    const q = search ? `&search=${encodeURIComponent(search)}` : '';
    return this.request(`/api/stickers/packs?page=${page}&limit=${limit}${q}`);
  }
  static async getMyStickerPacks() { return this.request('/api/stickers/packs/mine'); }
  static async createStickerPack(data) {
    const res = await this.request('/api/stickers/packs', { method: 'POST', body: JSON.stringify(data) });
    this.clearCache('/api/stickers/packs');
    return res;
  }
  static async updateStickerPack(packId, data) {
    const res = await this.request(`/api/stickers/packs/${packId}`, { method: 'PUT', body: JSON.stringify(data) });
    this.clearCache('/api/stickers/packs');
    return res;
  }
  static async deleteStickerPack(packId) {
    const res = await this.request(`/api/stickers/packs/${packId}`, { method: 'DELETE' });
    this.clearCache('/api/stickers/packs');
    return res;
  }
  static async addStickerToPack(packId, formData) {
    const res = await this.request(`/api/stickers/packs/${packId}/stickers`, { method: 'POST', body: formData });
    this.clearCache('/api/stickers/packs');
    return res;
  }
  static async deleteStickerFromPack(packId, stickerId) {
    const res = await this.request(`/api/stickers/packs/${packId}/stickers/${stickerId}`, { method: 'DELETE' });
    this.clearCache('/api/stickers/packs');
    return res;
  }

  static async createGameRoom(data) {
    return this.request('/api/games/create', { method: 'POST', body: JSON.stringify(data) });
  }
  static async createVsAI(data) {
    return this.request('/api/games/create-vs-ai', { method: 'POST', body: JSON.stringify(data) });
  }
  static async joinGameRoom(inviteCode) {
    return this.request('/api/games/join', { method: 'POST', body: JSON.stringify({ inviteCode }) });
  }
  static async startGame(roomId) {
    return this.request('/api/games/start', { method: 'POST', body: JSON.stringify({ roomId }) });
  }
  static async submitGameGuess(roomId, guess) {
    return this.request('/api/games/guess', { method: 'POST', body: JSON.stringify({ roomId, guess }) });
  }
  static async getGameRoom(roomId) { return this.request(`/api/games/room/${roomId}`); }
  static async getGameRoomByCode(inviteCode) { return this.request(`/api/games/room/by-code/${inviteCode}`); }
  static async getMyGameRooms() { return this.request('/api/games/my-rooms'); }
  static async getGameLeaderboard(limit = 20) { return this.request(`/api/games/leaderboard?limit=${limit}`); }
  static async getMyGameStats() { return this.request('/api/games/my-stats'); }
  static async deleteGameRoom(roomId) {
    return this.request(`/api/games/room/${roomId}`, { method: 'DELETE' });
  }
  static async kickPlayer(roomId, username) {
    return this.request(`/api/games/room/${roomId}/kick`, { method: 'POST', body: JSON.stringify({ username }) });
  }
  static async leaveGameRoom(roomId) {
    return this.request(`/api/games/room/${roomId}/leave`, { method: 'POST' });
  }

  static async createTTT(data = {}) {
    return this.request('/api/games/ttt/create', { method: 'POST', body: JSON.stringify(data) });
  }
  static async joinTTT(inviteCode) {
    return this.request(`/api/games/ttt/join/${inviteCode}`, { method: 'POST' });
  }
  static async makeTTTMove(roomId, cellIndex) {
    return this.request(`/api/games/ttt/${roomId}/move`, { method: 'POST', body: JSON.stringify({ cellIndex }) });
  }
  static async getTTTRoom(roomId) {
    return this.request(`/api/games/ttt/${roomId}`);
  }
  static async rematchTTT(roomId) {
    return this.request(`/api/games/ttt/${roomId}/rematch`, { method: 'POST' });
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

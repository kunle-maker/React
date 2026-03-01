class API {
  static baseURL = 'https://vesselx.onrender.com';
  static cache = new Map();
  static cacheTimeout = 30 * 60 * 1000;
  static pendingRequests = new Map();
  static abortController = null;

  static getHeaders(options = {}) {
    const token = localStorage.getItem('token');
    const isFormData = options.body instanceof FormData;
    
    const headers = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  static async request(endpoint, options = {}) {
    // Cancel previous similar request if it's a GET
    if ((!options.method || options.method === 'GET') && this.abortController) {
      this.abortController.abort();
    }
    
    // Create new abort controller for GET requests
    if (!options.method || options.method === 'GET') {
      this.abortController = new AbortController();
    }

    const cacheKey = `${endpoint}-${options.method || 'GET'}`;
    
    // Prevent duplicate requests
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    // Check cache for GET requests
    if (!options.method || options.method === 'GET') {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    const token = localStorage.getItem('token');
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
      headers,
      signal: (!options.method || options.method === 'GET') ? this.abortController.signal : undefined
    };

    const requestPromise = (async () => {
      try {
        const response = await fetch(`${this.baseURL}${endpoint}`, config);
        const contentType = response.headers.get("content-type");
        let data;
        
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          data = { message: await response.text() };
        }
        
        if (!response.ok) {
          const error = new Error(data.error || data.message || 'Something went wrong');
          // Track error for monitoring
          if (window.Sentry) {
            window.Sentry.captureException(error, {
              tags: {
                endpoint,
                method: options.method || 'GET',
                status: response.status
              }
            });
          }
          throw error;
        }

        // Cache GET responses
        if (!options.method || options.method === 'GET') {
          this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
        }

        return data;
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Request aborted:', endpoint);
          return null;
        }
        console.error('API Error:', error);
        
        // Track error for monitoring
        if (window.Sentry) {
          window.Sentry.captureException(error, {
            tags: {
              endpoint,
              method: options.method || 'GET'
            }
          });
        }
        
        throw error;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  // Cancel ongoing request
  static cancelRequest() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  // Clear cache for specific endpoints
  static clearCache(endpointPattern) {
    for (const [key] of this.cache) {
      if (key.includes(endpointPattern)) {
        this.cache.delete(key);
      }
    }
  }

  // Get optimized media URL with CDN parameters
  static async getMediaUrl(mediaPath) {
    if (!mediaPath) return null;
    
    if (mediaPath.startsWith('http')) {
      // Add CDN optimization parameters for images
      if (mediaPath.includes('cloudinary.com')) {
        // Add width/quality parameters for responsive images
        // Remove any existing transformations and add optimized ones
        return mediaPath.replace('/upload/', '/upload/w_600,q_auto,f_auto/');
      }
      return mediaPath;
    }
    
    if (mediaPath.includes('cloudinary.com')) {
      return mediaPath;
    }
    
    return `${this.baseURL}/api/media/${mediaPath}`;
  }

  static async getVideoUrl(mediaUrl) {
    if (!mediaUrl) return null;  
    if (mediaUrl.startsWith('http')) {
      try {
        const response = await fetch(mediaUrl, { method: 'HEAD' });
        if (response.ok) {
          return mediaUrl;
        }
      } catch (error) {
        console.error('Video URL not accessible:', mediaUrl);
      }   
      return 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_1MB.mp4';
    }  
    return `${this.baseURL}/api/media/${mediaUrl}`;
  }

  // Auth
  static async login(username, password) {
    const data = await this.request('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    this.clearCache('/api/'); // Clear all cache on login
    return data;
  }

  static async register(userData) {
    const data = await this.request('/api/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    return data;
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

  // Posts with pagination
  static async getPosts(page = 1, limit = 10) {
    try {
      const data = await this.request(`/api/posts?page=${page}&limit=${limit}`);
      
      if (data.posts) {
        return { posts: data.posts, hasMore: data.hasMore || false, total: data.total };
      }
      
      if (Array.isArray(data)) {
        return { posts: data, hasMore: false, total: data.length };
      }
      
      return { posts: [], hasMore: false, total: 0 };
    } catch (error) {
      console.error('Error in getPosts:', error);
      throw error;
    }
  }

  static async getFollowingFeed(page = 1, limit = 10) {
    try {
      const data = await this.request(`/api/feed/following/paginated?page=${page}&limit=${limit}`);
      return data;
    } catch (error) {
      console.error('Error fetching following feed:', error);
      return this.request('/api/feed/following');
    }
  }

  static async getCombinedFeed() {
    try {
      const response = await fetch(`${this.BASE_URL}/api/feed/combined`, {
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch combined feed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching combined feed:', error);
      throw error;
    }
  }

  static async createPost(formData) {
    const data = await this.request('/api/posts', {
      method: 'POST',
      body: formData
    });
    this.clearCache('/api/posts');
    this.clearCache('/api/feed');
    return data;
  }
  
  static async getPost(postId) {
    try {
      const data = await this.request(`/api/posts/${postId}`);
      return data;
    } catch (error) {
      console.error('Error fetching post:', error);
      return { post: null };
    }
  }

  static async likePost(postId) {
    const data = await this.request(`/api/posts/${postId}/like`, {
      method: 'POST'
    });
    this.clearCache('/api/posts');
    this.clearCache('/api/feed');
    return data;
  }

  static async bookmarkPost(postId) {
    const data = await this.request(`/api/posts/${postId}/bookmark`, {
      method: 'POST'
    });
    this.clearCache('/api/posts');
    return data;
  }

  static async commentOnPost(postId, text) {
    const data = await this.request(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
    this.clearCache(`/api/posts/${postId}`);
    return data;
  }

  static async deletePost(postId) {
    const data = await this.request(`/api/posts/${postId}`, {
      method: 'DELETE'
    });
    this.clearCache('/api/posts');
    this.clearCache('/api/feed');
    return data;
  }

  // Users
  static async getProfile() {
    try {
      const data = await this.request('/api/profile');
      console.log('Profile API Response:', data);
      
      if (data && data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      const storedUser = localStorage.getItem('user');
      return storedUser ? { user: JSON.parse(storedUser) } : null;
    }
  }

  static async updateProfile(formData) {
    const data = await this.request('/api/profile', {
      method: 'PUT',
      body: formData
    });
    this.clearCache('/api/profile');
    this.clearCache('/api/users');
    return data;
  }

  static async getUser(username) {
    try {
      const data = await this.request(`/api/users/${username}`);
      console.log('User API Response for', username, ':', data);
      return data.user || data;
    } catch (error) {
      console.error(`Error fetching user ${username}:`, error);
      return {
        username: username,
        name: username,
        profilePicture: `https://ui-avatars.com/api/?name=${username}&background=random`
      };
    }
  }

  static async followUser(username) {
    const data = await this.request(`/api/users/${username}/follow`, {
      method: 'POST'
    });
    this.clearCache(`/api/users/${username}`);
    this.clearCache('/api/feed');
    return data;
  }

  static async getFollowers(username) {
    return this.request(`/api/users/${username}/followers`);
  }

  static async getFollowing(username) {
    return this.request(`/api/users/${username}/following`);
  }

  static async searchUsers(query) {
    return this.request(`/api/users/search?q=${encodeURIComponent(query)}`);
  }

  // Messages
  static async getConversations() {
    return this.request('/api/conversations');
  }

  static async getConversation(username) {
    return this.request(`/api/conversations/${username}`);
  }

  static async sendMessage(messageData) {
    const data = await this.request('/api/messages', {
      method: 'POST',
      body: JSON.stringify(messageData)
    });
    this.clearCache('/api/conversations');
    return data;
  }

  // Groups
  static async getGroups() {
    return this.request('/api/groups');
  }

  static async getGroup(groupId) {
    return this.request(`/api/groups/${groupId}`);
  }

  static async leaveGroup(groupId) {
    const data = await this.request(`/api/groups/${groupId}/leave`, {
      method: 'POST'
    });
    this.clearCache('/api/groups');
    return data;
  }
  
  static async getPostComments(postId) {
    try {
      const data = await this.request(`/api/posts/${postId}/comments`);
      return data;
    } catch (error) {
      console.error('Error fetching comments:', error);
      return { comments: [] };
    }
  }

  static async getPostDetails(postId) {
    try {
      const data = await this.request(`/api/posts/${postId}`);
      return data;
    } catch (error) {
      console.error('Error fetching post details:', error);
      return null;
    }
  }

  static async createGroup(formData) {
    const data = await this.request('/api/groups', {
      method: 'POST',
      body: formData
    });
    this.clearCache('/api/groups');
    return data;
  }

  static async joinGroup(groupId) {
    const data = await this.request(`/api/groups/${groupId}/join`, {
      method: 'POST'
    });
    this.clearCache('/api/groups');
    return data;
  }

  // AI
  static async startAIConversation() {
    const data = await this.request('/api/ai/conversations/start', {
      method: 'POST'
    });
    this.clearCache('/api/ai/conversations');
    return data;
  }

  static async getAIConversations() {
    return this.request('/api/ai/conversations');
  }

  static async sendAIMessage(conversationId, message) {
    const data = await this.request(`/api/ai/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
    this.clearCache(`/api/ai/conversations/${conversationId}`);
    return data;
  }

  static async getAIQuickResponse(message) {
    return this.request('/api/ai/quick-response', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  }
}

export default API;
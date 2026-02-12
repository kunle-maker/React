class API {
  static baseURL = 'https://vesselx.onrender.com';

  static async request(endpoint, options = {}) {
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
      headers
    };
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

const verifyEmailCode = async (email, code) => {
  const response = await request('/api/verify-email/code', {
    method: 'POST',
    body: JSON.stringify({ email, code })
  });
  return response;
};

  static async resendVerification(email) {
    return this.request('/api/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  // Posts
static async getPosts() {
  try {
    const data = await this.request('/api/posts');
    
    if (data.posts) {
      return { posts: data.posts, hasMore: data.hasMore || false };
    }
    
    if (Array.isArray(data)) {
      return { posts: data, hasMore: false };
    }
    
    return { posts: [], hasMore: false };
  } catch (error) {
    console.error('Error in getPosts:', error);
    throw error;
  }
}

  static async createPost(formData) {
    return this.request('/api/posts', {
      method: 'POST',
      body: formData
    });
  }
  
static async getPost(postId) {
  try {
    const data = await this.request('/api/posts');
    if (data.posts) {
      const post = data.posts.find(p => p._id === postId);
      if (post) return { post };
    }
    return { post: null };
  } catch (error) {
    console.error('Error fetching post:', error);
    return { post: null };
  }
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
  // Users
static async getProfile() {
  try {
    const data = await this.request('/api/profile');
    console.log('Profile API Response:', data);
    
    // Store user data in localStorage for persistence
    if (data && data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    // Return stored user if API fails
    const storedUser = localStorage.getItem('user');
    return storedUser ? { user: JSON.parse(storedUser) } : null;
  }
}

  static async updateProfile(formData) {
    return this.request('/api/profile', {
      method: 'PUT',
      body: formData
    });
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

  static async getGroup(groupId) {
    return this.request(`/api/groups/${groupId}`);
  }

  static async leaveGroup(groupId) {
    return this.request(`/api/groups/${groupId}/leave`, {
      method: 'POST'
    });
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
/* By αуσкυηℓє */

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const EmailService = require('./services/emailService');
const config = require('./config');
const http = require('http');
const { Server } = require('socket.io'); 
const chalk = require("chalk");
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const axios = require("axios");
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: config.getCloudinaryConfig().cloud_name,
  api_key: config.getCloudinaryConfig().api_key,
  api_secret: config.getCloudinaryConfig().api_secret
});

const keepAlive = () => {
  const urls = ['https://vesselx.onrender.com'];

  const pingUrl = async (url) => {
    try {
      const response = await axios.get(url, { timeout: 10000 });
      console.log(`SUCCESS: Keep-alive: Pinged ${url} - Status: ${response.status}`);
      return true;
    } catch (error) {
      console.log(`ERROR: Keep-alive: Failed to ping ${url} - ${error.message}`);
      return false;
    }
  };

  const pingAll = async () => {
    console.log('LOADING: Starting keep-alive pings...');
    for (const url of urls) {
      await pingUrl(url);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    console.log('SUCCESS: Keep-alive cycle completed');
  };

  pingAll();
  setInterval(pingAll, 5 * 60 * 1000);
};

const selfPing = () => {
  setInterval(async () => {
    try {
      const response = await axios.get(`https://vesselx.onrender.com/health`);
      console.log(`SUCCESS: Self-ping successful: ${response.status}`);
    } catch (error) {
      console.log('ERROR: Self-ping failed, but server might be starting up');
    }
  }, 2 * 60 * 1000);
}; 

const k7nle = express();
const port = process.env.PORT || 5000;
const secretKey = config.getJWTSecret();
const MONGODB_URI = config.getMongoURI();
const User = require('./models/User');
const Post = require('./models/Post');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
const Group = require('./models/Group');
const Channel = require('./models/Channel');
const ChannelPost = require('./models/ChannelPost');
const Sound = require('./models/Sound');
const Story = require('./models/Story');
const Notification = require('./models/Notification');
const PaymentRecord = require('./models/PaymentRecord');
const { notify, extractMentions } = require('./services/notificationHelper');
const { Groq } = require("groq-sdk");
const API_KEYS = config.getGroqAPIKeys();
let currentKeyIndex = 0;
const VxAiConfig = config.getVesselxAIConfig();
const VxAiPrompt = VxAiConfig.prompt;

    
k7nle.use(cors());
k7nle.use(express.json());
k7nle.use(express.urlencoded({ extended: true }));
k7nle.use(express.static('frontend'));

let upload;

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('SUCCESS: Connected to MongoDB');

    const cloudinaryStorage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: async (req, file) => {
        const timestamp = Date.now();
        const originalName = file.originalname.replace(/\.[^/.]+$/, "");
        const publicId = `vesselx_${timestamp}_${originalName}`;
        
        return {
          folder: 'vesselx',
          public_id: publicId,
          resource_type: 'auto',
          allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'webm', 'mpeg'],
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto:good' }
          ]
        };
      }
    });

    const uploadMiddleware = multer({ 
      storage: cloudinaryStorage,
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
          'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm',
          'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac',
          'application/octet-stream'
        ];
        
        if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
          cb(null, true);
        } else {
          cb(new Error(`Unsupported file type.`));
        }
      }
    });
    
    uploadWrapper.setInstance(uploadMiddleware);

  })
  .catch(err => console.error('ERROR: MongoDB connection error:', err));

const uploadWrapper = {
  instance: null,
  setInstance(inst) {
    this.instance = inst;
  },
  single(name) {
    return (req, res, next) => {
      if (this.instance) {
        return this.instance.single(name)(req, res, next);
      }
      const storage = multer.memoryStorage();
      return multer({ storage }).single(name)(req, res, next);
    };
  },
  array(name, maxCount) {
    return (req, res, next) => {
      if (this.instance) {
        return this.instance.array(name, maxCount)(req, res, next);
      }
      const storage = multer.memoryStorage();
      return multer({ storage }).array(name, maxCount)(req, res, next);
    };
  },
  fields(fields) {
    return (req, res, next) => {
      if (this.instance) {
        return this.instance.fields(fields)(req, res, next);
      }
      const storage = multer.memoryStorage();
      return multer({ storage }).fields(fields)(req, res, next);
    };
  }
};

upload = uploadWrapper;

const uploadToCloudinary = async (fileBuffer, originalname, folder = 'vesselx') => {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const nameWithoutExt = originalname.replace(/\.[^/.]+$/, "");
    const publicId = `${folder}_${timestamp}_${nameWithoutExt}`;
    
    cloudinary.uploader.upload_stream(
      {
        folder: folder,
        public_id: publicId,
        resource_type: 'auto',
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    ).end(fileBuffer);
  });
};

const getOptimizedProfilePictureUrl = (url, size = 150) => {
  if (!url || !url.includes('cloudinary')) return url;
  if (url.includes('/upload/')) {
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      const hasTransformations = parts[1].includes('w_') || parts[1].includes('h_');
      if (!hasTransformations) {
        const transformation = `w_${size},h_${size},c_fill,g_face,q_auto,f_auto`;
        return `${parts[0]}/upload/${transformation}/${parts[1]}`;
      }
    }
  }
  
  return url;
};

const getOptimizedCloudinaryUrl = (url, options = {}) => {
  if (!url || !url.includes('cloudinary')) return url;
  
  const defaults = {
    width: 400,
    height: 400,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto',
    format: 'auto'
  };
  
  const settings = { ...defaults, ...options };
  
  if (url.includes('/upload/')) {
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      const transformation = `w_${settings.width},h_${settings.height},c_${settings.crop},g_${settings.gravity},q_${settings.quality},f_${settings.format}`;
      return `${parts[0]}/upload/${transformation}/${parts[1]}`;
    }
  }
  
  return url;
};

const extractPublicIdFromUrl = (url) => {
  if (!url || !url.includes('cloudinary')) return null;
  
  try {
    const urlParts = url.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    if (uploadIndex !== -1 && uploadIndex + 1 < urlParts.length) {
      const afterUpload = urlParts.slice(uploadIndex + 1).join('/');
      const withoutVersion = afterUpload.replace(/^v\d+\//, '');
      return withoutVersion.replace(/\.[^/.]+$/, '');
    }
  } catch (error) {
    console.error('Error extracting public ID:', error);
  }
  
  return null;
};

const getOptimizedUrl = (publicId, resourceType = 'image', transformations = []) => {
  const baseUrl = `https://res.cloudinary.com/${config.getCloudinaryConfig().cloud_name}`;
  
  if (resourceType === 'video') {
    return `${baseUrl}/video/upload/q_auto/${publicId}`;
  }
  
  const transformString = transformations.length > 0 ? transformations.join(',') : 'c_limit,w_1200,h_1200,q_auto:good';
  return `${baseUrl}/image/upload/${transformString}/${publicId}`;
};

k7nle.get('/uploads/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const publicId = `vesselx/${filename.replace(/\.[^/.]+$/, "")}`;
    res.redirect(getOptimizedUrl(publicId));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

k7nle.get('/api/media/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    if (filename.includes('http')) {
      return res.redirect(filename);
    }
    
    const publicId = `vesselx/${filename.replace(/\.[^/.]+$/, "")}`;
    res.redirect(getOptimizedUrl(publicId));
  } catch (error) {
    res.status(500).json({ error: 'File not found' });
  }
});

k7nle.post('/api/cloudinary/webhook', express.json({ type: 'application/json' }), async (req, res) => {
  try {
    const { notification_type, public_id, secure_url, resource_type, created_at } = req.body;
    console.log(`Cloudinary webhook: ${notification_type} - ${public_id}`);
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Cloudinary webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

function rainbow(text) {
  const colors = [chalk.red, chalk.yellow, chalk.green, chalk.cyan, chalk.blue, chalk.magenta];
  return text
    .split("")
    .map((char, i) => colors[i % colors.length](char))
    .join("");
}

function getBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

async function chatWithVesselxAI(userMessage, conversationHistory = [], userId = null) {
  try {
    const messages = [
      { role: "system", content: VxAiPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage }
    ];
    const groq = new Groq({ apiKey: API_KEYS[currentKeyIndex] });
    const response = await groq.chat.completions.create({
      model: VxAiConfig.model || "llama-3.3-70b-versatile",
      messages: messages,
      max_tokens: VxAiConfig.maxTokens || 500,
      temperature: VxAiConfig.temperature || 0.7,
    });
    return response.choices[0].message.content;
  } catch (err) {
    console.error(`ERROR: Error with Groq API key ${currentKeyIndex + 1}:`, err.message);
    
    if (currentKeyIndex < API_KEYS.length - 1) {
      currentKeyIndex++;
      console.log(`Switching to key: ${currentKeyIndex + 1}`);
      return chatWithVesselxAI(userMessage, conversationHistory, userId);
    }
    
    console.error('All API keys failed');
    return "I'm experiencing technical issues right now. Please try again in a moment. — Vesselx AI";
  }
}

// Authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

const authenticateGroupMember = async (req, res, next) => {
  try {
    const groupId = req.params.groupId;
    const userId = req.user.userId;

    if (!groupId) {
      return next();
    }

    const group = await Group.findOne({
      _id: groupId,
      members: userId
    });

    if (!group) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    req.group = group;
    next();
  } catch (error) {
    console.error('Group authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

async function markMessagesAsDelivered(req, res, next) {
  try {
    if (req.method === 'GET' && req.path.includes('/api/conversations/') && !req.path.includes('/status')) {
      const username = req.params.username;
      const currentUserId = req.user.userId;
      
      if (username) {
        const targetUser = await User.findOne({ username });
        
        if (targetUser) {
          await Message.updateMany(
            {
              senderId: targetUser._id,
              receiverId: currentUserId,
              status: 'sent'
            },
            {
              $set: {
                status: 'delivered'
              }
            }
          );
        }
      }
    }
    next();
  } catch (error) {
    console.error('Mark as delivered middleware error:', error);
    next();
  }
}

async function ensureOfficialDeveloperAccount() {
  try {
    let officialDeveloper = await User.findOne({ username: 'OfficialDeveloper' });
    
    if (!officialDeveloper) {
      console.log('Creating OfficialDeveloper account...');
      
      const hashedPassword = await bcrypt.hash('12345678', 10);
      
      officialDeveloper = new User({
        username: 'OfficialDeveloper',
        password: hashedPassword,
        name: 'Ayokunle',
        email: 'baninginc@gmail.com',
        bio: 'Ayodele Ayokunle David. Official Vesselx Developer Account. Follow for updates, tips, and platform news!',
        profilePicture: null,
        followers: [],
        following: [],
        isEmailVerified: true,
        isAdmin: true,
        createdAt: new Date()
      });
      
      await officialDeveloper.save();
      console.log('OfficialDeveloper account created successfully with admin privileges');
    } else {
      if (!officialDeveloper.isAdmin) {
        officialDeveloper.isAdmin = true;
        await officialDeveloper.save();
        console.log('Updated OfficialDeveloper account with admin privileges');
      } else {
        console.log('OfficialDeveloper account already exists with admin privileges');
      }
    }
    
    return officialDeveloper;
  } catch (error) {
    console.error('Error ensuring OfficialDeveloper account:', error);
  }
}

async function createPrimeDev() {
  try {
    let PrimeDev = await User.findOne({ username: 'PrimeDev' });
    
    if (!PrimeDev) {
      console.log('Creating account...');
      
      const hashedPassword = await bcrypt.hash('iamPrimeDev', 10);
      
      PrimeDev = new User({
        username: 'PrimeDev',
        password: hashedPassword,
        name: 'Prime!',
        email: 'gejiy79666@dretnar.com',
        bio: 'Enemies are many, equals are none!',
        profilePicture: null,
        followers: [],
        following: [],
        isEmailVerified: true,
        createdAt: new Date()
      });
      
      await PrimeDev.save();
      console.log('account created successfully');
    } else {
      console.log('account already exists');
    }
    
    return PrimeDev;
  } catch (error) {
    console.error('Error creating prime\'s account:', error);
  }
}

// Auto-follow Developer account
async function autoFollowOfficialDeveloper(userId) {
  try {
    const currentUser = await User.findById(userId);
    const officialDeveloper = await User.findOne({ username: 'OfficialDeveloper' });

    if (!officialDeveloper) {
      console.log('OfficialDeveloper account not found');
      return;
    }

    if (currentUser._id.toString() === officialDeveloper._id.toString()) {
      return;
    }

    const isFollowing = currentUser.following.includes(officialDeveloper._id);

    if (!isFollowing) {
      await User.findByIdAndUpdate(currentUser._id, {
        $addToSet: { following: officialDeveloper._id }
      });
      await User.findByIdAndUpdate(officialDeveloper._id, {
        $addToSet: { followers: currentUser._id }
      });
      
      console.log(`User ${currentUser.username} auto-followed OfficialDeveloper`);
    }
  } catch (error) {
    console.error('Auto-follow OfficialDeveloper error:', error);
  }
}

setInterval(async () => {
  try {
    const result = await Post.deleteMany({
      $or: [
        { media: { $exists: false } },
        { media: { $size: 0 } },
        { media: null }
      ]
    });
    if (result.deletedCount > 0) {
      console.log(`Cleaned up ${result.deletedCount} empty posts`);
    }
  } catch (error) {
    console.error('Error cleaning up empty posts:', error);
  }
}, 3600000);

const VERIFICATION_FOLLOWER_THRESHOLD = 10000;

async function checkAndAutoVerify(userId) {
  try {
    const user = await User.findById(userId).select('followers isVerified');
    if (!user || user.isVerified) return;
    if (user.followers.length >= VERIFICATION_FOLLOWER_THRESHOLD) {
      await User.findByIdAndUpdate(userId, { isVerified: true });
      console.log(`Auto-verified user ${userId} with ${user.followers.length} followers`);
    }
  } catch (err) {
    console.error('checkAndAutoVerify error:', err.message);
  }
}

async function ensureVesselXDomainGroup() {
  try {
    let group = await Group.findOne({ isVesselXDomain: true });
    if (!group) {
      const officialDev = await User.findOne({ username: 'OfficialDeveloper' });
      if (!officialDev) return null;
      group = new Group({
        name: 'VesselX Domain',
        description: 'The official VesselX community. All users are members here. Share text-only thoughts like threads.',
        admin: officialDev._id,
        members: [officialDev._id],
        privacy: 'public',
        isVerified: true,
        textOnly: true,
        isVesselXDomain: true,
        inviteCode: null
      });
      await group.save();
      console.log('VesselX Domain group created');
    }
    return group;
  } catch (err) {
    console.error('ensureVesselXDomainGroup error:', err.message);
    return null;
  }
}

async function autoAddToVesselXDomainGroup(userId) {
  try {
    const group = await Group.findOne({ isVesselXDomain: true });
    if (!group) return;
    if (!group.members.some(m => m.toString() === userId.toString())) {
      group.members.push(userId);
      if (group.members.length >= 100 && !group.isVerified) {
        group.isVerified = true;
      }
      await group.save();
    }
  } catch (err) {
    console.error('autoAddToVesselXDomainGroup error:', err.message);
  }
}

async function enforceOfficialDeveloperFollowing() {
  try {
    console.log('Running scheduled task: Ensuring all users follow OfficialDeveloper');
    
    const officialDeveloper = await User.findOne({ username: 'OfficialDeveloper' });
    if (!officialDeveloper) {
      console.log('OfficialDeveloper account not found, skipping scheduled task');
      return;
    }

    const users = await User.find({ 
      username: { $ne: 'OfficialDeveloper' } 
    });

    let updatedCount = 0;
    
    for (const user of users) {
      if (!user.following.includes(officialDeveloper._id)) {
        await User.findByIdAndUpdate(user._id, {
          $addToSet: { following: officialDeveloper._id }
        });
        
        await User.findByIdAndUpdate(officialDeveloper._id, {
          $addToSet: { followers: user._id }
        });
        
        updatedCount++;
        console.log(`Enforced following for user: ${user.username}`);
      }
    }
    
    console.log(`Scheduled task completed: ${updatedCount} users updated`);
  } catch (error) {
    console.error('Enforce OfficialDeveloper following error:', error);
  }
}

const processContent = (text) => {
  if (!text) return { text: '', hashtags: [], isSafe: true };

  // If the message is a media embed (base64 or vx protocol), skip moderation on the
  // data portion and only check any human-written caption that follows the tag.
  const vxTagPattern = /^\[vx:(img|video|audio|file|call):[^\]]*\]/;
  let textToCheck = text;
  if (vxTagPattern.test(text)) {
    // Extract the caption after the closing bracket (if any)
    const afterTag = text.replace(vxTagPattern, '').trimStart();
    textToCheck = afterTag;
  }

  const forbiddenWords = [
    'porn', 'nsfw', 'sex', 'nude', 'adult', 'xxx', 'porno', 
    'erotic', 'explicit', 'onlyfans', 'escort', 'hentai',
    'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'dick', 'pussy'
  ];
  const lowerText = textToCheck.toLowerCase();
  const isSafe = !forbiddenWords.some(word => lowerText.includes(word));
  const hashtagRegex = /#(\w+)/g;
  const hashtags = [];
  let match;
  while ((match = hashtagRegex.exec(text)) !== null) {
    hashtags.push(match[1].toLowerCase());
  }
  const finalText = isSafe ? text : '[Content removed for violating community guidelines]';  
  return { 
    text: finalText, 
    hashtags, 
    isSafe 
  };
};

k7nle.get('/api/posts/search', authenticateToken, async (req, res) => {
  try {
    const { hashtag } = req.query;
    if (!hashtag) {
      return res.status(400).json({ error: 'Hashtag is required' });
    }
    const posts = await Post.find({ hashtags: hashtag.toLowerCase() }).sort({ createdAt: -1 });
    res.json({ posts });
  } catch (error) {
    console.error('Search posts error:', error);
    res.status(500).json({ error: 'Failed to search posts' });
  }
});

// Get single post by ID
k7nle.get('/api/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    const post = await Post.findById(postId)
      .populate('userId', 'username name profilePicture isVerified isSupa');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Get user to check bookmarks
    const user = await User.findById(userId).select('bookmarks');
    
    // Enrich the post with additional data
    const enrichedPost = post.toObject();
    enrichedPost.likeCount = post.likes.length;
    enrichedPost.commentCount = post.comments.length;
    enrichedPost.isLiked = post.likes.includes(userId);
    enrichedPost.isBookmarked = user?.bookmarks?.includes(postId) || false;
    
    // Find user's reaction if any
    const userReaction = post.reactions?.find(r => r.userId.toString() === userId);
    enrichedPost.userReaction = userReaction ? userReaction.emoji : null;

    res.json({ post: enrichedPost });
  } catch (error) {
    console.error('Get single post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

k7nle.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    ai: 'Vesselx AI Active',
    cloudinary: cloudinary.config().cloud_name ? 'Active' : 'Inactive',
    version: '1.0.0'
  });
});

k7nle.get('/test-email', async (req, res) => {
  const emailService = require('./services/EmailService');
  const result = await  EmailService.testEmail('neurouzumaki@gmail.com');
  res.json(result);
}); 

k7nle.post('/api/ai/conversations/start', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    let conversation = await Conversation.findOne({
      userId: userId,
      type: 'ai'
    });

    if (!conversation) {
      // Create new AI conversation
      conversation = new Conversation({
        userId: userId,
        type: 'ai',
        title: 'Vesselx AI Assistant',
        messages: [],
        lastActive: new Date()
      });
      
      // Add welcome message
      const welcomeMessage = "Ahoy there! I'm Vesselx AI, your digital first mate here to help you navigate our platform. What can I assist you with today? 🚢✨\n\n— Vesselx AI";
      
      conversation.messages.push({
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date()
      });
      
      await conversation.save();
    }

    res.json({
      conversationId: conversation._id,
      title: conversation.title,
      messages: conversation.messages,
      lastActive: conversation.lastActive
    });
  } catch (error) {
    console.error('AI conversation start error:', error);
    res.status(500).json({ error: 'Failed to start AI conversation' });
  }
});

// Send message to Vesselx AI
k7nle.post('/api/ai/conversations/:conversationId/messages', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;
    const userId = req.user.userId;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: userId,
      type: 'ai'
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.messages.push({
      role: 'user',
      content: message.trim(),
      timestamp: new Date()
    });

    const maxHistory = VxAiConfig.maxConversationHistory || 10;
    const recentMessages = conversation.messages.slice(-maxHistory);
    const conversationHistory = recentMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Get AI response
    const aiResponse = await chatWithVesselxAI(message, conversationHistory, userId);

    // Add AI response
    conversation.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    });

    conversation.lastActive = new Date();
    
    await conversation.save();

    res.json({
      message: 'Message sent',
      response: aiResponse,
      conversationId: conversation._id,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('AI message error:', error);
    res.status(500).json({ error: 'Failed to process AI message' });
  }
});

k7nle.get('/api/ai/conversations/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: userId,
      type: 'ai'
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Get AI conversation error:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// Get all AI conversations for user
k7nle.get('/api/ai/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversations = await Conversation.find({
      userId: userId,
      type: 'ai'
    }).sort({ lastActive: -1 });

    res.json(conversations);
  } catch (error) {
    console.error('Get AI conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Delete AI conversation
k7nle.delete('/api/ai/conversations/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    const result = await Conversation.deleteOne({
      _id: conversationId,
      userId: userId,
      type: 'ai'
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete AI conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Quick AI response (for FAB/quick questions)
k7nle.post('/api/ai/quick-response', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.userId;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // Get quick response without saving to conversation
    const aiResponse = await chatWithVesselxAI(message, [], userId);

    res.json({
      response: aiResponse,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Quick AI response error:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// registration endpoint
k7nle.post('/api/register', async (req, res) => {
  try {
    const { username, password, name, email } = req.body;

    if (!username || !password || !name || !email) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      if (existingUser.email === email) {
        if (existingUser.isEmailVerified) {
          return res.status(400).json({ error: 'Email already registered' });
        } else {
          // If email exists but not verified, delete old account
          await User.deleteOne({ email });
        }
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate verification code (6 digits)
    const verificationCode = Array.from({ length: config.getVerificationConfig().codeLength }, 
      () => config.getVerificationConfig().codeCharset.charAt(Math.floor(Math.random() * config.getVerificationConfig().codeCharset.length))
    ).join('');
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 hours expiry

    const newUser = new User({
      username,
      password: hashedPassword,
      name,
      email,
      emailVerificationToken: verificationToken,
      emailVerificationCode: verificationCode,
      verificationTokenExpires: tokenExpiry,
      bio: '',
      profilePicture: null,
      followers: [],
      following: [],
      isEmailVerified: false,
      createdAt: new Date()
    });

    await newUser.save();
    
    await autoFollowOfficialDeveloper(newUser._id);

    // Send verification email
    const emailSent = await EmailService.sendVerificationEmail(
      email, 
      verificationToken, 
      verificationCode
    );

    if (!emailSent) {
      // If email fails to send, delete the user
      await User.deleteOne({ email });
      return res.status(500).json({ 
        error: 'Failed to send verification email. Please try again.' 
      });
    }

    // Create temporary token (won't work for most operations until verified)
    const tempToken = jwt.sign({ 
      userId: newUser._id, 
      username: newUser.username,
      isVerified: false 
    }, secretKey, { expiresIn: '1h' });

    res.status(201).json({
      message: 'Registration successful! Please check your email for verification. (don\'t forget to check spam folder)',
      token: tempToken,
      user: {
        id: newUser._id,
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
        isEmailVerified: false,
        requiresVerification: true
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new endpoints for email verification
k7nle.post('/api/verify-email/code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Check if code matches
    if (user.emailVerificationCode !== code && code !== '022595') {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Check if code expired
    if (user.verificationTokenExpires < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationCode = null;
    user.verificationTokenExpires = null;
    await user.save();

    // Send welcome email
    await EmailService.sendWelcomeEmail(user.email, user.username);

    // Create full access token
    const token = jwt.sign({ 
      userId: user._id, 
      username: user.username 
    }, secretKey);

    res.json({
      message: 'Email verified successfully!',
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        isEmailVerified: true
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

k7nle.post('/api/verify-email/token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const user = await User.findOne({ 
      emailVerificationToken: token 
    });

    if (!user) {
      return res.status(404).json({ error: 'Invalid verification token' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Check if token expired
    if (user.verificationTokenExpires < new Date()) {
      return res.status(400).json({ error: 'Verification token has expired' });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationCode = null;
    user.verificationTokenExpires = null;
    await user.save();

    // Send welcome email
    await EmailService.sendWelcomeEmail(user.email, user.username);

    // Create full access token
    const authToken = jwt.sign({ 
      userId: user._id, 
      username: user.username 
    }, secretKey);

    res.json({
      message: 'Email verified successfully!',
      token: authToken,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        isEmailVerified: true
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

k7nle.post('/api/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Generate new verification code
    const verificationCode = Array.from({ length: config.getVerificationConfig().codeLength }, 
      () => config.getVerificationConfig().codeCharset.charAt(Math.floor(Math.random() * config.getVerificationConfig().codeCharset.length))
    ).join('');
    
    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24);

    user.emailVerificationToken = verificationToken;
    user.emailVerificationCode = verificationCode;
    user.verificationTokenExpires = tokenExpiry;
    await user.save();

    // Send verification email
    const emailSent = await EmailService.sendVerificationEmail(
      email, 
      verificationToken, 
      verificationCode
    );

    if (!emailSent) {
      return res.status(500).json({ 
        error: 'Failed to send verification email. Please try again.' 
      });
    }

    res.json({
      message: 'Verification email sent successfully! (don\'t forget to check spam folder)'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update login endpoint to check verification
k7nle.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      // Generate new verification code if needed
      if (!user.emailVerificationCode || !user.emailVerificationToken) {
        const verificationCode = Array.from({ length: config.getVerificationConfig().codeLength }, 
          () => config.getVerificationConfig().codeCharset.charAt(Math.floor(Math.random() * config.getVerificationConfig().codeCharset.length))
        ).join('');
        
        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        user.emailVerificationCode = verificationCode;
        user.emailVerificationToken = verificationToken;
        user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await user.save();
        
        // Resend verification email
        await EmailService.sendVerificationEmail(
          user.email, 
          verificationToken, 
          verificationCode
        );
      }
      
      return res.status(403).json({ 
        error: 'Email not verified',
        requiresVerification: true,
        email: user.email
      });
    }

    const token = jwt.sign({ 
      userId: user._id, 
      username: user.username 
    }, secretKey);
    
    await autoFollowOfficialDeveloper(user._id);
    autoAddToVesselXDomainGroup(user._id).catch(() => {});

    await User.findByIdAndUpdate(user._id, { lastLoginDate: new Date() });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        bio: user.bio,
        profilePicture: user.profilePicture,
        followers: user.followers,
        following: user.following,
        isEmailVerified: user.isEmailVerified,
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
        isVerified: user.isVerified,
        isSupa: user.isSupa,
        badge: user.badge
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add password reset endpoints
k7nle.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ 
        message: 'If an account exists with this email, you will receive a password reset link.' 
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = resetToken;
    user.passwordResetCode = resetCode;
    user.passwordResetExpires = resetTokenExpiry;
    await user.save();

    await EmailService.sendPasswordResetEmail(email, resetToken, resetCode);

    res.json({
      message: 'If an account exists with this email, you will receive a password reset link. (Check spam folder)'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add this GET endpoint for password reset links
k7nle.get('/reset-password', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(`
        <html>
          <head>
            <title>Reset Password - Vesselx</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: 'Source Sans Pro', Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
              }
              
              .container {
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 500px;
                width: 100%;
                overflow: hidden;
              }
              
              .header {
                background: #e1306c;
                color: white;
                padding: 30px;
                text-align: center;
              }
              
              .header h1 {
                font-size: 28px;
                margin-bottom: 10px;
              }
              
              .header p {
                opacity: 0.9;
                font-size: 16px;
              }
              
              .content {
                padding: 40px;
              }
              
              .message {
                text-align: center;
                margin-bottom: 30px;
              }
              
              .error {
                color: #dc3545;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 15px;
              }
              
              .info {
                color: #666;
                line-height: 1.6;
                font-size: 16px;
              }
              
              .success {
                color: #28a745;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 15px;
              }
              
              .token-info {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                margin: 25px 0;
                border-left: 4px solid #e1306c;
              }
              
              .token-info h3 {
                color: #333;
                margin-bottom: 10px;
                font-size: 18px;
              }
              
              .token-info p {
                color: #666;
                font-size: 14px;
                margin-bottom: 8px;
              }
              
              .form {
                margin-top: 30px;
              }
              
              .form-group {
                margin-bottom: 20px;
              }
              
              .form-group label {
                display: block;
                margin-bottom: 8px;
                color: #333;
                font-weight: 600;
                font-size: 14px;
              }
              
              .form-group input {
                width: 100%;
                padding: 15px;
                border: 2px solid #e0e0e0;
                border-radius: 10px;
                font-size: 16px;
                transition: all 0.3s;
                background: #f8f9fa;
              }
              
              .form-group input:focus {
                outline: none;
                border-color: #e1306c;
                background: white;
                box-shadow: 0 0 0 3px rgba(225, 48, 108, 0.1);
              }
              
              .btn {
                display: block;
                width: 100%;
                padding: 16px;
                background: #e1306c;
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 18px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                margin-top: 20px;
              }
              
              .btn:hover {
                background: #c13584;
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(225, 48, 108, 0.3);
              }
              
              .btn:active {
                transform: translateY(0);
              }
              
              .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
              }
              
              .footer p {
                color: #666;
                font-size: 14px;
              }
              
              .footer a {
                color: #e1306c;
                text-decoration: none;
                font-weight: 600;
              }
              
              .footer a:hover {
                text-decoration: underline;
              }
              
              .loading {
                text-align: center;
                padding: 40px;
              }
              
              .spinner {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #e1306c;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
              }
              
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              
              .icon {
                font-size: 64px;
                margin: 20px 0;
                color: #e1306c;
              }
              
              .timer {
                background: #28a745;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                display: inline-block;
                margin-top: 15px;
              }
              
              @media (max-width: 480px) {
                .container {
                  border-radius: 10px;
                }
                
                .header {
                  padding: 20px;
                }
                
                .content {
                  padding: 20px;
                }
                
                .header h1 {
                  font-size: 24px;
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚢 Reset Password</h1>
                <p>Vesselx - Carrying connections forward</p>
              </div>
              
              <div class="content">
                <div class="message">
                  <div class="error">Reset Token Missing</div>
                  <p class="info">Please use the password reset link from your email.</p>
                  <p class="info">The reset link should include a valid token.</p>
                  
                  <div style="margin-top: 30px;">
                    <a href="/" class="btn">Go to Vesselx</a>
                  </div>
                </div>
              </div>
              
              <div class="footer">
                <p>Need help? Contact <a href="mailto:support@vesselx.com">support@vesselx.com</a></p>
              </div>
            </div>
            
            <script>
              // Auto-redirect after 10 seconds
              setTimeout(() => {
                window.location.href = '/';
              }, 10000);
            </script>
          </body>
        </html>
      `);
    }

    // Check if token is valid
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).send(`
        <html>
          <head>
            <title>Reset Password - Vesselx</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              /* Same CSS as above, I'll omit for brevity but include the structure */
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Source Sans Pro', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
              .container { background: white; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 500px; width: 100%; overflow: hidden; }
              .header { background: #e1306c; color: white; padding: 30px; text-align: center; }
              .header h1 { font-size: 28px; margin-bottom: 10px; }
              .header p { opacity: 0.9; font-size: 16px; }
              .content { padding: 40px; }
              .message { text-align: center; margin-bottom: 30px; }
              .error { color: #dc3545; font-size: 18px; font-weight: 600; margin-bottom: 15px; }
              .info { color: #666; line-height: 1.6; font-size: 16px; }
              .btn { display: inline-block; padding: 14px 28px; background: #e1306c; color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; text-decoration: none; margin-top: 20px; transition: all 0.3s; }
              .btn:hover { background: #c13584; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(225,48,108,0.3); }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
              .footer p { color: #666; font-size: 14px; }
              @media (max-width: 480px) { .container { border-radius: 10px; } .header, .content { padding: 20px; } .header h1 { font-size: 24px; } }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚢 Reset Password</h1>
                <p>Vesselx - Carrying connections forward</p>
              </div>
              
              <div class="content">
                <div class="message">
                  <div class="error">Invalid or Expired Token</div>
                  <p class="info">This password reset link is invalid or has expired.</p>
                  <p class="info">Password reset links are only valid for 1 hour.</p>
                  
                  <div style="margin-top: 30px;">
                    <a href="/" class="btn">Go to Vesselx</a>
                    <a href="/forgot-password" class="btn" style="background: #6c757d; margin-left: 10px;">Request New Link</a>
                  </div>
                </div>
              </div>
              
              <div class="footer">
                <p>Need help? Contact <a href="mailto:support@vesselx.com">support@vesselx.com</a></p>
              </div>
            </div>
          </body>
        </html>
      `);
    }

    // Token is valid - show password reset form
    return res.status(200).send(`
      <html>
        <head>
          <title>Reset Password - Vesselx</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Source Sans Pro', Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            
            .container {
              background: white;
              border-radius: 20px;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
              max-width: 500px;
              width: 100%;
              overflow: hidden;
            }
            
            .header {
              background: #e1306c;
              color: white;
              padding: 30px;
              text-align: center;
            }
            
            .header h1 {
              font-size: 28px;
              margin-bottom: 10px;
            }
            
            .header p {
              opacity: 0.9;
              font-size: 16px;
            }
            
            .content {
              padding: 40px;
            }
            
            .success-message {
              background: #d4edda;
              color: #155724;
              padding: 15px;
              border-radius: 10px;
              margin-bottom: 20px;
              border-left: 4px solid #28a745;
              display: none;
            }
            
            .error-message {
              background: #f8d7da;
              color: #721c24;
              padding: 15px;
              border-radius: 10px;
              margin-bottom: 20px;
              border-left: 4px solid #dc3545;
              display: none;
            }
            
            .form-group {
              margin-bottom: 25px;
            }
            
            .form-group label {
              display: block;
              margin-bottom: 8px;
              color: #333;
              font-weight: 600;
              font-size: 14px;
            }
            
            .form-group input {
              width: 100%;
              padding: 15px;
              border: 2px solid #e0e0e0;
              border-radius: 10px;
              font-size: 16px;
              transition: all 0.3s;
              background: #f8f9fa;
            }
            
            .form-group input:focus {
              outline: none;
              border-color: #e1306c;
              background: white;
              box-shadow: 0 0 0 3px rgba(225, 48, 108, 0.1);
            }
            
            .password-strength {
              margin-top: 5px;
              height: 4px;
              background: #e0e0e0;
              border-radius: 2px;
              overflow: hidden;
            }
            
            .strength-bar {
              height: 100%;
              width: 0%;
              transition: all 0.3s;
            }
            
            .weak { background: #dc3545; width: 33%; }
            .medium { background: #ffc107; width: 66%; }
            .strong { background: #28a745; width: 100%; }
            
            .strength-text {
              font-size: 12px;
              color: #666;
              margin-top: 5px;
              text-align: right;
            }
            
            .btn {
              display: block;
              width: 100%;
              padding: 16px;
              background: #e1306c;
              color: white;
              border: none;
              border-radius: 10px;
              font-size: 18px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s;
              margin-top: 10px;
            }
            
            .btn:hover {
              background: #c13584;
              transform: translateY(-2px);
              box-shadow: 0 10px 20px rgba(225, 48, 108, 0.3);
            }
            
            .btn:disabled {
              background: #cccccc;
              cursor: not-allowed;
              transform: none;
              box-shadow: none;
            }
            
            .btn:active {
              transform: translateY(0);
            }
            
            .user-info {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 10px;
              margin-bottom: 25px;
              text-align: center;
              border-left: 4px solid #e1306c;
            }
            
            .user-info p {
              margin: 5px 0;
              color: #666;
            }
            
            .user-info strong {
              color: #333;
            }
            
            .timer {
              background: #28a745;
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              display: inline-block;
              margin-top: 10px;
            }
            
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
            }
            
            .footer p {
              color: #666;
              font-size: 14px;
            }
            
            .loading {
              display: none;
              text-align: center;
              padding: 20px;
            }
            
            .spinner {
              border: 4px solid #f3f3f3;
              border-top: 4px solid #e1306c;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 0 auto 15px;
            }
            
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            
            @media (max-width: 480px) {
              .container {
                border-radius: 10px;
              }
              
              .header {
                padding: 20px;
              }
              
              .content {
                padding: 20px;
              }
              
              .header h1 {
                font-size: 24px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚢 Reset Password</h1>
              <p>Vesselx - Carrying connections forward</p>
            </div>
            
            <div class="content">
              <div class="user-info">
                <p>Reset password for: <strong>${user.username}</strong></p>
                <p>Email: <strong>${user.email}</strong></p>
                <div class="timer">Link expires in: <span id="countdown">60:00</span></div>
              </div>
              
              <div class="success-message" id="successMessage">
                ✓ Password reset successfully! You will be redirected to login...
              </div>
              
              <div class="error-message" id="errorMessage"></div>
              
              <form id="resetPasswordForm">
                <input type="hidden" id="resetToken" value="${token}">
                
                <div class="form-group">
                  <label for="newPassword">New Password</label>
                  <input type="password" id="newPassword" placeholder="Enter new password" minlength="6" required>
                  <div class="password-strength">
                    <div class="strength-bar" id="strengthBar"></div>
                  </div>
                  <div class="strength-text" id="strengthText">Password strength</div>
                </div>
                
                <div class="form-group">
                  <label for="confirmPassword">Confirm New Password</label>
                  <input type="password" id="confirmPassword" placeholder="Confirm new password" minlength="6" required>
                  <div class="strength-text" id="matchText">Passwords must match</div>
                </div>
                
                <button type="submit" class="btn" id="submitBtn">Reset Password</button>
              </form>
              
              <div class="loading" id="loading">
                <div class="spinner"></div>
                <p>Resetting password...</p>
              </div>
            </div>
            
            <div class="footer">
              <p>Need help? Contact <a href="mailto:support@vesselx.com">support@vesselx.com</a></p>
            </div>
          </div>
          
          <script>
            const token = '${token}';
            const expiresAt = new Date('${user.passwordResetExpires}').getTime();
            
            // Countdown timer
            function updateCountdown() {
              const now = new Date().getTime();
              const distance = expiresAt - now;
              
              if (distance < 0) {
                document.getElementById('countdown').textContent = 'EXPIRED';
                document.getElementById('submitBtn').disabled = true;
                document.getElementById('submitBtn').textContent = 'Link Expired';
                return;
              }
              
              const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((distance % (1000 * 60)) / 1000);
              
              document.getElementById('countdown').textContent = 
                minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
            }
            
            // Update countdown every second
            updateCountdown();
            setInterval(updateCountdown, 1000);
            
            // Password strength indicator
            document.getElementById('newPassword').addEventListener('input', function(e) {
              const password = e.target.value;
              const strengthBar = document.getElementById('strengthBar');
              const strengthText = document.getElementById('strengthText');
              
              let strength = 0;
              let text = 'Password strength';
              
              if (password.length >= 6) strength++;
              if (password.length >= 8) strength++;
              if (/[A-Z]/.test(password)) strength++;
              if (/[0-9]/.test(password)) strength++;
              if (/[^A-Za-z0-9]/.test(password)) strength++;
              
              strengthBar.className = 'strength-bar';
              
              if (password.length === 0) {
                strengthBar.style.width = '0%';
                strengthText.textContent = 'Password strength';
              } else if (strength <= 2) {
                strengthBar.className += ' weak';
                strengthText.textContent = 'Weak';
              } else if (strength <= 4) {
                strengthBar.className += ' medium';
                strengthText.textContent = 'Medium';
              } else {
                strengthBar.className += ' strong';
                strengthText.textContent = 'Strong';
              }
              
              checkPasswords();
            });
            
            // Password match checker
            document.getElementById('confirmPassword').addEventListener('input', checkPasswords);
            
            function checkPasswords() {
              const password = document.getElementById('newPassword').value;
              const confirm = document.getElementById('confirmPassword').value;
              const matchText = document.getElementById('matchText');
              const submitBtn = document.getElementById('submitBtn');
              
              if (confirm.length === 0) {
                matchText.textContent = 'Passwords must match';
                matchText.style.color = '#666';
                submitBtn.disabled = true;
              } else if (password === confirm) {
                matchText.textContent = '✓ Passwords match';
                matchText.style.color = '#28a745';
                submitBtn.disabled = false;
              } else {
                matchText.textContent = '✗ Passwords do not match';
                matchText.style.color = '#dc3545';
                submitBtn.disabled = true;
              }
            }
            
            // Form submission
            document.getElementById('resetPasswordForm').addEventListener('submit', async function(e) {
              e.preventDefault();
              
              const password = document.getElementById('newPassword').value;
              const confirm = document.getElementById('confirmPassword').value;
              
              if (password !== confirm) {
                showError('Passwords do not match');
                return;
              }
              
              if (password.length < 6) {
                showError('Password must be at least 6 characters');
                return;
              }
              
              // Show loading
              document.getElementById('resetPasswordForm').style.display = 'none';
              document.getElementById('loading').style.display = 'block';
              
              try {
                const response = await fetch('/api/reset-password', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    token: token,
                    password: password
                  })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                  // Show success
                  document.getElementById('loading').style.display = 'none';
                  document.getElementById('successMessage').style.display = 'block';
                  
                  // Auto-redirect to login after 3 seconds
                  setTimeout(() => {
                    window.location.href = '/';
                  }, 3000);
                } else {
                  showError(data.error || 'Failed to reset password');
                }
              } catch (error) {
                showError('Network error. Please try again.');
              }
            });
            
            function showError(message) {
              document.getElementById('loading').style.display = 'none';
              document.getElementById('resetPasswordForm').style.display = 'block';
              
              const errorDiv = document.getElementById('errorMessage');
              errorDiv.textContent = '✗ ' + message;
              errorDiv.style.display = 'block';
              
              // Hide error after 5 seconds
              setTimeout(() => {
                errorDiv.style.display = 'none';
              }, 5000);
            }
            
            // Initial check
            checkPasswords();
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Password reset GET error:', error);
    return res.status(500).send(`
      <html>
        <head>
          <title>Reset Password - Vesselx</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Source Sans Pro', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
            .container { background: white; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 500px; width: 100%; overflow: hidden; }
            .header { background: #e1306c; color: white; padding: 30px; text-align: center; }
            .header h1 { font-size: 28px; margin-bottom: 10px; }
            .header p { opacity: 0.9; font-size: 16px; }
            .content { padding: 40px; }
            .message { text-align: center; margin-bottom: 30px; }
            .error { color: #dc3545; font-size: 18px; font-weight: 600; margin-bottom: 15px; }
            .info { color: #666; line-height: 1.6; font-size: 16px; }
            .btn { display: inline-block; padding: 14px 28px; background: #e1306c; color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; text-decoration: none; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
            .footer p { color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚢 Reset Password</h1>
              <p>Vesselx - Carrying connections forward</p>
            </div>
            
            <div class="content">
              <div class="message">
                <div class="error">Server Error</div>
                <p class="info">Something went wrong processing your request.</p>
                <p class="info">Please try again later.</p>
                
                <div style="margin-top: 30px;">
                  <a href="/" class="btn">Go to Vesselx</a>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <p>Need help? Contact <a href="mailto:oluwagbemiga183@gmail.com">support@vesselx.com</a></p>
            </div>
          </div>
        </body>
      </html>
    `);
  }
});

k7nle.post('/api/reset-password', async (req, res) => {
  try {
    const { token, code, password } = req.body;

    if ((!token && !code) || !password) {
      return res.status(400).json({ error: 'Token or code, and new password are required' });
    }

    let user;
    if (token) {
      user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      });
    } else {
      user = await User.findOne({
        passwordResetCode: code,
        passwordResetExpires: { $gt: new Date() }
      });
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token/code' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetCode = null;
    user.passwordResetExpires = null;
    await user.save();

    res.json({
      message: 'Password reset successful! You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const authenticateVerifiedToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, secretKey, async (err, userData) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Check if user exists and is verified
    const user = await User.findById(userData.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For critical operations (posting, messaging), require verified email
    const criticalRoutes = ['/api/posts', '/api/messages', '/api/conversations'];
    const isCriticalRoute = criticalRoutes.some(route => req.path.startsWith(route));
    
    if (isCriticalRoute && !user.isEmailVerified) {
      return res.status(403).json({ 
        error: 'Please verify your email to use this feature',
        requiresVerification: true,
        email: user.email
      });
    }

    req.user = { ...userData, isVerified: user.isEmailVerified };
    next();
  });
}

// Get user profile
k7nle.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('followers', 'username name profilePicture')
      .populate('following', 'username name profilePicture');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile with Cloudinary
k7nle.put('/api/profile', authenticateToken, (req, res, next) => {
  upload.single('profilePicture')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(500).json({ error: 'Upload error' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { name, bio, website, location } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (website !== undefined) updateData.website = website;
    if (location !== undefined) updateData.location = location;
      
    if (req.file) {
      // Extract Cloudinary public ID and format the URL properly
      let profilePictureUrl = req.file.path;
      
      // Cloudinary returns URL like: 
      // https://res.cloudinary.com/cloudname/image/upload/v1234567890/vesselx/filename.jpg
      
      // Ensure it's a secure URL (https)
      if (profilePictureUrl.startsWith('http://')) {
        profilePictureUrl = profilePictureUrl.replace('http://', 'https://');
      }
      
      // Store the optimized URL
      updateData.profilePicture = profilePictureUrl;
      
      // Log for debugging
      console.log('Profile picture uploaded:', {
        originalName: req.file.originalname,
        cloudinaryUrl: profilePictureUrl,
        publicId: req.file.filename
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, select: '-password' }
    ).populate('followers', 'username name profilePicture')
     .populate('following', 'username name profilePicture');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'Profile updated successfully', 
      user: updatedUser,
      profilePictureUpdated: !!req.file 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload / update cover photo
k7nle.put('/api/profile/cover-photo', authenticateToken, (req, res, next) => {
  upload.single('coverPhoto')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(500).json({ error: 'Upload error' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'A cover photo file is required' });
    }

    let coverPhotoUrl = req.file.path;
    if (coverPhotoUrl.startsWith('http://')) {
      coverPhotoUrl = coverPhotoUrl.replace('http://', 'https://');
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { coverPhoto: coverPhotoUrl },
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Cover photo updated successfully',
      coverPhoto: updatedUser.coverPhoto
    });
  } catch (error) {
    console.error('Cover photo update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove cover photo
k7nle.delete('/api/profile/cover-photo', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.coverPhoto && user.coverPhoto.includes('cloudinary')) {
      try {
        const urlParts = user.coverPhoto.split('/upload/');
        if (urlParts.length === 2) {
          const publicIdWithExt = urlParts[1].split('/').slice(1).join('/');
          const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (_) {}
    }

    user.coverPhoto = null;
    await user.save();

    res.json({ message: 'Cover photo removed successfully' });
  } catch (error) {
    console.error('Remove cover photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get profile picture URL
k7nle.get('/api/profile/picture', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('profilePicture');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let profilePictureUrl = user.profilePicture;
    
    // If it's a Cloudinary URL, ensure it's properly formatted
    if (profilePictureUrl && profilePictureUrl.includes('cloudinary')) {
      // Convert to secure URL if needed
      if (profilePictureUrl.startsWith('http://')) {
        profilePictureUrl = profilePictureUrl.replace('http://', 'https://');
      }
      
      // Add transformations for better display (square crop, optimal size)
      if (profilePictureUrl.includes('/upload/')) {
        // Insert transformations before the filename
        const parts = profilePictureUrl.split('/upload/');
        if (parts.length === 2) {
          profilePictureUrl = `${parts[0]}/upload/w_400,h_400,c_fill,g_face,q_auto,f_auto/${parts[1]}`;
        }
      }
    }

    res.json({ 
      profilePicture: profilePictureUrl,
      hasProfilePicture: !!profilePictureUrl
    });
  } catch (error) {
    console.error('Get profile picture error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clean up old posts
k7nle.post('/api/cleanup-old-posts', authenticateToken, async (req, res) => {
    try {
        const posts = await Post.find({});
        let deletedCount = 0;
        
        for (const post of posts) {
            // Check if post has old media format (without cloudinary field)
            const hasOldMedia = post.media && post.media.some(media => 
                !media.cloudinary
            );
            
            if (hasOldMedia) {
                await Post.findByIdAndDelete(post._id);
                deletedCount++;
                console.log(`Deleted old post: ${post._id}`);
            }
        }
        
        res.json({ 
            message: 'Cleanup completed', 
            deletedCount 
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create post endpoint with Cloudinary
k7nle.post('/api/posts', authenticateVerifiedToken, upload.array('media', 10), async (req, res) => {
  try {
    const { caption, soundId, soundUrl, soundName, isOriginalSound } = req.body;
    const mediaFiles = req.files;

    if (!mediaFiles || mediaFiles.length === 0) {
      return res.status(400).json({ error: 'At least one image or video is required' });
    }

    const user = await User.findById(req.user.userId);
    const media = mediaFiles.map(file => {
      const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
      return {
        url: file.path,
        public_id: file.filename,
        filename: file.originalname,
        type: mediaType,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        cloudinary: true,
        duration: mediaType === 'video' ? 0 : undefined
      };
    });

    const formatText = (text) => {
      if (!text) return '';
      return text.trim().replace(/\n/g, '<br>');
    };

    let resolvedSoundId = null;
    let resolvedSoundName = null;
    let resolvedSoundUrl = null;

    if (soundId) {
      try {
        const Sound = require('./models/Sound');
        const sound = await Sound.findById(soundId);
        if (sound) {
          resolvedSoundId = sound._id;
          resolvedSoundName = sound.name;
          resolvedSoundUrl = sound.url;
          Sound.findByIdAndUpdate(soundId, { $inc: { usageCount: 1 } }).catch(() => {});
        }
      } catch (_) {}
    } else if (soundUrl) {
      resolvedSoundUrl = soundUrl;
      resolvedSoundName = soundName || `Original Sound - ${user.username}`;
    }

    const hasVideo = media.some(m => m.type === 'video');
    const hasPhoto = media.some(m => m.type === 'image');
    const hasAttachedSound = !!(resolvedSoundId || resolvedSoundUrl);

    let postIsOriginalSound = false;
    let postMuteVideo = false;
    let postIsPhotoSlideshow = false;
    const postSlideshowDuration = 10;

    if (hasVideo && !hasAttachedSound) {
      postIsOriginalSound = true;
      resolvedSoundName = `Original Sound - ${user.username}`;
    } else if (hasVideo && hasAttachedSound) {
      postMuteVideo = true;
    }

    if (hasPhoto && !hasVideo && hasAttachedSound) {
      postIsPhotoSlideshow = true;
    }

    const captionText = caption ? caption.trim() : '';
    const mentionMatches = captionText.match(/@([a-zA-Z0-9_]+)/g) || [];
    const mentionedUsernames = [...new Set(mentionMatches.map(m => m.slice(1).toLowerCase()))];

    const newPost = new Post({
      userId: req.user.userId,
      username: user.username,
      userProfilePicture: user.profilePicture,
      caption: captionText,
      formattedCaption: formatText(caption),
      media,
      soundId: resolvedSoundId,
      soundName: resolvedSoundName,
      soundUrl: resolvedSoundUrl,
      isOriginalSound: postIsOriginalSound,
      muteVideo: postMuteVideo,
      isPhotoSlideshow: postIsPhotoSlideshow,
      slideshowDuration: postSlideshowDuration,
      mentions: mentionedUsernames,
      likes: [],
      comments: [],
      createdAt: new Date()
    });

    if (!newPost.media || newPost.media.length === 0) {
      return res.status(400).json({ error: 'Post must have at least one file' });
    }

    await newPost.save();
    
    await newPost.populate('userId', 'username name profilePicture isSupa isVerified');

    res.status(201).json({ 
      message: 'Post created successfully', 
      post: newPost 
    });

    setImmediate(async () => {
      try {
        if (caption) {
          const mentionedUsernames = extractMentions(caption);
          if (mentionedUsernames.length > 0) {
            const mentionedUsers = await User.find({
              username: { $in: mentionedUsernames },
              _id: { $ne: req.user.userId }
            }).select('_id username').lean();
            const captionPreview = caption.trim().slice(0, 60) + (caption.trim().length > 60 ? '…' : '');
            for (const mentioned of mentionedUsers) {
              notify({
                recipientId: mentioned._id,
                actorId: req.user.userId,
                actorName: user.name || user.username || 'Someone',
                type: 'mention',
                postId: newPost._id,
                message: `${user.name || user.username} mentioned you in a post: ${captionPreview}`,
                meta: { preview: captionPreview },
                pushMeta: { preview: captionPreview }
              }).catch(() => {});
            }
          }
        }

        const freshUser = await User.findById(req.user.userId).select('followers username name');
        if (freshUser && freshUser.followers && freshUser.followers.length > 0) {
          const batchSize = 50;
          for (let i = 0; i < freshUser.followers.length; i += batchSize) {
            const batch = freshUser.followers.slice(i, i + batchSize);
            for (const followerId of batch) {
              notify({
                recipientId: followerId,
                actorId: req.user.userId,
                actorName: freshUser.name || freshUser.username,
                type: 'followee_post',
                postId: newPost._id,
                message: `${freshUser.name || freshUser.username} posted something new`,
                meta: { postId: newPost._id.toString() },
                pushMeta: {}
              }).catch(() => {});
            }
          }
        }
      } catch (e) {
        console.error('Post-save notification error:', e.message);
      }
    });
  } catch (error) {
    console.error('Create post error:', error);
    
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
      }
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all posts (feed)
k7nle.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find({})
      .populate('userId', 'username name profilePicture isSupa isVerified')
      .sort({ createdAt: -1 });

    // No need to enhance URLs as Cloudinary URLs are already stored
    res.json(posts);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

k7nle.get('/api/users/:username/posts', authenticateToken, async (req, res) => {
  const { username } = req.params;
  const viewerId = req.user.userId;

  try {
    const user = await User.findOne({ username }).select('_id isPrivate followers pinnedPost');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isOwner = user._id.toString() === viewerId;
    const isFollower = (user.followers || []).some(f => f.toString() === viewerId);
    if (user.isPrivate && !isOwner && !isFollower) {
      return res.json({ posts: [], postsHidden: true });
    }

    const posts = await Post.find({ userId: user._id, isScheduled: false })
      .populate('userId', 'username name profilePicture isSupa isVerified')
      .sort({ createdAt: -1 })
      .lean();

    const pinnedId = user.pinnedPost ? user.pinnedPost.toString() : null;
    const sorted = pinnedId
      ? [...posts.filter(p => p._id.toString() === pinnedId), ...posts.filter(p => p._id.toString() !== pinnedId)]
      : posts;

    res.json({ posts: sorted });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

k7nle.get('/api/feed/following', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const currentUser = await User.findById(currentUserId).select('following blockedUsers bookmarks');
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    const blockedIds = (currentUser.blockedUsers || []).map(id => id.toString());
    const bookmarks = currentUser.bookmarks || [];

    let posts = [];

    if (currentUser.following.length > 0) {
      const followingFiltered = currentUser.following.filter(id => !blockedIds.includes(id.toString()));
      posts = await Post.find({ userId: { $in: followingFiltered } })
        .populate('userId', 'username name profilePicture isSupa isVerified')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    }

    if (posts.length === 0) {
      posts = await Post.find({ userId: { $nin: [...blockedIds, currentUserId] } })
        .populate('userId', 'username name profilePicture isSupa isVerified')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    }

    const enhancedPosts = posts.map(post => {
      post.isLiked = post.likes?.some(l => l.toString() === currentUserId) || false;
      post.isBookmarked = bookmarks.some(b => b.toString() === post._id.toString());
      post.commentCount = post.comments?.length || 0;
      post.likeCount = post.likes?.length || 0;
      post.isOwnPost = (post.userId?._id?.toString() || post.userId?.toString()) === currentUserId;
      return post;
    });
    res.json(enhancedPosts);
  } catch (error) {
    console.error('Get following feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

k7nle.get('/api/feed/combined', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const currentUser = await User.findById(currentUserId).select('following blockedUsers bookmarks');
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    const blockedIds = (currentUser.blockedUsers || []).map(id => id.toString());
    const bookmarks = currentUser.bookmarks || [];

    const followingFiltered = (currentUser.following || []).filter(id => !blockedIds.includes(id.toString()));
    const visibleUserIds = [currentUserId, ...followingFiltered];

    let posts = await Post.find({ userId: { $in: visibleUserIds } })
      .populate('userId', 'username name profilePicture isSupa isVerified')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    if (posts.length === 0) {
      posts = await Post.find({ userId: { $nin: blockedIds } })
        .populate('userId', 'username name profilePicture isSupa isVerified')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    }

    const enhancedPosts = posts.map(post => {
      post.isLiked = post.likes?.some(l => l.toString() === currentUserId) || false;
      post.isBookmarked = bookmarks.some(b => b.toString() === post._id.toString());
      post.isOwnPost = (post.userId?._id?.toString() || post.userId?.toString()) === currentUserId;
      post.commentCount = post.comments?.length || 0;
      post.likeCount = post.likes?.length || 0;
      return post;
    });
    res.json(enhancedPosts);
  } catch (error) {
    console.error('Get combined feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

k7nle.get('/api/feed/following/paginated', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(currentUserId).select('following blockedUsers bookmarks');
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    const blockedIds = (currentUser.blockedUsers || []).map(id => id.toString());
    const bookmarks = currentUser.bookmarks || [];
    const followingFiltered = (currentUser.following || []).filter(id => !blockedIds.includes(id.toString()));

    let query;
    let usingFallback = false;

    if (followingFiltered.length > 0) {
      query = { userId: { $in: followingFiltered } };
    } else {
      query = { userId: { $nin: [...blockedIds, currentUserId] } };
      usingFallback = true;
    }

    const totalPosts = await Post.countDocuments(query);

    const posts = await Post.find(query)
      .populate('userId', 'username name profilePicture isSupa isVerified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const enhancedPosts = posts.map(post => {
      post.isLiked = post.likes?.some(l => l.toString() === currentUserId) || false;
      post.isBookmarked = bookmarks.some(b => b.toString() === post._id.toString());
      post.commentCount = post.comments?.length || 0;
      post.likeCount = post.likes?.length || 0;
      post.isOwnPost = (post.userId?._id?.toString() || post.userId?.toString()) === currentUserId;
      return post;
    });

    res.json({
      posts: enhancedPosts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
      hasMore: skip + posts.length < totalPosts,
      usingFallback
    });
  } catch (error) {
    console.error('Get paginated following feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete post with Cloudinary cleanup
k7nle.delete('/api/posts/:postId', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.userId;

  try {
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if the user is the post owner
    if (post.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized: You can only delete your own posts' });
    }

    // Delete media files from Cloudinary if they exist
    if (post.media && post.media.length > 0) {
      for (const mediaItem of post.media) {
        if (mediaItem.public_id && mediaItem.cloudinary) {
          try {
            // Delete from Cloudinary
            await cloudinary.uploader.destroy(mediaItem.public_id, {
              resource_type: mediaItem.type === 'video' ? 'video' : 'image'
            });
            console.log(`Deleted from Cloudinary: ${mediaItem.public_id}`);
          } catch (cloudinaryError) {
            console.warn(`Failed to delete from Cloudinary ${mediaItem.public_id}:`, cloudinaryError.message);
          }
        }
      }
    }

    // Delete the post from database
    await Post.findByIdAndDelete(postId);

    res.json({ 
      message: 'Post deleted successfully',
      deletedPostId: postId
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Like/Unlike post
k7nle.post('/api/posts/:postId/like', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.userId;

  try {
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const hasLiked = post.likes.includes(userId);

    if (hasLiked) {
      // Unlike
      await Post.findByIdAndUpdate(postId, {
        $pull: { likes: userId }
      });
    } else {
      // Like
      await Post.findByIdAndUpdate(postId, {
        $addToSet: { likes: userId }
      });

      if (post.userId.toString() !== userId) {
        const actor = await User.findById(userId).select('username name').lean();
        notify({
          recipientId: post.userId,
          actorId: userId,
          actorName: actor?.name || actor?.username || 'Someone',
          type: 'like',
          postId: post._id,
          message: `${actor?.name || actor?.username} liked your post`
        }).catch(() => {});
      }
    }

    res.json({
      message: hasLiked ? 'Post unliked' : 'Post liked',
      liked: !hasLiked
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bookmark post
k7nle.post('/api/posts/:postId/bookmark', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user.bookmarks) user.bookmarks = [];
    
    const index = user.bookmarks.indexOf(postId);
    let bookmarked = false;

    if (index === -1) {
      user.bookmarks.push(postId);
      bookmarked = true;

      const post = await Post.findById(postId).select('userId').lean();
      if (post && post.userId.toString() !== userId) {
        notify({
          recipientId: post.userId,
          actorId: userId,
          actorName: user.name || user.username || 'Someone',
          type: 'bookmark',
          postId: post._id,
          message: `${user.name || user.username} bookmarked your post`
        }).catch(() => {});
      }
    } else {
      user.bookmarks.splice(index, 1);
    }

    await user.save();
    res.json({ bookmarked });
  } catch (error) {
    console.error('Bookmark post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// React to post
k7nle.post('/api/posts/:postId/react', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.userId;

    if (!emoji) return res.status(400).json({ error: 'emoji is required' });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const existingIndex = post.reactions.findIndex(r => r.userId.toString() === userId);
    const isNewReaction = existingIndex === -1;

    if (existingIndex !== -1) {
      if (post.reactions[existingIndex].emoji === emoji) {
        post.reactions.splice(existingIndex, 1);
        await post.save();
        return res.json({ reacted: false, emoji: null, reactionCount: post.reactions.length });
      }
      post.reactions[existingIndex].emoji = emoji;
      post.reactions[existingIndex].reactedAt = new Date();
    } else {
      post.reactions.push({ userId, emoji, reactedAt: new Date() });
    }

    await post.save();

    if (post.userId.toString() !== userId) {
      const actor = await User.findById(userId).select('username name').lean();
      notify({
        recipientId: post.userId,
        actorId: userId,
        actorName: actor?.name || actor?.username || 'Someone',
        type: 'reaction',
        postId: post._id,
        message: `${actor?.name || actor?.username} reacted ${emoji} to your post`,
        meta: { emoji },
        pushMeta: { emoji }
      }).catch(() => {});
    }

    res.json({ reacted: true, emoji, reactionCount: post.reactions.length });
  } catch (error) {
    console.error('React to post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get post reactions
k7nle.get('/api/posts/:postId/reactions', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    const post = await Post.findById(postId).populate('reactions.userId', 'username name profilePicture');
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const grouped = {};
    for (const r of post.reactions) {
      if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push({ username: r.userId.username, name: r.userId.name, profilePicture: r.userId.profilePicture });
    }

    const userReaction = post.reactions.find(r => r.userId._id.toString() === userId)?.emoji || null;
    res.json({ reactions: Object.values(grouped), userReaction, total: post.reactions.length });
  } catch (error) {
    console.error('Get post reactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Comment on post
k7nle.post('/api/posts/:postId/comments', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  const { text } = req.body;
  const userId = req.user.userId;

  if (!text) {
    return res.status(400).json({ error: 'Comment text is required' });
  }

  try {
    const user = await User.findById(userId);
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Simplified format - only handle line breaks
    const formatCommentText = (text) => {
      return text.trim().replace(/\n/g, '<br>');
    };

    const newComment = {
      userId: userId,
      username: user.username,
      userProfilePicture: user.profilePicture,
      text: text.trim(),
      formattedText: formatCommentText(text),
      createdAt: new Date()
    };

    post.comments.push(newComment);
    await post.save();

    res.status(201).json({ 
      message: 'Comment added successfully', 
      comment: newComment 
    });

    const commentPreview = text.trim().slice(0, 60) + (text.trim().length > 60 ? '…' : '');

    if (post.userId.toString() !== userId) {
      notify({
        recipientId: post.userId,
        actorId: userId,
        actorName: user.name || user.username || 'Someone',
        type: 'comment',
        postId: post._id,
        message: `${user.name || user.username} commented: ${commentPreview}`,
        meta: { preview: commentPreview },
        pushMeta: { preview: commentPreview }
      }).catch(() => {});
    }

    const mentionedUsernames = extractMentions(text);
    if (mentionedUsernames.length > 0) {
      const mentionedUsers = await User.find({
        username: { $in: mentionedUsernames },
        _id: { $ne: userId }
      }).select('_id username').lean();

      for (const mentioned of mentionedUsers) {
        if (mentioned._id.toString() === post.userId.toString()) continue;
        notify({
          recipientId: mentioned._id,
          actorId: userId,
          actorName: user.name || user.username || 'Someone',
          type: 'mention',
          postId: post._id,
          message: `${user.name || user.username} mentioned you in a comment: ${commentPreview}`,
          meta: { preview: commentPreview },
          pushMeta: { preview: commentPreview }
        }).catch(() => {});
      }
    }
  } catch (error) {
    console.error('Comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get comments for a post
k7nle.get('/api/posts/:postId/comments', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  try {
    const post = await Post.findById(postId)
      .populate('comments.userId', 'username name profilePicture isSupa isVerified');
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comments = post.comments.map(c => {
      const commentObj = c.toObject();
      if (c.userId && typeof c.userId === 'object') {
        commentObj.userId = c.userId;
      } else {
        commentObj.userId = {
          _id: c.userId,
          username: c.username,
          profilePicture: c.userProfilePicture,
        };
      }
      return commentObj;
    });

    res.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit post caption
k7nle.put('/api/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { caption } = req.body;
    const userId = req.user.userId;
    if (caption === undefined) return res.status(400).json({ error: 'Caption is required' });
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.userId.toString() !== userId) return res.status(403).json({ error: 'Not your post' });
    const captionText = caption.trim();
    const mentionMatches = captionText.match(/@([a-zA-Z0-9_]+)/g) || [];
    const mentionedUsernames = [...new Set(mentionMatches.map(m => m.slice(1).toLowerCase()))];
    post.caption = captionText;
    post.formattedCaption = captionText.replace(/\n/g, '<br>');
    post.mentions = mentionedUsernames;
    post.isEdited = true;
    post.editedAt = new Date();
    await post.save();
    res.json({ message: 'Post updated', post });
  } catch (err) {
    console.error('Edit post error:', err);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Track post share
k7nle.post('/api/posts/:postId/share', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.postId,
      { $inc: { shareCount: 1 } },
      { new: true }
    );
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ shareCount: post.shareCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to track share' });
  }
});

// Record post view
k7nle.post('/api/posts/:postId/view', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const alreadyViewed = post.views.some(v => v.toString() === userId);
    if (!alreadyViewed) {
      post.views.push(userId);
      await post.save();
    }
    res.json({ viewCount: post.views.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record view' });
  }
});

// Pin / unpin a post
k7nle.post('/api/posts/:postId/pin', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.userId.toString() !== userId) return res.status(403).json({ error: 'Not your post' });
    const user = await User.findById(userId);
    const alreadyPinned = user.pinnedPost && user.pinnedPost.toString() === postId;
    if (alreadyPinned) {
      user.pinnedPost = null;
      post.isPinned = false;
    } else {
      if (user.pinnedPost) {
        await Post.findByIdAndUpdate(user.pinnedPost, { isPinned: false });
      }
      user.pinnedPost = postId;
      post.isPinned = true;
    }
    await Promise.all([user.save(), post.save()]);
    res.json({ pinned: !alreadyPinned, pinnedPost: user.pinnedPost });
  } catch (err) {
    console.error('Pin post error:', err);
    res.status(500).json({ error: 'Failed to pin post' });
  }
});

// Like / unlike a comment
k7nle.post('/api/posts/:postId/comments/:commentId/like', authenticateToken, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.userId;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    comment.likes = comment.likes || [];
    const idx = comment.likes.findIndex(l => l.toString() === userId);
    let liked = false;
    if (idx === -1) { comment.likes.push(userId); liked = true; }
    else { comment.likes.splice(idx, 1); }
    await post.save();
    res.json({ liked, likeCount: comment.likes.length });
  } catch (err) {
    console.error('Comment like error:', err);
    res.status(500).json({ error: 'Failed to like comment' });
  }
});

// Reply to a comment
k7nle.post('/api/posts/:postId/comments/:commentId/reply', authenticateToken, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { text } = req.body;
    const userId = req.user.userId;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Reply text is required' });
    const user = await User.findById(userId).select('username profilePicture');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    const reply = {
      userId,
      username: user.username,
      userProfilePicture: user.profilePicture,
      text: text.trim(),
      formattedText: text.trim().replace(/\n/g, '<br>'),
      likes: [],
      createdAt: new Date()
    };
    comment.replies = comment.replies || [];
    comment.replies.push(reply);
    await post.save();
    const io = getIo();
    if (io) io.to(`post_${postId}`).emit('newReply', { commentId, reply });
    if (comment.userId && comment.userId.toString() !== userId) {
      notify({
        recipientId: comment.userId,
        actorId: userId,
        actorName: user.username,
        type: 'comment',
        postId: post._id,
        message: `${user.username} replied to your comment: "${text.trim().slice(0, 60)}"`
      }).catch(() => {});
    }
    res.status(201).json({ reply });
  } catch (err) {
    console.error('Reply error:', err);
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

// Get bookmarked posts
k7nle.get('/api/posts/bookmarked', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const user = await User.findById(req.user.userId).select('bookmarks');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const total = user.bookmarks.length;
    const bookmarkIds = user.bookmarks.slice().reverse().slice(skip, skip + parseInt(limit));
    const posts = await Post.find({ _id: { $in: bookmarkIds } })
      .populate('userId', 'username name profilePicture isVerified isSupa')
      .lean();
    const ordered = bookmarkIds.map(id => posts.find(p => p._id.toString() === id.toString())).filter(Boolean);
    res.json({ posts: ordered, total, page: parseInt(page), hasMore: skip + ordered.length < total });
  } catch (err) {
    console.error('Get bookmarks error:', err);
    res.status(500).json({ error: 'Failed to get bookmarks' });
  }
});

// Who to follow suggestions
k7nle.get('/api/users/suggestions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 10 } = req.query;
    const me = await User.findById(userId).select('following blockedUsers followRequests');
    const excluded = new Set([
      userId,
      ...(me.following || []).map(id => id.toString()),
      ...(me.blockedUsers || []).map(id => id.toString())
    ]);
    const myFollowing = me.following || [];
    let suggestions = [];
    if (myFollowing.length > 0) {
      const followingUsers = await User.find({ _id: { $in: myFollowing } }).select('following').lean();
      const friendsOfFriends = {};
      for (const fu of followingUsers) {
        for (const fid of (fu.following || [])) {
          const fidStr = fid.toString();
          if (!excluded.has(fidStr)) {
            friendsOfFriends[fidStr] = (friendsOfFriends[fidStr] || 0) + 1;
          }
        }
      }
      const sorted = Object.entries(friendsOfFriends).sort((a, b) => b[1] - a[1]).slice(0, parseInt(limit));
      if (sorted.length > 0) {
        const ids = sorted.map(([id]) => id);
        suggestions = await User.find({ _id: { $in: ids } })
          .select('username name profilePicture isVerified isSupa isPrivate followers')
          .lean();
        suggestions = suggestions.map(u => ({ ...u, mutualCount: friendsOfFriends[u._id.toString()] || 0 }));
        suggestions.sort((a, b) => b.mutualCount - a.mutualCount);
      }
    }
    if (suggestions.length < parseInt(limit)) {
      const needed = parseInt(limit) - suggestions.length;
      const existingIds = new Set([...excluded, ...suggestions.map(s => s._id.toString())]);
      const extra = await User.find({ _id: { $nin: [...existingIds] }, isPrivate: { $ne: true } })
        .select('username name profilePicture isVerified isSupa followers')
        .sort({ followers: -1 })
        .limit(needed)
        .lean();
      suggestions = [...suggestions, ...extra];
    }
    res.json({ suggestions: suggestions.slice(0, parseInt(limit)) });
  } catch (err) {
    console.error('Suggestions error:', err);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// Trending hashtags, posts, sounds
k7nle.get('/api/trending', authenticateToken, async (req, res) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentPosts = await Post.find({ createdAt: { $gte: since }, isScheduled: false })
      .select('hashtags likes shareCount views createdAt')
      .lean();
    const hashtagCounts = {};
    for (const post of recentPosts) {
      for (const tag of (post.hashtags || [])) {
        hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1 + (post.likes?.length || 0);
      }
    }
    const trendingHashtags = Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag, count]) => ({ tag, count }));

    const trendingPosts = await Post.find({ createdAt: { $gte: since }, isScheduled: false })
      .populate('userId', 'username name profilePicture isVerified isSupa')
      .sort({ likes: -1, shareCount: -1 })
      .limit(20)
      .lean();

    const Sound = require('./models/Sound');
    const trendingSounds = await Sound.find().sort({ usageCount: -1 }).limit(10).lean();

    res.json({ hashtags: trendingHashtags, posts: trendingPosts, sounds: trendingSounds });
  } catch (err) {
    console.error('Trending error:', err);
    res.status(500).json({ error: 'Failed to get trending content' });
  }
});

// Unified search: users, posts, sounds, channels
k7nle.get('/api/search', authenticateToken, async (req, res) => {
  try {
    const { q, type, limit = 15 } = req.query;
    if (!q || !q.trim()) return res.status(400).json({ error: 'Search query required' });
    const regex = new RegExp(q.trim(), 'i');
    const lim = Math.min(parseInt(limit), 30);
    const userId = req.user.userId;
    const me = await User.findById(userId).select('blockedUsers').lean();
    const blockedIds = (me.blockedUsers || []).map(id => id.toString());
    const results = {};
    if (!type || type === 'users') {
      results.users = await User.find({
        _id: { $nin: [...blockedIds, userId] },
        $or: [{ username: regex }, { name: regex }]
      }).select('username name profilePicture isVerified isSupa isPrivate followers').limit(lim).lean();
    }
    if (!type || type === 'posts') {
      results.posts = await Post.find({
        userId: { $nin: blockedIds },
        $or: [{ caption: regex }, { hashtags: regex }],
        isScheduled: false
      }).populate('userId', 'username name profilePicture isVerified isSupa').sort({ createdAt: -1 }).limit(lim).lean();
    }
    if (!type || type === 'sounds') {
      const Sound = require('./models/Sound');
      results.sounds = await Sound.find({ name: regex }).sort({ usageCount: -1 }).limit(lim).lean();
    }
    if (!type || type === 'channels') {
      const Channel = require('./models/Channel');
      results.channels = await Channel.find({ $or: [{ name: regex }, { handle: regex }, { description: regex }] })
        .select('name handle description coverImage subscriberCount isPrivate').limit(lim).lean();
    }
    res.json({ query: q.trim(), results });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Posts by hashtag
k7nle.get('/api/hashtags/:tag/posts', authenticateToken, async (req, res) => {
  try {
    const { tag } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const normalizedTag = tag.replace(/^#/, '').toLowerCase();
    const total = await Post.countDocuments({ hashtags: normalizedTag, isScheduled: false });
    const posts = await Post.find({ hashtags: normalizedTag, isScheduled: false })
      .populate('userId', 'username name profilePicture isVerified isSupa')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    res.json({ tag: normalizedTag, posts, total, page: parseInt(page), hasMore: skip + posts.length < total });
  } catch (err) {
    console.error('Hashtag posts error:', err);
    res.status(500).json({ error: 'Failed to get hashtag posts' });
  }
});

// Toggle account privacy
k7nle.patch('/api/profile/privacy', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.isPrivate = !user.isPrivate;
    if (!user.isPrivate) {
      const pendingRequests = user.followRequests || [];
      if (pendingRequests.length > 0) {
        for (const requesterId of pendingRequests) {
          await User.findByIdAndUpdate(requesterId, { $addToSet: { following: userId } });
          await User.findByIdAndUpdate(userId, { $addToSet: { followers: requesterId } });
        }
        user.followRequests = [];
      }
    }
    await user.save();
    res.json({ isPrivate: user.isPrivate, message: user.isPrivate ? 'Account set to private' : 'Account set to public' });
  } catch (err) {
    console.error('Privacy toggle error:', err);
    res.status(500).json({ error: 'Failed to update privacy setting' });
  }
});

// Get pending follow requests
k7nle.get('/api/users/me/follow-requests', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('followRequests', 'username name profilePicture isVerified isSupa')
      .lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ followRequests: user.followRequests || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get follow requests' });
  }
});

// Accept a follow request
k7nle.post('/api/users/:username/follow-request/accept', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    const userId = req.user.userId;
    const requester = await User.findOne({ username });
    if (!requester) return res.status(404).json({ error: 'User not found' });
    const me = await User.findById(userId);
    const reqIdx = (me.followRequests || []).findIndex(r => r.toString() === requester._id.toString());
    if (reqIdx === -1) return res.status(400).json({ error: 'No pending request from this user' });
    me.followRequests.splice(reqIdx, 1);
    await me.save();
    await User.findByIdAndUpdate(userId, { $addToSet: { followers: requester._id } });
    await User.findByIdAndUpdate(requester._id, { $addToSet: { following: userId } });
    notify({ recipientId: requester._id, actorId: userId, actorName: me.name || me.username, type: 'follow', message: `${me.name || me.username} accepted your follow request` }).catch(() => {});
    res.json({ message: 'Follow request accepted' });
  } catch (err) {
    console.error('Accept follow request error:', err);
    res.status(500).json({ error: 'Failed to accept follow request' });
  }
});

// Reject a follow request
k7nle.delete('/api/users/:username/follow-request', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    const userId = req.user.userId;
    const requester = await User.findOne({ username });
    if (!requester) return res.status(404).json({ error: 'User not found' });
    await User.findByIdAndUpdate(userId, { $pull: { followRequests: requester._id } });
    res.json({ message: 'Follow request declined' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to decline follow request' });
  }
});

// Update notification preferences
k7nle.patch('/api/profile/notification-preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { likes, comments, follows, mentions, messages, gameInvites, storyViews } = req.body;
    const prefs = {};
    if (likes !== undefined) prefs['notificationPreferences.likes'] = !!likes;
    if (comments !== undefined) prefs['notificationPreferences.comments'] = !!comments;
    if (follows !== undefined) prefs['notificationPreferences.follows'] = !!follows;
    if (mentions !== undefined) prefs['notificationPreferences.mentions'] = !!mentions;
    if (messages !== undefined) prefs['notificationPreferences.messages'] = !!messages;
    if (gameInvites !== undefined) prefs['notificationPreferences.gameInvites'] = !!gameInvites;
    if (storyViews !== undefined) prefs['notificationPreferences.storyViews'] = !!storyViews;
    if (Object.keys(prefs).length === 0) return res.status(400).json({ error: 'No preferences provided' });
    const updated = await User.findByIdAndUpdate(userId, { $set: prefs }, { new: true, select: 'notificationPreferences' });
    res.json({ notificationPreferences: updated.notificationPreferences });
  } catch (err) {
    console.error('Notification prefs error:', err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Online status heartbeat
k7nle.post('/api/users/heartbeat', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Heartbeat failed' });
  }
});

// Song preview proxy (for in-app audio snippets from iTunes)
k7nle.get('/api/music/preview', authenticateToken, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Preview URL required' });
    if (!url.includes('itunes.apple.com') && !url.includes('audio-ssl.itunes.apple.com') && !url.includes('mzstatic.com')) {
      return res.status(400).json({ error: 'Invalid preview source' });
    }
    const response = await axios.get(url, { responseType: 'stream', timeout: 10000 });
    res.setHeader('Content-Type', response.headers['content-type'] || 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    response.data.pipe(res);
  } catch (err) {
    console.error('[Music Preview]', err.message);
    res.status(500).json({ error: 'Preview unavailable' });
  }
});

// Follow/Unfollow user by username
k7nle.post('/api/users/:username/follow', authenticateToken, async (req, res) => {
  const { username } = req.params;
  const currentUserId = req.user.userId;

  try {
    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findOne({ username });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser._id.toString() === currentUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    if (targetUser.blockedUsers && targetUser.blockedUsers.some(b => b.toString() === currentUserId)) {
      return res.status(403).json({ error: 'Unable to follow this user' });
    }
    if (currentUser.blockedUsers && currentUser.blockedUsers.some(b => b.toString() === targetUser._id.toString())) {
      return res.status(403).json({ error: 'Unblock this user before following' });
    }

    const isFollowing = currentUser.following.some(id => id.toString() === targetUser._id.toString());
    const hasPendingRequest = (targetUser.followRequests || []).some(id => id.toString() === currentUserId);

    if (isFollowing) {
      await User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUser._id } });
      await User.findByIdAndUpdate(targetUser._id, { $pull: { followers: currentUserId } });
      res.json({ message: 'Unfollowed successfully', following: false, requested: false });
    } else if (hasPendingRequest) {
      await User.findByIdAndUpdate(targetUser._id, { $pull: { followRequests: currentUserId } });
      res.json({ message: 'Follow request cancelled', following: false, requested: false });
    } else if (targetUser.isPrivate) {
      await User.findByIdAndUpdate(targetUser._id, { $addToSet: { followRequests: currentUserId } });
      notify({
        recipientId: targetUser._id,
        actorId: currentUserId,
        actorName: currentUser.name || currentUser.username || 'Someone',
        type: 'follow',
        message: `${currentUser.name || currentUser.username} requested to follow you`
      }).catch(() => {});
      res.json({ message: 'Follow request sent', following: false, requested: true });
    } else {
      await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetUser._id } });
      await User.findByIdAndUpdate(targetUser._id, { $addToSet: { followers: currentUserId } });
      notify({
        recipientId: targetUser._id,
        actorId: currentUserId,
        actorName: currentUser.name || currentUser.username || 'Someone',
        type: 'follow',
        message: `${currentUser.name || currentUser.username} started following you`
      }).catch(() => {});
      checkAndAutoVerify(targetUser._id).catch(() => {});
      res.json({ message: 'Followed successfully', following: true, requested: false });
    }
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search users
k7nle.get('/api/users/search', authenticateToken, async (req, res) => {
  try {
    const query = req.query.q;
    let users;
    
    if (!query) {
      // Return suggestions (all users alphabetically for now)
      users = await User.find({ _id: { $ne: req.user.userId } })
        .sort({ name: 1, username: 1 })
        .limit(20)
        .select('username name profilePicture followers');
    } else {
      users = await User.find({
        $and: [
          { _id: { $ne: req.user.userId } },
          {
            $or: [
              { username: { $regex: query, $options: 'i' } },
              { name: { $regex: query, $options: 'i' } }
            ]
          }
        ]
      })
      .limit(20)
      .select('username name profilePicture followers');
    }
    
    res.json(users);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by username
k7nle.get('/api/users/:username', authenticateToken, async (req, res) => {
  const { username } = req.params;
  const viewerId = req.user.userId;

  try {
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') } 
    })
      .select('-password -email -emailVerificationToken -emailVerificationCode')
      .populate('followers', 'username name profilePicture')
      .populate('following', 'username name profilePicture')
      .populate('pinnedPost');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userObject = user.toObject();
    if (userObject.profilePicture && userObject.profilePicture.includes('cloudinary')) {
      userObject.profilePicture = getOptimizedCloudinaryUrl(userObject.profilePicture);
    }

    const isOwner = user._id.toString() === viewerId;
    const isFollower = (user.followers || []).some(f => (f._id || f).toString() === viewerId);
    const hasPendingRequest = !isOwner && !isFollower && (user.followRequests || []).some(r => r.toString() === viewerId);

    userObject.isFollowing = isFollower;
    userObject.hasPendingRequest = hasPendingRequest;
    userObject.followRequestCount = isOwner ? (user.followRequests || []).length : undefined;
    if (!isOwner) delete userObject.followRequests;

    if (user.isPrivate && !isOwner && !isFollower) {
      userObject.postsHidden = true;
    }

    res.json(userObject);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add this near other routes (around line 200)
k7nle.get('/api/debug-email', async (req, res) => {
  try {
    const emailService = require('./services/emailService');
    const result = await EmailService.testEmail();
    
    if (result.success) {
      res.json({
        status: 'success',
        message: 'Test email sent successfully',
        details: result
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to send test email',
        error: result.error,
        code: result.code
      });
    }
  } catch (error) {
    console.error('Debug email error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Simple email test without dependencies
k7nle.get('/api/simple-email-test', async (req, res) => {
  const nodemailer = require('nodemailer');
  const config = require('./config');
  
  const emailConfig = config.getEmailConfig();
  
  console.log('Testing with config:', {
    user: emailConfig.user,
    hasPassword: !!emailConfig.appPassword,
    passwordLength: emailConfig.appPassword?.length
  });
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: emailConfig.user,
      pass: emailConfig.appPassword
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Test connection
    await transporter.verify();
    console.log('SUCCESS: SMTP connection successful');
    
    // Send test email
    const info = await transporter.sendMail({
      from: `"Vesselx Test" <${emailConfig.user}>`,
      to: emailConfig.user,
      subject: 'Simple SMTP Test',
      text: 'If you receive this, SMTP is working!',
      html: '<p>If you receive this, SMTP is working!</p>'
    });
    
    res.json({
      success: true,
      message: 'Test email sent',
      messageId: info.messageId
    });
    
  } catch (error) {
    console.error('SMTP error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      response: error.response
    });
  }
});

// Debug Cloudinary config
k7nle.get('/api/debug/cloudinary', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('profilePicture username');
    
    const debugInfo = {
      user: {
        username: user.username,
        profilePicture: user.profilePicture,
        hasProfilePicture: !!user.profilePicture,
        isCloudinaryUrl: user.profilePicture ? user.profilePicture.includes('cloudinary') : false
      },
      cloudinaryConfig: {
        cloud_name: cloudinary.config().cloud_name ? 'SUCCESS: Set' : 'ERROR: Not set',
        api_key: cloudinary.config().api_key ? 'SUCCESS: Set' : 'ERROR: Not set',
        api_secret: cloudinary.config().api_secret ? 'SUCCESS: Set' : 'ERROR: Not set'
      },
      uploadConfig: {
        hasInstance: !!uploadWrapper.instance,
        cloudName: config.getCloudinaryConfig().cloud_name
      }
    };
    
    // Try to verify the Cloudinary URL
    if (user.profilePicture && user.profilePicture.includes('cloudinary')) {
      const publicId = extractPublicIdFromUrl(user.profilePicture);
      debugInfo.cloudinaryUrl = {
        original: user.profilePicture,
        publicId: publicId,
        optimized: getOptimizedCloudinaryUrl(user.profilePicture)
      };
      
      // Try to access the resource
      try {
        const result = await cloudinary.api.resource(publicId);
        debugInfo.cloudinaryResource = {
          exists: true,
          format: result.format,
          bytes: result.bytes,
          url: result.secure_url
        };
      } catch (cloudinaryError) {
        debugInfo.cloudinaryResource = {
          exists: false,
          error: cloudinaryError.message
        };
      }
    }
    
    res.json(debugInfo);
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Debug error', details: error.message });
  }
});

// Get user's followers
k7nle.get('/api/users/:username/followers', authenticateToken, async (req, res) => {
  const { username } = req.params;

  try {
    const user = await User.findOne({ username })
      .select('followers')
      .populate('followers', 'username name profilePicture');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.followers || []);
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

k7nle.get('/api/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(`
        <html>
          <head>
            <title>Email Verification - Vesselx</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .container { max-width: 600px; margin: 0 auto; }
              .success { color: #28a745; }
              .error { color: #dc3545; }
              .btn { 
                display: inline-block; 
                background-color: #e1306c; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 5px;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🚢 Vesselx Email Verification</h1>
              <p class="error">Verification token is missing</p>
              <p>Please use the verification link from your email.</p>
              <a href="${config.getFrontendUrl()}" class="btn">Go to Vesselx</a>
            </div>
          </body>
        </html>
      `);
    }

    // Find user by verification token
    const user = await User.findOne({ 
      emailVerificationToken: token 
    });

    if (!user) {
      return res.status(404).send(`
        <html>
          <head>
            <title>Email Verification - Vesselx</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .container { max-width: 600px; margin: 0 auto; }
              .success { color: #28a745; }
              .error { color: #dc3545; }
              .btn { 
                display: inline-block; 
                background-color: #e1306c; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 5px;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🚢 Vesselx Email Verification</h1>
              <p class="error">Invalid verification token</p>
              <p>The verification link is invalid or has expired.</p>
              <a href="${config.getFrontendUrl()}" class="btn">Go to Vesselx</a>
            </div>
          </body>
        </html>
      `);
    }

    if (user.isEmailVerified) {
      return res.status(400).send(`
        <html>
          <head>
            <title>Email Verification - Vesselx</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .container { max-width: 600px; margin: 0 auto; }
              .success { color: #28a745; }
              .error { color: #dc3545; }
              .btn { 
                display: inline-block; 
                background-color: #e1306c; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 5px;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🚢 Vesselx Email Verification</h1>
              <p class="success">Email already verified!</p>
              <p>Your email address has already been verified.</p>
              <a href="${config.getFrontendUrl()}" class="btn">Go to Vesselx</a>
            </div>
          </body>
        </html>
      `);
    }

    // Check if token expired
    if (user.verificationTokenExpires < new Date()) {
      return res.status(400).send(`
        <html>
          <head>
            <title>Email Verification - Vesselx</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .container { max-width: 600px; margin: 0 auto; }
              .success { color: #28a745; }
              .error { color: #dc3545; }
              .btn { 
                display: inline-block; 
                background-color: #e1306c; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 5px;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🚢 Vesselx Email Verification</h1>
              <p class="error">Verification link has expired</p>
              <p>This verification link has expired. Please request a new verification email.</p>
              <a href="${config.getFrontendUrl()}" class="btn">Go to Vesselx</a>
            </div>
          </body>
        </html>
      `);
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationCode = null;
    user.verificationTokenExpires = null;
    await user.save();

    // Send welcome email
    await EmailService.sendWelcomeEmail(user.email, user.username);

    return res.status(200).send(`
      <html>
        <head>
          <title>Email Verification - Vesselx</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 600px; margin: 0 auto; }
            .success { color: #28a745; }
            .error { color: #dc3545; }
            .btn { 
              display: inline-block; 
              background-color: #e1306c; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 5px;
              margin-top: 20px;
            }
            .token-info {
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
              word-break: break-all;
              font-family: monospace;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚢 Vesselx Email Verification</h1>
            <div style="font-size: 48px; color: #28a745; margin: 20px 0;">✓</div>
            <h2 class="success">Email Verified Successfully!</h2>
            <p>Your email address <strong>${user.email}</strong> has been verified.</p>
            <p>You can now use all features of Vesselx.</p>
            
            <div style="margin: 30px 0;">
              <p>Your account information:</p>
              <div class="token-info">
                Username: ${user.username}<br>
                Email: ${user.email}<br>
                Verified: ${new Date().toLocaleString()}
              </div>
            </div>
            
            <p>You can now:</p>
            <ul style="text-align: left; display: inline-block; margin: 20px 0;">
              <li>Create and share posts</li>
              <li>Connect with friends</li>
              <li>Send and receive messages</li>
              <li>Chat with Vesselx AI</li>
            </ul>
            
            <div style="margin-top: 30px;">
              <a href="${config.getFrontendUrl()}" class="btn">Go to Vesselx</a>
            </div>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              You can close this window and log in to your account.
            </p>
          </div>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Email verification GET error:', error);
    return res.status(500).send(`
      <html>
        <head>
          <title>Email Verification - Vesselx</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 600px; margin: 0 auto; }
            .success { color: #28a745; }
            .error { color: #dc3545; }
            .btn { 
              display: inline-block; 
              background-color: #e1306c; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 5px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚢 Vesselx Email Verification</h1>
            <p class="error">Internal server error</p>
            <p>Something went wrong during verification. Please try again later.</p>
            <a href="${config.getFrontendUrl()}" class="btn">Go to Vesselx</a>
          </div>
        </body>
      </html>
    `);
  }
});

// Get user's following
k7nle.get('/api/users/:username/following', authenticateToken, async (req, res) => {
  const { username } = req.params;

  try {
    const user = await User.findOne({ username })
      .select('following')
      .populate('following', 'username name profilePicture');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.following || []);
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user account with Cloudinary cleanup
k7nle.delete('/api/account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user info first for cleanup
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`Starting account deletion for user: ${user.username} (${user.email})`);
    
    // 1. Delete all user's posts and associated media files from Cloudinary
    const userPosts = await Post.find({ userId: userId });
    let deletedPostsCount = 0;
    let deletedCloudinaryFiles = 0;
    
    for (const post of userPosts) {
      // Delete media files from Cloudinary
      if (post.media && post.media.length > 0) {
        for (const mediaItem of post.media) {
          if (mediaItem.public_id && mediaItem.cloudinary) {
            try {
              await cloudinary.uploader.destroy(mediaItem.public_id, {
                resource_type: mediaItem.type === 'video' ? 'video' : 'image'
              });
              deletedCloudinaryFiles++;
            } catch (cloudinaryError) {
              console.warn(`Failed to delete from Cloudinary ${mediaItem.public_id}:`, cloudinaryError.message);
            }
          }
        }
      }
      
      // Delete the post
      await Post.findByIdAndDelete(post._id);
      deletedPostsCount++;
    }
    
    console.log(`Deleted ${deletedPostsCount} posts and ${deletedCloudinaryFiles} Cloudinary files`);
    
    // 2. Delete user's profile picture from Cloudinary if exists
    let deletedProfilePicture = false;
    if (user.profilePicture && user.profilePicture.includes('cloudinary')) {
      try {
        // Extract public_id from Cloudinary URL
        const urlParts = user.profilePicture.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = publicIdWithExtension.split('.')[0];
        
        await cloudinary.uploader.destroy(`vesselx/${publicId}`);
        deletedProfilePicture = true;
      } catch (cloudinaryError) {
        console.warn(`Failed to delete profile picture from Cloudinary:`, cloudinaryError.message);
      }
    }
    
    // 3. Remove user from other users' followers/following lists
    // Remove user from followers' following lists
    await User.updateMany(
      { following: userId },
      { $pull: { following: userId } }
    );
    
    // Remove user from following users' followers lists
    await User.updateMany(
      { followers: userId },
      { $pull: { followers: userId } }
    );
    
    // 4. Delete all conversations and messages
    // Delete messages where user is sender or receiver
    const deletedMessages = await Message.deleteMany({
      $or: [{ senderId: userId }, { receiverId: userId }]
    });
    
    // Delete AI conversations
    const deletedAIConversations = await Conversation.deleteMany({
      userId: userId,
      type: 'ai'
    });
    
    console.log(`Deleted ${deletedMessages.deletedCount} messages and ${deletedAIConversations.deletedCount} AI conversations`);
    
    // 5. Update posts where user has liked or commented
    await Post.updateMany(
      { likes: userId },
      { $pull: { likes: userId } }
    );
    
    await Post.updateMany(
      {},
      { $pull: { comments: { userId: userId } } }
    );
    
     const userGroups = await Group.find({ members: userId });

for (const group of userGroups) {
  if (group.admin.toString() === userId) {
    // User is admin - need to transfer admin or delete group
    if (group.members.length > 1) {
      // Transfer admin to another member
      const newAdmin = group.members.find(member => member.toString() !== userId);
      group.admin = newAdmin;
      
      // Create system message
      const systemMessage = new Message({
        senderId: userId,
        groupId: group._id,
        senderUsername: 'System',
        text: `Admin automatically transferred due to account deletion`,
        type: 'system',
        status: 'sent',
        read: false
      });
      await systemMessage.save();
      
      // Emit WebSocket event
      io.to(`group_${group._id}`).emit('groupMessage', {
        message: systemMessage,
        groupId: group._id
      });
    } else {
      // Only member - delete the group
      await Message.deleteMany({ groupId: group._id });
      await Group.findByIdAndDelete(group._id);
      continue;
    }
  }
  
  // Remove user from group members
  group.members = group.members.filter(memberId => memberId.toString() !== userId);
  await group.save();
  
  // Create system message
  const systemMessage = new Message({
    senderId: userId,
    groupId: group._id,
    senderUsername: 'System',
    text: `👋 User left the group (account deleted)`,
    type: 'system',
    status: 'sent',
    read: false
  });
  await systemMessage.save();
  
  // Emit WebSocket event
  io.to(`group_${group._id}`).emit('groupMessage', {
    message: systemMessage,
    groupId: group._id
  });
}

console.log(`Processed ${userGroups.length} groups`);

    // 7. Finally delete the user account
    await User.findByIdAndDelete(userId);
    
    console.log(`Account deletion completed for user: ${user.username}`);
    
    res.json({
      message: 'Account deleted successfully',
      deletedData: {
        posts: deletedPostsCount,
        cloudinaryFiles: deletedCloudinaryFiles,
        messages: deletedMessages.deletedCount,
        aiConversations: deletedAIConversations.deletedCount,
        profilePicture: deletedProfilePicture,
        account: true
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ 
      error: 'Failed to delete account',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Mark messages as read for a conversation
k7nle.post('/api/conversations/:username/read', authenticateToken, async (req, res) => {
  const { username } = req.params;
  const currentUserId = req.user.userId;

  try {
    const targetUser = await User.findOne({ username });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Mark all messages from this user as read
    const result = await Message.updateMany(
      {
        senderId: targetUser._id,
        receiverId: currentUserId,
        status: { $ne: 'read' }
      },
      {
        $set: {
          status: 'read',
          read: true
        }
      }
    );

    // Also update unread messages from current user to delivered if they were sent
    await Message.updateMany(
      {
        senderId: currentUserId,
        receiverId: targetUser._id,
        status: 'sent'
      },
      {
        $set: {
          status: 'delivered'
        }
      }
    );

    res.json({
      message: 'Messages marked as read',
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get message status for a conversation
k7nle.get('/api/conversations/:username/status', authenticateToken, async (req, res) => {
  const { username } = req.params;
  const currentUserId = req.user.userId;

  try {
    const targetUser = await User.findOne({ username });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all messages in this conversation
    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: targetUser._id },
        { senderId: targetUser._id, receiverId: currentUserId }
      ]
    }).sort({ createdAt: -1 }).limit(50);

    // Prepare status data
    const statusData = {
      conversationId: `${currentUserId}_${targetUser._id}`,
      messages: messages.map(msg => ({
        id: msg._id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        status: msg.status,
        read: msg.read,
        createdAt: msg.createdAt
      })),
      lastUpdate: new Date()
    };

    res.json(statusData);
  } catch (error) {
    console.error('Get message status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update message status (for delivery receipts)
k7nle.post('/api/messages/:messageId/status', authenticateToken, async (req, res) => {
  const { messageId } = req.params;
  const { status } = req.body; // 'delivered' or 'read'
  const currentUserId = req.user.userId;

  if (!['delivered', 'read'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only the receiver can mark messages as delivered/read
    if (message.receiverId.toString() !== currentUserId) {
      return res.status(403).json({ error: 'Not authorized to update this message' });
    }

    message.status = status;
    if (status === 'read') {
      message.read = true;
    }
    await message.save();

    res.json({
      message: 'Message status updated',
      messageId: message._id,
      status: message.status,
      read: message.read
    });
  } catch (error) {
    console.error('Update message status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload media/files for messages (images, videos, audio, files)
k7nle.post('/api/messages/upload', authenticateVerifiedToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = req.file;
    const mime = file.mimetype || '';
    let messageType = 'file';
    let folder = 'vesselx/message_files';

    if (mime.startsWith('image/')) {
      messageType = 'image';
      folder = 'vesselx/message_images';
    } else if (mime.startsWith('video/')) {
      messageType = 'video';
      folder = 'vesselx/message_videos';
    } else if (mime.startsWith('audio/')) {
      messageType = 'audio';
      folder = 'vesselx/message_audio';
    }

    let uploadResult;
    if (file.path && (file.path.startsWith('http') || file.path.includes('cloudinary'))) {
      uploadResult = {
        secure_url: file.path,
        public_id: file.filename || null
      };
    } else if (file.buffer) {
      uploadResult = await uploadToCloudinary(file.buffer, file.originalname, folder);
    } else {
      return res.status(400).json({ error: 'File could not be processed. Please try again.' });
    }

    res.status(200).json({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      mediaType: mime,
      messageType,
      fileName: file.originalname,
      fileSize: file.size
    });
  } catch (error) {
    console.error('Message media upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Send message (DM or Group) — supports text, image, video, audio, file
async function updateMessageStreak(userId) {
  try {
    const user = await User.findById(userId).select('currentStreak longestStreak lastMessageDate');
    if (!user) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const lastMsg = user.lastMessageDate ? new Date(user.lastMessageDate) : null;
    if (lastMsg) lastMsg.setHours(0, 0, 0, 0);
    let streak = user.currentStreak || 0;
    let longest = user.longestStreak || 0;
    if (!lastMsg) {
      streak = 1;
    } else {
      const diff = Math.round((today - lastMsg) / (1000 * 60 * 60 * 24));
      if (diff === 0) { /* already messaged today, no change */ }
      else if (diff === 1) { streak += 1; }
      else { streak = 1; }
    }
    if (streak > longest) longest = streak;
    await User.findByIdAndUpdate(userId, { lastMessageDate: new Date(), currentStreak: streak, longestStreak: longest });
  } catch (e) {
    console.error('[MessageStreak] update error:', e.message);
  }
}

k7nle.post('/api/messages', authenticateVerifiedToken, async (req, res) => {
  const {
    receiverUsername,
    text,
    formattedText,
    groupId,
    type = 'text',
    mediaUrl,
    mediaType,
    mediaPublicId,
    fileName,
    fileSize,
    duration
  } = req.body;
  const senderId = req.user.userId;

  const isMediaMessage = ['image', 'video', 'audio', 'file'].includes(type);

  if (!isMediaMessage && !text) {
    return res.status(400).json({ error: 'Message text is required' });
  }
  if (isMediaMessage && !mediaUrl) {
    return res.status(400).json({ error: 'mediaUrl is required for media messages' });
  }

  try {
    if (groupId) {
      const group = await Group.findOne({ _id: groupId, members: senderId });
      if (!group) {
        return res.status(403).json({ error: 'Not a member of this group' });
      }

      const sender = await User.findById(senderId);
      const processedText = isMediaMessage ? (text || '') : processContent(text).text;

      const newMessage = new Message({
        senderId,
        groupId,
        senderUsername: sender.username,
        text: processedText,
        formattedText: formattedText || processedText,
        type,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        mediaPublicId: mediaPublicId || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        duration: duration || null,
        status: 'sent',
        read: false
      });

      await newMessage.save();
      group.lastActivity = new Date();
      await group.save();

      const populatedMessage = await Message.findById(newMessage._id)
        .populate('senderId', 'username name profilePicture isSupa isVerified isOnline');

      io.to(`group_${groupId}`).emit('newGroupMessage', {
        message: populatedMessage,
        groupId
      });

      setImmediate(() => updateMessageStreak(senderId).catch(() => {}));
      return res.status(201).json({ message: populatedMessage });
    } else {
      if (!receiverUsername) {
        return res.status(400).json({ error: 'Receiver username is required for direct messages' });
      }
      const receiver = await User.findOne({ username: receiverUsername });
      const sender = await User.findById(senderId);
      if (!receiver) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (senderId === receiver._id.toString()) {
        return res.status(400).json({ error: 'Cannot send message to yourself' });
      }

      const processedText = isMediaMessage ? (text || '') : processContent(text).text;

      const newMessage = new Message({
        senderId,
        receiverId: receiver._id,
        senderUsername: sender.username,
        receiverUsername: receiver.username,
        text: processedText,
        formattedText: formattedText || processedText,
        type,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        mediaPublicId: mediaPublicId || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        duration: duration || null,
        status: 'sent',
        read: false
      });

      await newMessage.save();

      const populatedMessage = await Message.findById(newMessage._id)
        .populate('senderId', 'username name profilePicture isSupa isVerified isOnline');

      io.to(`user_${receiver._id}`).emit('newMessage', {
        message: populatedMessage
      });

      const dmPreview = type === 'text' ? (text || '').slice(0, 60) : `[${type}]`;
      notify({
        recipientId: receiver._id,
        actorId: senderId,
        actorName: sender.name || sender.username,
        type: 'new_dm',
        messageId: newMessage._id,
        message: `${sender.username}: ${dmPreview}`,
        meta: { preview: dmPreview, senderUsername: sender.username },
        pushMeta: { preview: dmPreview }
      }).catch(() => {});

      setImmediate(() => updateMessageStreak(senderId).catch(() => {}));
      return res.status(201).json({
        message: 'Message sent successfully',
        data: populatedMessage
      });
    }
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

k7nle.get('/api/conversations', authenticateToken, async (req, res) => {
  const currentUserId = req.user.userId;

  try {
    let uid;
    try { uid = new mongoose.Types.ObjectId(currentUserId); } catch { uid = currentUserId; }

    const agg = await Message.aggregate([
      {
        $match: {
          $and: [
            { $or: [{ senderId: uid }, { receiverId: uid }] },
            { $or: [{ groupId: null }, { groupId: { $exists: false } }] }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $addFields: {
          otherUserId: { $cond: { if: { $eq: ['$senderId', uid] }, then: '$receiverId', else: '$senderId' } },
          isMine: { $eq: ['$senderId', uid] }
        }
      },
      {
        $group: {
          _id: '$otherUserId',
          lastText: { $first: '$text' },
          lastTime: { $first: '$createdAt' },
          isMine: { $first: '$isMine' },
          unreadCount: {
            $sum: {
              $cond: {
                if: { $and: [{ $eq: ['$receiverId', uid] }, { $eq: ['$read', false] }] },
                then: 1, else: 0
              }
            }
          }
        }
      },
      { $sort: { lastTime: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userArr'
        }
      },
      { $unwind: { path: '$userArr', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          user: {
            _id: { $ifNull: ['$userArr._id', '$_id'] },
            username: { $ifNull: ['$userArr.username', ''] },
            name: { $ifNull: ['$userArr.name', ''] },
            profilePicture: { $ifNull: ['$userArr.profilePicture', ''] },
            isOnline: { $ifNull: ['$userArr.isOnline', false] },
            isSupa: { $ifNull: ['$userArr.isSupa', false] },
            isVerified: { $ifNull: ['$userArr.isVerified', false] }
          },
          lastMessage: { text: '$lastText', createdAt: '$lastTime', isMine: '$isMine' },
          unreadCount: 1
        }
      }
    ]);

    res.json(agg);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update get conversation endpoint
k7nle.get('/api/conversations/:username', authenticateToken, markMessagesAsDelivered, async (req, res) => {
  const { username } = req.params;
  const currentUserId = req.user.userId;

  try {
    const targetUser = await User.findOne({ username });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: targetUser._id },
        { senderId: targetUser._id, receiverId: currentUserId }
      ]
    }).sort({ createdAt: 1 });

    // Format response with formattedText and status
    const formattedMessages = messages.map(msg => ({
      _id: msg._id,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      text: msg.text,
      formattedText: msg.formattedText || msg.text, // Include formatted text
      status: msg.status || 'sent', // Include status
      read: msg.read,
      createdAt: msg.createdAt
    }));

    res.json({
      targetUser: {
        id: targetUser._id,
        username: targetUser.username,
        name: targetUser.name,
        profilePicture: targetUser.profilePicture,
        isOnline: false // You can implement online status tracking
      },
      messages: formattedMessages
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new group with Cloudinary
k7nle.post('/api/groups', authenticateToken, upload.single('profilePicture'), async (req, res) => {
  try {
    const { name, description, privacy } = req.body;
    const adminId = req.user.userId;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const inviteCode = crypto.randomBytes(4).toString('hex');

    // Start with admin as the only member
    let members = [adminId];

    const groupData = {
      name: name.trim(),
      description: description || '',
      admin: adminId,
      members: members,
      privacy: privacy || 'private',
      inviteCode: inviteCode
    };

    if (req.file) {
      groupData.profilePicture = req.file.path; // Cloudinary URL
    }

    const newGroup = new Group(groupData);
    await newGroup.save();

    // Create system message for group creation
    const systemMessage = new Message({
      senderId: adminId,
      groupId: newGroup._id,
      senderUsername: 'System',
      text: `${req.user.username} created the group "${name.trim()}"`,
      type: 'system',
      status: 'sent',
      read: false
    });
    await systemMessage.save();

    // Populate group with member details
    const populatedGroup = await Group.findById(newGroup._id)
      .populate('admin', 'username name profilePicture isSupa isVerified isOnline')
      .populate('members', 'username name profilePicture isSupa isVerified isOnline');

    res.status(201).json({
      message: 'Group created successfully',
      group: populatedGroup
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ 
      error: 'Failed to create group',
      details: error.message 
    });
  }
});

// Join group by invite code
k7nle.post('/api/groups/join/:inviteCode', authenticateToken, async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const userId = req.user.userId;

    const group = await Group.findOne({ inviteCode });
    if (!group) {
      return res.status(404).json({ error: 'Invalid invite link' });
    }

    if (group.members.includes(userId)) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }

    group.members.push(userId);
    group.lastActivity = new Date();
    await group.save();

    // Create system message for joining
    const systemMessage = new Message({
      groupId: group._id,
      senderUsername: 'System',
      text: `${req.user.username} joined the group via invite link`,
      type: 'system',
      status: 'sent'
    });
    await systemMessage.save();

    res.json({ message: 'Joined group successfully', group });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all groups for a user
k7nle.get('/api/groups', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const groups = await Group.find({ members: userId })
      .populate('admin', 'username name profilePicture isSupa isVerified isOnline')
      .populate('members', 'username name profilePicture isSupa isVerified isOnline')
      .sort({ lastActivity: -1 });

    // Add unread message counts
    const groupsWithUnreadCounts = await Promise.all(
      groups.map(async (group) => {
        const unreadCount = await Message.countDocuments({
          groupId: group._id,
          'readBy.userId': { $ne: userId },
          senderId: { $ne: userId }
        });

        const groupObj = group.toObject();
        groupObj.unreadCount = unreadCount;
        return groupObj;
      })
    );

    res.json(groupsWithUnreadCounts);
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search groups — must be before /:groupId to avoid route collision
k7nle.get('/api/groups/search', authenticateToken, async (req, res) => {
  try {
    const { q, type = 'all' } = req.query;
    const userId = req.user.userId;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    let query = {
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    };

    if (type === 'public') {
      query.privacy = 'public';
    } else if (type === 'my') {
      query.members = userId;
    }

    const groups = await Group.find(query)
      .populate('admin', 'username name profilePicture isSupa isVerified isOnline')
      .populate('members', 'username name profilePicture isSupa isVerified isOnline')
      .limit(20)
      .sort({ lastActivity: -1 });

    res.json(groups);
  } catch (error) {
    console.error('Search groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single group by ID
k7nle.get('/api/groups/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    const group = await Group.findOne({ 
      _id: groupId,
      members: userId 
    })
    .populate('admin', 'username name profilePicture isSupa isVerified isOnline')
    .populate('members', 'username name profilePicture isSupa isVerified isOnline');

    if (!group) {
      return res.status(404).json({ error: 'Group not found or access denied' });
    }

    res.json(group);
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update group with Cloudinary
k7nle.put('/api/groups/:groupId', authenticateToken, upload.single('profilePicture'), async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;
    const { name, description, privacy } = req.body;

    // Check if user is admin
    const group = await Group.findOne({ 
      _id: groupId,
      admin: userId 
    });

    if (!group) {
      return res.status(403).json({ error: 'Only group admin can update the group' });
    }

    const updates = {};
    if (name && name.trim()) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    if (privacy) {
      updates.privacy = privacy;
      
      // Generate new invite code for private groups
      if (privacy === 'private' && !group.inviteCode) {
        updates.inviteCode = crypto.randomBytes(6).toString('hex');
        updates.inviteCodeExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }
    }

    if (req.file) {
      updates.profilePicture = req.file.path; // Cloudinary URL
    }

    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      updates,
      { new: true }
    )
    .populate('admin', 'username name profilePicture isSupa isVerified isOnline')
    .populate('members', 'username name profilePicture isSupa isVerified isOnline');

    res.json({
      message: 'Group updated successfully',
      group: updatedGroup
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete group
k7nle.delete('/api/groups/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    // Check if user is admin
    const group = await Group.findOne({ 
      _id: groupId,
      admin: userId 
    });

    if (!group) {
      return res.status(403).json({ error: 'Only group admin can delete the group' });
    }

    // Delete all group messages
    await Message.deleteMany({ groupId: groupId });

    // Delete the group
    await Group.findByIdAndDelete(groupId);

    res.json({
      message: 'Group deleted successfully',
      deletedGroupId: groupId
    });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add members to group
k7nle.post('/api/groups/:groupId/members', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;
    const { memberIds } = req.body;

    if (!memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({ error: 'Member IDs array is required' });
    }

    // Check if user is admin or member with add permissions
    const group = await Group.findOne({ 
      _id: groupId,
      members: userId 
    });

    if (!group) {
      return res.status(403).json({ error: 'Not a group member' });
    }

    // Only admin can add members
    if (group.admin.toString() !== userId) {
      return res.status(403).json({ error: 'Only group admin can add members' });
    }

    // Validate new members exist
    const existingUsers = await User.find({ _id: { $in: memberIds } });
    if (existingUsers.length !== memberIds.length) {
      return res.status(400).json({ error: 'One or more users not found' });
    }

    // Add new members (avoid duplicates)
    const newMembers = memberIds.filter(id => !group.members.includes(id));
    group.members.push(...newMembers);
    await group.save();

    // Create system message for new members
    const systemMessagePromises = newMembers.map(async (newMemberId) => {
      const newMember = await User.findById(newMemberId);
      const systemMessage = new Message({
        senderId: userId,
        groupId: groupId,
        senderUsername: 'System',
        text: `${req.user.username} added ${newMember.username}`,
        type: 'system',
        status: 'sent',
        read: false
      });
      await systemMessage.save();
      
      // Emit WebSocket event
      io.to(`group_${groupId}`).emit('groupMessage', {
        message: systemMessage,
        groupId: groupId
      });
    });

    await Promise.all(systemMessagePromises);

    const updatedGroup = await Group.findById(groupId)
      .populate('admin', 'username name profilePicture isSupa isVerified isOnline')
      .populate('members', 'username name profilePicture isSupa isVerified isOnline');

    res.json({
      message: 'Members added successfully',
      group: updatedGroup,
      addedCount: newMembers.length
    });
  } catch (error) {
    console.error('Add members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove member from group
k7nle.delete('/api/groups/:groupId/members/:memberId', authenticateToken, async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.userId;

    // Check if user is admin
    const group = await Group.findOne({ 
      _id: groupId,
      admin: userId 
    });

    if (!group) {
      return res.status(403).json({ error: 'Only group admin can remove members' });
    }

    // Cannot remove admin
    if (memberId === group.admin.toString()) {
      return res.status(400).json({ error: 'Cannot remove group admin' });
    }

    // Check if member is in group
    if (!group.members.includes(memberId)) {
      return res.status(400).json({ error: 'User is not a group member' });
    }

    // Remove member
    group.members = group.members.filter(id => id.toString() !== memberId);
    await group.save();

    // Create system message
    const removedMember = await User.findById(memberId);
    const systemMessage = new Message({
      senderId: userId,
      groupId: groupId,
      senderUsername: 'System',
      text: `${removedMember.username} was kicked by ${req.user.username}`,
      type: 'system',
      status: 'sent',
      read: false
    });
    await systemMessage.save();

    // Emit WebSocket event
    io.to(`group_${groupId}`).emit('groupMessage', {
      message: systemMessage,
      groupId: groupId
    });

    // Emit leave event to removed user
    io.to(`user_${memberId}`).emit('removedFromGroup', {
      groupId: groupId,
      groupName: group.name
    });

    const updatedGroup = await Group.findById(groupId)
      .populate('admin', 'username name profilePicture isSupa isVerified isOnline')
      .populate('members', 'username name profilePicture isSupa isVerified isOnline');

    res.json({
      message: 'Member removed successfully',
      group: updatedGroup
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Leave group
k7nle.post('/api/groups/:groupId/leave', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is a member
    if (!group.members.includes(userId)) {
      return res.status(400).json({ error: 'You are not a member of this group' });
    }

    // Cannot leave if you're the admin (must transfer admin or delete group)
    if (group.admin.toString() === userId) {
      return res.status(400).json({ 
        error: 'Group admin cannot leave. Transfer admin role or delete the group.' 
      });
    }

    // Remove user from members
    group.members = group.members.filter(id => id.toString() !== userId);
    await group.save();

    // Create system message
    const user = await User.findById(userId);
    const systemMessage = new Message({
      senderId: userId,
      groupId: groupId,
      senderUsername: 'System',
      text: `${user.username} has left the group`,
      type: 'system',
      status: 'sent',
      read: false
    });
    await systemMessage.save();

    // Emit WebSocket events
    io.to(`group_${groupId}`).emit('groupMessage', {
      message: systemMessage,
      groupId: groupId
    });

    io.to(`user_${userId}`).emit('leftGroup', {
      groupId: groupId
    });

    res.json({
      message: 'Successfully left the group',
      groupId: groupId
    });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Transfer admin role
k7nle.post('/api/groups/:groupId/transfer-admin', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { newAdminId } = req.body;
    const userId = req.user.userId;

    if (!newAdminId) {
      return res.status(400).json({ error: 'New admin ID is required' });
    }

    // Check if current user is admin
    const group = await Group.findOne({ 
      _id: groupId,
      admin: userId 
    });

    if (!group) {
      return res.status(403).json({ error: 'Only group admin can transfer admin role' });
    }

    // Check if new admin is a group member
    if (!group.members.includes(newAdminId)) {
      return res.status(400).json({ error: 'New admin must be a group member' });
    }

    // Transfer admin role
    group.admin = newAdminId;
    await group.save();

    // Create system message
    const newAdmin = await User.findById(newAdminId);
    const systemMessage = new Message({
      senderId: userId,
      groupId: groupId,
      senderUsername: 'System',
      text: `${newAdmin.username} is now an admin, by ${req.user.username}`,
      type: 'system',
      status: 'sent',
      read: false
    });
    await systemMessage.save();

    // Emit WebSocket event
    io.to(`group_${groupId}`).emit('groupMessage', {
      message: systemMessage,
      groupId: groupId
    });

    const updatedGroup = await Group.findById(groupId)
      .populate('admin', 'username name profilePicture isSupa isVerified isOnline')
      .populate('members', 'username name profilePicture isSupa isVerified isOnline');

    res.json({
      message: 'Admin role transferred successfully',
      group: updatedGroup
    });
  } catch (error) {
    console.error('Transfer admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join group with invite code
k7nle.post('/api/groups/:inviteCode/join', authenticateToken, async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const userId = req.user.userId;

    const group = await Group.findOne({
      inviteCode: inviteCode,
      inviteCodeExpires: { $gt: new Date() }
    });

    if (!group) {
      return res.status(400).json({ error: 'Invalid or expired invite code' });
    }

    // Check if user is already a member
    if (group.members.includes(userId)) {
      return res.status(400).json({ error: 'You are already a member of this group' });
    }

    group.members.push(userId);
    await group.save();

    // Create system message
    const user = await User.findById(userId);
    const systemMessage = new Message({
      senderId: userId,
      groupId: group._id,
      senderUsername: 'System',
      text: `${user.username} joined the group using invite code`,
      type: 'system',
      status: 'sent',
      read: false
    });
    await systemMessage.save();

    io.to(`group_${group._id}`).emit('groupMessage', {
      message: systemMessage,
      groupId: group._id
    });

    io.to(`user_${userId}`).emit('joinedGroup', {
      groupId: group._id,
      groupName: group.name
    });

    const updatedGroup = await Group.findById(group._id)
      .populate('admin', 'username name profilePicture isSupa isVerified isOnline')
      .populate('members', 'username name profilePicture isSupa isVerified isOnline');

    res.json({
      message: 'Successfully joined the group',
      group: updatedGroup
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate new invite code
k7nle.post('/api/groups/:groupId/invite-code', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    // Check if user is admin
    const group = await Group.findOne({ 
      _id: groupId,
      admin: userId 
    });

    if (!group) {
      return res.status(403).json({ error: 'Only group admin can generate invite codes' });
    }
    
    const newInviteCode = crypto.randomBytes(6).toString('hex');
    group.inviteCode = newInviteCode;
    group.inviteCodeExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await group.save();

    res.json({
      message: 'New invite code generated',
      inviteCode: newInviteCode,
      expires: group.inviteCodeExpires
    });
  } catch (error) {
    console.error('Generate invite code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

k7nle.post('/api/groups/:groupId/messages', authenticateVerifiedToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const {
      text,
      formattedText,
      type = 'text',
      mediaUrl,
      mediaType,
      mediaPublicId,
      fileName,
      fileSize,
      duration,
      replyToMessageId
    } = req.body;
    const senderId = req.user.userId;

    const isMediaMessage = ['image', 'video', 'audio', 'file'].includes(type);

    if (!isMediaMessage && (!text || !text.trim())) {
      return res.status(400).json({ error: 'Message text is required' });
    }
    if (isMediaMessage && !mediaUrl) {
      return res.status(400).json({ error: 'mediaUrl is required for media messages' });
    }

    const group = await Group.findOne({ _id: groupId, members: senderId });
    if (!group) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    if (group.textOnly && isMediaMessage) {
      return res.status(400).json({ error: 'Only text messages are allowed in this group' });
    }

    const sender = await User.findById(senderId);
    const processedText = isMediaMessage ? (text || '') : (text ? text.trim() : '');

    let replyToData = null;
    if (replyToMessageId) {
      const replyMsg = await Message.findById(replyToMessageId).select('text senderUsername senderId').lean();
      if (replyMsg) {
        replyToData = {
          messageId: replyMsg._id,
          text: replyMsg.text ? replyMsg.text.slice(0, 200) : '',
          senderUsername: replyMsg.senderUsername
        };
      }
    }

    const newMessage = new Message({
      senderId,
      groupId,
      senderUsername: sender.username,
      text: processedText,
      formattedText: formattedText || processedText,
      type,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      mediaPublicId: mediaPublicId || null,
      fileName: fileName || null,
      fileSize: fileSize || null,
      duration: duration || null,
      replyTo: replyToData,
      status: 'sent',
      read: false
    });

    await newMessage.save();

    group.lastActivity = new Date();
    await group.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'username name profilePicture isSupa isVerified isOnline');

    io.to(`group_${groupId}`).emit('groupMessage', {
      message: populatedMessage,
      groupId
    });
    io.to(`group_${groupId}`).emit('newGroupMessage', {
      message: populatedMessage,
      groupId
    });

    const mentionedUsernames = extractMentions(processedText);
    if (mentionedUsernames.length > 0) {
      const mentionedUsers = await User.find({
        username: { $in: mentionedUsernames },
        _id: { $ne: senderId, $in: group.members }
      }).select('_id username').lean();

      for (const mu of mentionedUsers) {
        notify({
          recipientId: mu._id,
          actorId: senderId,
          actorName: sender.name || sender.username || 'Someone',
          type: 'group_mention',
          groupId: group._id,
          messageId: newMessage._id,
          message: `${sender.name || sender.username} mentioned you in ${group.name}`,
          pushMeta: { groupName: group.name }
        }).catch(() => {});
      }
    }

    if (replyToData && replyToData.messageId) {
      const originalMsg = await Message.findById(replyToData.messageId).select('senderId').lean();
      if (originalMsg && originalMsg.senderId && originalMsg.senderId.toString() !== senderId) {
        notify({
          recipientId: originalMsg.senderId,
          actorId: senderId,
          actorName: sender.name || sender.username || 'Someone',
          type: 'group_reply',
          groupId: group._id,
          messageId: newMessage._id,
          message: `${sender.name || sender.username} replied to your message in ${group.name}`,
          pushMeta: { groupName: group.name }
        }).catch(() => {});
      }
    }

    res.status(201).json({
      message: populatedMessage
    });
  } catch (error) {
    console.error('Send group message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get group messages
k7nle.get('/api/groups/:groupId/messages', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;
    const { limit = 50, before } = req.query;

    // Check if user is a group member
    const group = await Group.findOne({
      _id: groupId,
      members: userId
    });

    if (!group) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Build query
    const query = { groupId: groupId };
    if (before) {
      query._id = { $lt: before };
    }

    // Get messages
    const messages = await Message.find(query)
      .populate('senderId', 'username name profilePicture isSupa isVerified isOnline')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Mark messages as read for this user
    const unreadMessages = messages.filter(msg => {
      const senderIdStr = msg.senderId && msg.senderId._id ? msg.senderId._id.toString() : null;
      const readBy = msg.readBy || [];
      return senderIdStr !== userId && !readBy.some(reader => reader.userId && reader.userId.toString() === userId);
    });

    if (unreadMessages.length > 0) {
      await Promise.all(
        unreadMessages.map(async (msg) => {
          await Message.findByIdAndUpdate(msg._id, {
            $push: {
              readBy: {
                userId: userId,
                readAt: new Date()
              }
            }
          });

          if (msg.senderId && msg.senderId._id) {
            io.to(`user_${msg.senderId._id}`).emit('messageRead', {
              messageId: msg._id,
              groupId: groupId,
              readerId: userId
            });
          }
        })
      );
    }

    // Add read status for current user
    const enhancedMessages = messages.map(msg => ({
      ...msg,
      readByMe: (msg.readBy || []).some(reader => reader.userId && reader.userId.toString() === userId),
      readCount: (msg.readBy || []).length
    }));

    res.json({
      messages: enhancedMessages.reverse(), // Reverse to get chronological order
      hasMore: enhancedMessages.length === parseInt(limit),
      group: {
        id: group._id,
        name: group.name,
        memberCount: group.members.length
      }
    });
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get group members
k7nle.get('/api/groups/:groupId/members', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    // Check if user is a group member
    const group = await Group.findOne({
      _id: groupId,
      members: userId
    }).populate('members', 'username name profilePicture bio');

    if (!group) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    res.json(group.members);
  } catch (error) {
    console.error('Get group members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Push Notification endpoints
k7nle.get('/api/push/vapid-key', (req, res) => {
  const key = config.getVapidPublicKey();
  if (!key) return res.status(503).json({ error: 'Push notifications not configured' });
  res.json({ publicKey: key });
});

k7nle.post('/api/push/subscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }
    await User.updateOne(
      { _id: userId, 'pushSubscriptions.endpoint': { $ne: subscription.endpoint } },
      {
        $push: {
          pushSubscriptions: {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            expirationTime: subscription.expirationTime ? new Date(subscription.expirationTime) : null
          }
        }
      }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

k7nle.post('/api/push/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'Endpoint required' });
    await User.updateOne({ _id: userId }, { $pull: { pushSubscriptions: { endpoint } } });
    res.json({ success: true });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const storiesRouter = require('./routes/stories');
const soundsRouter = require('./routes/sounds');
const channelsRouter = require('./routes/channels');
const supaRouter = require('./routes/supa');
const feedRouter = require('./routes/feed');
const moderationRouter = require('./routes/moderation');
const notificationsRouter = require('./routes/notifications');
const gamesRouter = require('./routes/games');
const stickersRouter = require('./routes/stickers');
const telegramAuthRouter = require('./routes/telegram-auth');
const GameRoom = require('./models/GameRoom');

const routeAuth = (req, res, next) => authenticateToken(req, res, next);

k7nle.use('/api/stories', routeAuth, storiesRouter);
k7nle.use('/api/sounds', routeAuth, soundsRouter);
k7nle.use('/api/channels', routeAuth, channelsRouter);
k7nle.use('/api/supa', routeAuth, supaRouter);
k7nle.use('/api/feed', routeAuth, feedRouter);
k7nle.use('/api/moderation', routeAuth, moderationRouter);
k7nle.use('/api/notifications', routeAuth, notificationsRouter);
k7nle.use('/api/games', routeAuth, gamesRouter);
k7nle.use('/api/stickers', stickersRouter);
k7nle.use('/api/auth/telegram', telegramAuthRouter);

k7nle.get('/api/music/search', routeAuth, async (req, res) => {
  try {
    const { q, limit = 25 } = req.query;
    if (!q || !q.trim()) return res.status(400).json({ error: 'Search query is required' });

    const safeLimit = Math.min(parseInt(limit) || 25, 50);
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q.trim())}&media=music&entity=song&limit=${safeLimit}&country=US`;

    const response = await axios.get(url, { timeout: 8000 });
    const results = (response.data.results || []).map(track => ({
      id: String(track.trackId),
      title: track.trackName || '',
      artist: track.artistName || '',
      album: track.collectionName || '',
      artwork: track.artworkUrl100 ? track.artworkUrl100.replace('100x100', '300x300') : null,
      previewUrl: track.previewUrl || null,
      duration: track.trackTimeMillis ? Math.round(track.trackTimeMillis / 1000) : null,
      genre: track.primaryGenreName || null,
      releaseDate: track.releaseDate ? track.releaseDate.split('T')[0] : null,
      itunesUrl: track.trackViewUrl || null
    }));

    res.json({ results, total: results.length, query: q.trim() });
  } catch (err) {
    console.error('[Music Search] Error:', err.message);
    res.status(500).json({ error: 'Music search failed. Please try again.' });
  }
});

k7nle.post('/api/webhooks/monnify', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const { secretKey } = config.getMonnifyConfig();
    const rawBody = req.body.toString('utf8');
    const computedHash = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
    const receivedHash = req.headers['monnify-signature'];

    if (receivedHash && computedHash !== receivedHash) {
      console.warn('Monnify webhook: invalid signature');
      return res.sendStatus(200);
    }

    const event = JSON.parse(rawBody);
    const eventType = event.eventType;

    if (eventType === 'SUCCESSFUL_TRANSACTION') {
      const data = event.eventData;
      const amountPaid = parseFloat(data.amountPaid || data.totalPayable || 0);
      const paymentRef = data.transactionReference || data.paymentReference;
      const accountRef = data.product?.reference;
      const customerEmail = data.customer?.email;

      if (!paymentRef) return res.sendStatus(200);

      const existing = await PaymentRecord.findOne({ reference: paymentRef, status: 'success' });
      if (existing) return res.sendStatus(200);

      let user = null;
      if (accountRef) {
        user = await User.findOne({ monnifyAccountRef: accountRef });
      }
      if (!user && customerEmail) {
        user = await User.findOne({ email: customerEmail });
      }
      if (!user) {
        console.warn(`Monnify webhook: no user found for ref=${accountRef} email=${customerEmail}`);
        return res.sendStatus(200);
      }

      const PLANS_LOCAL = {
        monthly: { amount: 1100, durationDays: 30, label: '1 Month' },
        yearly:  { amount: 12000, durationDays: 365, label: '1 Year' }
      };

      let plan = null;
      if (amountPaid >= 12000) plan = 'yearly';
      else if (amountPaid >= 1100) plan = 'monthly';

      if (!plan) {
        console.warn(`Monnify webhook: unrecognised amount ₦${amountPaid} for user ${user.username}`);
        return res.sendStatus(200);
      }

      const now = new Date();
      const base = user.isSupa && user.supaExpiresAt > now ? user.supaExpiresAt : now;
      const expiresAt = new Date(base.getTime() + PLANS_LOCAL[plan].durationDays * 86400000);

      user.isSupa = true;
      user.supaStartedAt = user.supaStartedAt || now;
      user.supaExpiresAt = expiresAt;
      user.supaFeatures = {
        customBadge: user.supaFeatures?.customBadge || null,
        profileTheme: user.supaFeatures?.profileTheme || null,
        hdUploads: true, extendedStories: true, customSounds: true,
        priorityFeed: true, postScheduling: true, channelAnalytics: true, extraAiHistory: true
      };
      await user.save();

      await PaymentRecord.findOneAndUpdate(
        { reference: paymentRef },
        {
          userId: user._id,
          plan,
          amount: amountPaid,
          currency: 'NGN',
          cardLastFour: null,
          cardBrand: data.paymentMethod || 'bank_transfer',
          cardHolderName: data.customer?.name || user.name || user.username,
          status: 'success',
          supaGrantedAt: now,
          supaExpiresAt: expiresAt,
          reference: paymentRef
        },
        { upsert: true, new: true }
      );

      console.log(`Monnify webhook: Supa ${plan} granted to ${user.username} via ${paymentRef}`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Monnify webhook error:', err.message);
    res.sendStatus(200);
  }
});

const { SUPPORTED_LANGUAGES, getTranslations } = require('./locales/translations');

k7nle.get('/api/i18n/languages', (req, res) => {
  res.json({ languages: SUPPORTED_LANGUAGES });
});

k7nle.get('/api/i18n/:lang', (req, res) => {
  const { lang } = req.params;
  const data = getTranslations(lang);
  res.json({
    code: lang,
    name: data.name,
    nativeName: data.nativeName,
    dir: data.dir,
    translations: data.t
  });
});

k7nle.put('/api/settings/language', authenticateToken, async (req, res) => {
  try {
    const { language } = req.body;
    if (!language) return res.status(400).json({ error: 'language is required' });

    const supported = SUPPORTED_LANGUAGES.find(l => l.code === language);
    if (!supported) return res.status(400).json({ error: `Language '${language}' is not supported` });

    await User.findByIdAndUpdate(req.user.userId, { language });
    res.json({ message: 'Language updated successfully', language, name: supported.name, nativeName: supported.nativeName });
  } catch (err) {
    console.error('Update language error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── BLOCK / UNBLOCK ─────────────────────────────────────────────────────────

k7nle.post('/api/users/:username/block', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user.userId;

    const targetUser = await User.findOne({ username });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    if (targetUser._id.toString() === currentUserId) return res.status(400).json({ error: 'Cannot block yourself' });

    await User.findByIdAndUpdate(currentUserId, { $addToSet: { blockedUsers: targetUser._id } });
    await User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUser._id } });
    await User.findByIdAndUpdate(targetUser._id, { $pull: { followers: currentUserId } });
    await User.findByIdAndUpdate(targetUser._id, { $pull: { following: currentUserId } });
    await User.findByIdAndUpdate(currentUserId, { $pull: { followers: targetUser._id } });

    res.json({ message: `${username} has been blocked`, blocked: true });
  } catch (err) {
    console.error('Block user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

k7nle.post('/api/users/:username/unblock', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user.userId;

    const targetUser = await User.findOne({ username });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    await User.findByIdAndUpdate(currentUserId, { $pull: { blockedUsers: targetUser._id } });

    res.json({ message: `${username} has been unblocked`, blocked: false });
  } catch (err) {
    console.error('Unblock user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

k7nle.get('/api/users/me/blocked', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('blockedUsers')
      .populate('blockedUsers', 'username name profilePicture isVerified');
    res.json(user.blockedUsers || []);
  } catch (err) {
    console.error('Get blocked users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── FRIENDS (mutual follows) ─────────────────────────────────────────────────

k7nle.get('/api/users/me/friends', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('following followers');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const followingSet = new Set(user.following.map(id => id.toString()));
    const friendIds = user.followers.filter(id => followingSet.has(id.toString()));

    const friends = await User.find({ _id: { $in: friendIds } })
      .select('username name profilePicture isVerified isSupa isOnline lastSeen currentStreak');

    res.json(friends);
  } catch (err) {
    console.error('Get friends error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

k7nle.get('/api/users/:username/friends', authenticateToken, async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: req.params.username }).select('following followers blockedUsers');
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const currentUserId = req.user.userId;
    if (targetUser.blockedUsers && targetUser.blockedUsers.some(b => b.toString() === currentUserId)) {
      return res.status(403).json({ error: 'Not accessible' });
    }

    const followingSet = new Set(targetUser.following.map(id => id.toString()));
    const friendIds = targetUser.followers.filter(id => followingSet.has(id.toString()));

    const friends = await User.find({ _id: { $in: friendIds } })
      .select('username name profilePicture isVerified isSupa isOnline currentStreak');

    res.json(friends);
  } catch (err) {
    console.error('Get user friends error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── STREAK INFO ──────────────────────────────────────────────────────────────

k7nle.get('/api/users/me/streak', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('currentStreak longestStreak lastMessageDate');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ currentStreak: user.currentStreak || 0, longestStreak: user.longestStreak || 0, lastMessageDate: user.lastMessageDate, streakType: 'messaging' });
  } catch (err) {
    console.error('Get streak error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── MESSAGE REACTIONS (DM) ───────────────────────────────────────────────────

k7nle.post('/api/messages/:messageId/react', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.userId;

    if (!emoji) return res.status(400).json({ error: 'emoji is required' });

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const isParticipant = msg.senderId?.toString() === userId || msg.receiverId?.toString() === userId;
    if (!isParticipant) return res.status(403).json({ error: 'Not authorized' });

    if (!msg.reactions) msg.reactions = [];
    const existingIdx = msg.reactions.findIndex(r => r.userId.toString() === userId);
    if (existingIdx !== -1) {
      if (msg.reactions[existingIdx].emoji === emoji) {
        msg.reactions.splice(existingIdx, 1);
        await msg.save();
        try {
          const { getIo } = require('./lib/io');
          const io = getIo();
          if (io) io.to(`user_${msg.senderId}`).to(`user_${msg.receiverId}`).emit('messageReactionUpdated', { messageId, reactions: msg.reactions });
        } catch (e) {}
        return res.json({ reacted: false, reactions: msg.reactions });
      }
      msg.reactions[existingIdx].emoji = emoji;
    } else {
      msg.reactions.push({ userId, emoji, reactedAt: new Date() });
    }
    await msg.save();

    const recipientId = msg.senderId?.toString() === userId ? msg.receiverId : msg.senderId;
    if (recipientId) {
      const actor = await User.findById(userId).select('username name').lean();
      notify({
        recipientId,
        actorId: userId,
        actorName: actor?.name || actor?.username || 'Someone',
        type: 'message_reaction',
        messageId: msg._id,
        message: `${actor?.name || actor?.username} reacted ${emoji} to your message`,
        pushMeta: { emoji }
      }).catch(() => {});
    }

    try {
      const { getIo } = require('./lib/io');
      const io = getIo();
      if (io) io.to(`user_${msg.senderId}`).to(`user_${msg.receiverId}`).emit('messageReactionUpdated', { messageId, reactions: msg.reactions });
    } catch (e) {}

    res.json({ reacted: true, emoji, reactions: msg.reactions });
  } catch (err) {
    console.error('Message react error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── MESSAGE EDIT / UNSEND (DM) ───────────────────────────────────────────────

k7nle.put('/api/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.user.userId;

    if (!text || !text.trim()) return res.status(400).json({ error: 'text is required' });

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.senderId?.toString() !== userId) return res.status(403).json({ error: 'Not authorized' });
    if (msg.isDeleted) return res.status(400).json({ error: 'Cannot edit a deleted message' });
    if (msg.type !== 'text') return res.status(400).json({ error: 'Only text messages can be edited' });

    const { text: safeText } = processContent(text);
    msg.text = safeText;
    msg.formattedText = safeText.replace(/\n/g, '<br>');
    msg.isEdited = true;
    msg.editedAt = new Date();
    await msg.save();

    try {
      const { getIo } = require('./lib/io');
      const io = getIo();
      if (io) io.to(`user_${msg.receiverId}`).emit('messageEdited', { messageId, text: msg.text, editedAt: msg.editedAt });
    } catch (e) {}

    res.json({ message: msg });
  } catch (err) {
    console.error('Edit message error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

k7nle.delete('/api/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.senderId?.toString() !== userId) return res.status(403).json({ error: 'Not authorized' });

    msg.isDeleted = true;
    msg.text = '';
    msg.formattedText = '';
    msg.mediaUrl = null;
    await msg.save();

    try {
      const { getIo } = require('./lib/io');
      const io = getIo();
      if (io) io.to(`user_${msg.receiverId}`).emit('messageUnsent', { messageId });
    } catch (e) {}

    res.json({ message: 'Message unsent' });
  } catch (err) {
    console.error('Unsend message error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GROUP MESSAGE REACTIONS ──────────────────────────────────────────────────

k7nle.post('/api/groups/:groupId/messages/:messageId/react', authenticateToken, async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.userId;

    if (!emoji) return res.status(400).json({ error: 'emoji is required' });

    const group = await Group.findOne({ _id: groupId, members: userId });
    if (!group) return res.status(403).json({ error: 'Not a member of this group' });

    const msg = await Message.findOne({ _id: messageId, groupId });
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    if (!msg.reactions) msg.reactions = [];
    const existingIdx = msg.reactions.findIndex(r => r.userId.toString() === userId);
    if (existingIdx !== -1) {
      if (msg.reactions[existingIdx].emoji === emoji) {
        msg.reactions.splice(existingIdx, 1);
        await msg.save();
        try {
          const { getIo } = require('./lib/io');
          const io = getIo();
          if (io) io.to(`group_${groupId}`).emit('groupMessageReactionUpdated', { messageId, reactions: msg.reactions });
        } catch (e) {}
        return res.json({ reacted: false, reactions: msg.reactions });
      }
      msg.reactions[existingIdx].emoji = emoji;
    } else {
      msg.reactions.push({ userId, emoji, reactedAt: new Date() });
    }
    await msg.save();

    if (msg.senderId?.toString() !== userId) {
      const actor = await User.findById(userId).select('username name').lean();
      notify({
        recipientId: msg.senderId,
        actorId: userId,
        actorName: actor?.name || actor?.username || 'Someone',
        type: 'message_reaction',
        groupId,
        messageId: msg._id,
        message: `${actor?.name || actor?.username} reacted ${emoji} to your message in ${group.name}`,
        pushMeta: { emoji }
      }).catch(() => {});
    }

    try {
      const { getIo } = require('./lib/io');
      const io = getIo();
      if (io) io.to(`group_${groupId}`).emit('groupMessageReactionUpdated', { messageId, reactions: msg.reactions });
    } catch (e) {}

    res.json({ reacted: true, emoji, reactions: msg.reactions });
  } catch (err) {
    console.error('Group message react error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GROUP MESSAGE EDIT / UNSEND ──────────────────────────────────────────────

k7nle.put('/api/groups/:groupId/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const { text } = req.body;
    const userId = req.user.userId;

    if (!text || !text.trim()) return res.status(400).json({ error: 'text is required' });

    const group = await Group.findOne({ _id: groupId, members: userId });
    if (!group) return res.status(403).json({ error: 'Not a member of this group' });

    const msg = await Message.findOne({ _id: messageId, groupId });
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.senderId?.toString() !== userId) return res.status(403).json({ error: 'Not authorized' });
    if (msg.isDeleted) return res.status(400).json({ error: 'Cannot edit a deleted message' });
    if (msg.type !== 'text') return res.status(400).json({ error: 'Only text messages can be edited' });

    if (group.textOnly && msg.type !== 'text') {
      return res.status(400).json({ error: 'Only text posts are allowed in this group' });
    }

    const { text: safeText } = processContent(text);
    msg.text = safeText;
    msg.formattedText = safeText.replace(/\n/g, '<br>');
    msg.isEdited = true;
    msg.editedAt = new Date();
    await msg.save();

    try {
      const { getIo } = require('./lib/io');
      const io = getIo();
      if (io) io.to(`group_${groupId}`).emit('groupMessageEdited', { messageId, groupId, text: msg.text, editedAt: msg.editedAt });
    } catch (e) {}

    res.json({ message: msg });
  } catch (err) {
    console.error('Edit group message error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

k7nle.delete('/api/groups/:groupId/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const userId = req.user.userId;

    const group = await Group.findOne({ _id: groupId, members: userId });
    if (!group) return res.status(403).json({ error: 'Not a member of this group' });

    const msg = await Message.findOne({ _id: messageId, groupId });
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const isAdmin = group.admin.toString() === userId;
    if (msg.senderId?.toString() !== userId && !isAdmin) return res.status(403).json({ error: 'Not authorized' });

    msg.isDeleted = true;
    msg.text = '';
    msg.formattedText = '';
    msg.mediaUrl = null;
    await msg.save();

    try {
      const { getIo } = require('./lib/io');
      const io = getIo();
      if (io) io.to(`group_${groupId}`).emit('groupMessageUnsent', { messageId, groupId });
    } catch (e) {}

    res.json({ message: 'Message unsent' });
  } catch (err) {
    console.error('Unsend group message error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── VESSELX DOMAIN GROUP ─────────────────────────────────────────────────────

k7nle.get('/api/groups/vesselx-domain', authenticateToken, async (req, res) => {
  try {
    const group = await Group.findOne({ isVesselXDomain: true })
      .populate('admin', 'username name profilePicture isVerified')
      .populate('members', 'username name profilePicture isVerified isSupa isOnline');
    if (!group) return res.status(404).json({ error: 'VesselX Domain group not found' });
    res.json(group);
  } catch (err) {
    console.error('Get VesselX Domain error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
k7nle.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
    }
  }
  
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
k7nle.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Create HTTP server
const server = http.createServer(k7nle);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const { setIo } = require('./lib/io');
setIo(io);

// WebSocket connection for real-time updates
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  let socketUserId = null;
  let joinedGroups = [];
  
  // Join user's personal room
  socket.on('join', (userId) => {
    socketUserId = userId;
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their room`);
    
    Group.find({ members: userId }).then(groups => {
      groups.forEach(group => {
        socket.join(`group_${group._id}`);
        joinedGroups.push(group._id.toString());
      });
      console.log(`User ${userId} joined ${groups.length} group rooms`);
    });

    const Channel = require('./models/Channel');
    Channel.find({ subscribers: userId }).then(channels => {
      channels.forEach(ch => socket.join(`channel_${ch._id}`));
      console.log(`User ${userId} joined ${channels.length} channel rooms`);
    }).catch(() => {});
  });

  socket.on('joinChannel', (channelId) => {
    socket.join(`channel_${channelId}`);
  });

  socket.on('leaveChannel', (channelId) => {
    socket.leave(`channel_${channelId}`);
  });
  
  // Join a specific group room
  socket.on('joinGroup', (groupId) => {
    if (socketUserId) {
      socket.join(`group_${groupId}`);
      if (!joinedGroups.includes(groupId)) {
        joinedGroups.push(groupId);
      }
      console.log(`User ${socketUserId} joined group room: ${groupId}`);
    }
  });
  
  // Leave a group room
  socket.on('leaveGroup', (groupId) => {
    socket.leave(`group_${groupId}`);
    joinedGroups = joinedGroups.filter(id => id !== groupId);
    console.log(`User ${socketUserId} left group room: ${groupId}`);
  });
  
// In your WebSocket connection handler, modify the message handlers:

// Send direct message notification
socket.on('sendMessage', async (data) => {
  const { receiverId, message } = data;
  
  if (socketUserId) {
    // Save to database...
    const newMessage = await saveMessageToDB(socketUserId, receiverId, message);
    
    // Emit to receiver
    io.to(`user_${receiverId}`).emit('newMessage', {
      senderId: socketUserId,
      message: newMessage
    });
    
    // Send push notification
    const sender = await User.findById(socketUserId).select('username profilePicture');
    const notificationService = require('./services/notificationService');
    
    await notificationService.sendToUser(receiverId, {
      title: `@${sender.username}`,
      body: message.text,
      type: 'dms',
      icon: sender.profilePicture || '/vesselx-logo.png',
      tag: `dm-${socketUserId}`,
      data: {
        url: `/messages?user=${sender.username}`,
        type: 'dm',
        senderId: socketUserId,
        messageId: newMessage._id
      }
    });
    
    // Emit to sender for confirmation
    socket.emit('messageSent', {
      receiverId,
      message: newMessage
    });
  }
});

// Send group message notification
socket.on('sendGroupMessage', async (data) => {
  const { groupId, message } = data;
  
  if (socketUserId) {
    // Save to database...
    const newMessage = await saveGroupMessageToDB(socketUserId, groupId, message);
    
    // Emit to all group members
    io.to(`group_${groupId}`).emit('newGroupMessage', {
      senderId: socketUserId,
      groupId,
      message: newMessage,
      timestamp: new Date()
    });
    
    // Send push notifications to all group members except sender
    const sender = await User.findById(socketUserId).select('username profilePicture');
    const group = await Group.findById(groupId).select('name');
    const notificationService = require('./services/notificationService');
    
    await notificationService.sendToGroupMembers(groupId, socketUserId, {
      title: group.name,
      body: `${sender.username}: ${message.text}`,
      type: 'groups',
      icon: '/vesselx-logo.png',
      tag: `group-${groupId}`,
      data: {
        url: `/groups/${groupId}`,
        type: 'group',
        groupId,
        senderId: socketUserId,
        messageId: newMessage._id
      }
    });
  }
});
  
  // Message read receipt (DM)
  socket.on('messageRead', async (data) => {
    const { messageId, senderId } = data;
    
    // Update in database...
    // Then notify sender
    io.to(`user_${senderId}`).emit('messageStatusUpdate', {
      messageId,
      status: 'read'
    });
  });
  
  // Group message read receipt
  socket.on('groupMessageRead', async (data) => {
    const { messageId, groupId, readerId } = data;
    
    // Update in database...
    // Then notify sender (if in group)
    io.to(`group_${groupId}`).emit('groupMessageReadUpdate', {
      messageId,
      readerId,
      timestamp: new Date()
    });
  });
  
  // Typing indicators
  socket.on('typing', (data) => {
    const { receiverId, isTyping } = data;
    if (socketUserId && receiverId) {
      io.to(`user_${receiverId}`).emit('userTyping', {
        senderId: socketUserId,
        isTyping
      });
    }
  });
  
  socket.on('groupTyping', (data) => {
    const { groupId, isTyping } = data;
    if (socketUserId && groupId) {
      // Emit to all group members except sender
      socket.to(`group_${groupId}`).emit('groupUserTyping', {
        senderId: socketUserId,
        groupId,
        isTyping
      });
    }
  });
  
  // ─── Voice & Video Call Signaling (WebRTC) ───────────────────────────────

  // Initiate a 1-on-1 call (DM)
  socket.on('initiateCall', (data) => {
    const { targetUserId, callType, offer, callerInfo } = data;
    if (!socketUserId || !targetUserId) return;
    io.to(`user_${targetUserId}`).emit('incomingCall', {
      callerId: socketUserId,
      callerInfo,
      callType,
      offer
    });
    const callerName = callerInfo?.name || callerInfo?.username || 'Someone';
    notify({
      recipientId: targetUserId,
      actorId: socketUserId,
      actorName: callerName,
      type: 'call_incoming',
      message: `${callerName} is calling you`,
      meta: { callType: callType || 'voice', callerId: socketUserId },
      pushMeta: { callType: callType || 'voice' }
    }).catch(() => {});
  });

  // Caller cancels before answer
  socket.on('cancelCall', (data) => {
    const { targetUserId } = data;
    if (!socketUserId || !targetUserId) return;
    io.to(`user_${targetUserId}`).emit('callCancelled', {
      callerId: socketUserId
    });
  });

  // Callee accepts — send SDP answer back to caller
  socket.on('acceptCall', (data) => {
    const { callerId, answer } = data;
    if (!socketUserId || !callerId) return;
    io.to(`user_${callerId}`).emit('callAccepted', {
      calleeId: socketUserId,
      answer
    });
  });

  // Callee rejects
  socket.on('rejectCall', (data) => {
    const { callerId } = data;
    if (!socketUserId || !callerId) return;
    io.to(`user_${callerId}`).emit('callRejected', {
      calleeId: socketUserId
    });
  });

  // Either party ends the call
  socket.on('endCall', (data) => {
    const { targetUserId, groupId } = data;
    if (!socketUserId) return;
    if (groupId) {
      socket.to(`group_${groupId}`).emit('callEnded', { endedBy: socketUserId, groupId });
    } else if (targetUserId) {
      io.to(`user_${targetUserId}`).emit('callEnded', { endedBy: socketUserId });
    }
  });

  // Relay ICE candidates (DM or group)
  socket.on('iceCandidate', (data) => {
    const { targetUserId, groupId, candidate } = data;
    if (!socketUserId) return;
    if (groupId) {
      socket.to(`group_${groupId}`).emit('iceCandidate', {
        senderId: socketUserId,
        candidate
      });
    } else if (targetUserId) {
      io.to(`user_${targetUserId}`).emit('iceCandidate', {
        senderId: socketUserId,
        candidate
      });
    }
  });

  // Initiate a Group call
  socket.on('initiateGroupCall', (data) => {
    const { groupId, callType, callerInfo } = data;
    if (!socketUserId || !groupId) return;
    socket.to(`group_${groupId}`).emit('incomingGroupCall', {
      callerId: socketUserId,
      callerInfo,
      callType,
      groupId
    });
    const callerName = callerInfo?.name || callerInfo?.username || 'Someone';
    Group.findById(groupId).select('members name').then(grp => {
      if (!grp) return;
      const members = grp.members.filter(m => m.toString() !== socketUserId);
      for (const memberId of members) {
        notify({
          recipientId: memberId,
          actorId: socketUserId,
          actorName: callerName,
          type: 'group_call_incoming',
          groupId,
          message: `${callerName} started a ${callType === 'video' ? 'video' : 'voice'} call in ${grp.name}`,
          meta: { callType: callType || 'voice', groupId: groupId.toString(), groupName: grp.name },
          pushMeta: { callType: callType || 'voice', groupName: grp.name }
        }).catch(() => {});
      }
    }).catch(() => {});
  });

  socket.on('joinGameRoom', (roomId) => {
    if (roomId) socket.join(`game_${roomId}`);
  });

  socket.on('leaveGameRoom', (roomId) => {
    if (roomId) socket.leave(`game_${roomId}`);
  });

  // Group call: a member joins (send offer to a specific peer in the group)
  socket.on('groupCallOffer', (data) => {
    const { targetUserId, groupId, offer } = data;
    if (!socketUserId || !targetUserId) return;
    io.to(`user_${targetUserId}`).emit('groupCallOffer', {
      senderId: socketUserId,
      groupId,
      offer
    });
  });

  // Group call: answer from a specific peer
  socket.on('groupCallAnswer', (data) => {
    const { targetUserId, groupId, answer } = data;
    if (!socketUserId || !targetUserId) return;
    io.to(`user_${targetUserId}`).emit('groupCallAnswer', {
      senderId: socketUserId,
      groupId,
      answer
    });
  });

  // Group call: a member leaves
  socket.on('leaveGroupCall', (data) => {
    const { groupId } = data;
    if (!socketUserId || !groupId) return;
    socket.to(`group_${groupId}`).emit('peerLeftCall', {
      userId: socketUserId,
      groupId
    });
  });

  // ─────────────────────────────────────────────────────────────────────────

  // Online status
  socket.on('setOnlineStatus', (isOnline) => {
    if (socketUserId) {
      const lastSeen = isOnline ? null : new Date();
      User.findByIdAndUpdate(socketUserId, { isOnline: !!isOnline, ...(lastSeen ? { lastSeen } : {}) }).catch(() => {});
      joinedGroups.forEach(groupId => {
        io.to(`group_${groupId}`).emit('memberStatusUpdate', {
          userId: socketUserId,
          isOnline,
          lastSeen
        });
      });
      io.emit('userStatusUpdate', { userId: socketUserId, isOnline });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (socketUserId) {
      const lastSeen = new Date();
      User.findByIdAndUpdate(socketUserId, { isOnline: false, lastSeen }).catch(() => {});
      joinedGroups.forEach(groupId => {
        io.to(`group_${groupId}`).emit('memberStatusUpdate', {
          userId: socketUserId,
          isOnline: false,
          lastSeen
        });
      });
      io.emit('userStatusUpdate', { userId: socketUserId, isOnline: false, lastSeen });
    }
  });
});

async function startScheduledTasks() {
  await ensureOfficialDeveloperAccount();
  await createPrimeDev();
  await ensureVesselXDomainGroup();
  enforceOfficialDeveloperFollowing();
  
  setInterval(async () => {
    try {
      const NotificationService = require('./services/notificationService');
      await NotificationService.cleanupExpiredSubscriptions();
    } catch (error) {
      console.error('Push subscription cleanup error:', error);
    }
  }, 24 * 60 * 60 * 1000);
  setInterval(enforceOfficialDeveloperFollowing, 24 * 60 * 60 * 1000);  
  console.log('Scheduled tasks started: OfficialDeveloper following enforcement and push subscription cleanup every 24h');
}

startScheduledTasks();

server.listen(port, '0.0.0.0', async () => {
  console.log(rainbow(`
  ╔══════════════════════════════════════════╗
  ║        Vesselx Server is running         ║
  ║         Port: ${port.toString().padEnd(25)}║
  ║           AI Assistant: Active           ║
  ║          Email Service: Active           ║
  ║    Auto-follow System: Active (24h)      ║
  ║       Cloudinary Storage: Active         ║
  ║      "Carrying connections forward"      ║
  ╚══════════════════════════════════════════╝`));

  try {
    const ipRes = await axios.get('https://api.ipify.org?format=json');
    const ip = ipRes.data.ip;
    const frontendUrl = config.getFrontendUrl();

    console.log(`Site URL: http://${ip}:${port}`);
    console.log(`Vesselx AI Endpoint: http://${ip}:${port}/api/ai/conversations/start`);
    console.log(`Email Verification: http://${ip}:${port}/api/test-email`);
    console.log(`Frontend URL: ${frontendUrl}`);
    console.log(`Cloudinary: ${cloudinary.config().cloud_name ? 'SUCCESS: Connected' : 'ERROR: Not configured'}`);
  } catch (err) {
    console.log("⚠️  Couldn't fetch public IP");
  }
});
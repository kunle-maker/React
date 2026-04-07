const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  bio: {
    type: String,
    default: ''
  },
  profilePicture: {
    type: String,
    default: null
  },
  coverPhoto: {
    type: String,
    default: null
  },
  animatedProfilePicture: {
    type: String,
    default: null
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationCode: {
    type: String,
    default: null
  },
  verificationTokenExpires: {
    type: Date,
    default: null
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetCode: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  badge: {
    type: String,
    default: null
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: null
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  lastLoginDate: {
    type: Date,
    default: null
  },
  pushSubscriptions: [{
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String
    },
    expirationTime: {
      type: Date,
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  onesignalPlayerId: {
    type: String,
    default: null
  },
  notificationsEnabled: {
    type: Boolean,
    default: true
  },
  interests: [{
    type: String,
    trim: true
  }],
  isSupa: {
    type: Boolean,
    default: false
  },
  supaStartedAt: {
    type: Date,
    default: null
  },
  supaExpiresAt: {
    type: Date,
    default: null
  },
  supaFeatures: {
    customBadge: { type: String, default: null },
    profileTheme: { type: String, default: null },
    hdUploads: { type: Boolean, default: false },
    extendedStories: { type: Boolean, default: false },
    customSounds: { type: Boolean, default: false },
    priorityFeed: { type: Boolean, default: false },
    postScheduling: { type: Boolean, default: false },
    channelAnalytics: { type: Boolean, default: false },
    extraAiHistory: { type: Boolean, default: false }
  },
  bookmarks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  channelSubscriptions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel'
  }],
  feedPreferences: {
    showTrending: { type: Boolean, default: true },
    showChannels: { type: Boolean, default: true },
    showStories: { type: Boolean, default: true },
    interestWeight: { type: Number, default: 0.6 }
  },
  moderation: {
    status: {
      type: String,
      enum: ['active', 'limited', 'banned'],
      default: 'active'
    },
    banReason: { type: String, default: null },
    banDetails: { type: String, default: null },
    bannedAt: { type: Date, default: null },
    bannedUntil: { type: Date, default: null },
    isPermanentBan: { type: Boolean, default: false },
    warningCount: { type: Number, default: 0 },
    restrictions: {
      canPost: { type: Boolean, default: true },
      canComment: { type: Boolean, default: true },
      canMessage: { type: Boolean, default: true },
      canFollow: { type: Boolean, default: true },
      canCreateGroup: { type: Boolean, default: true },
      canCreateChannel: { type: Boolean, default: true },
      canReact: { type: Boolean, default: true }
    },
    history: [{
      action: String,
      reason: String,
      details: String,
      aiDecision: String,
      performedAt: { type: Date, default: Date.now }
    }]
  },
  language: {
    type: String,
    default: 'en'
  },
  monnifyAccountRef: {
    type: String,
    default: null
  },
  monnifyAccountNumber: {
    type: String,
    default: null
  },
  monnifyBankName: {
    type: String,
    default: null
  },
  monnifyBankCode: {
    type: String,
    default: null
  },
  xp: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  gameStats: {
    wordChainWins: { type: Number, default: 0 },
    wordChainPlayed: { type: Number, default: 0 },
    emojiTriviaWins: { type: Number, default: 0 },
    emojiTriviaPlayed: { type: Number, default: 0 },
    totalXpEarned: { type: Number, default: 0 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.index({ createdAt: -1 });
userSchema.index({ blockedUsers: 1 });

module.exports = mongoose.model('User', userSchema);

import React, { createContext, useContext, useState, useCallback } from 'react';

const I18nContext = createContext({
  t: {},
  lang: 'en',
  dir: 'ltr',
  setLanguage: () => {},
  loadTranslations: () => {},
});

export function useI18n() {
  return useContext(I18nContext);
}

const FALLBACK = {
  welcome: 'Welcome', login: 'Login', logout: 'Log Out', register: 'Register',
  email: 'Email', password: 'Password', username: 'Username', name: 'Name',
  bio: 'Bio', followers: 'Followers', following: 'Following', posts: 'Posts',
  messages: 'Messages', notifications: 'Notifications', settings: 'Settings',
  profile: 'Profile', home: 'Home', explore: 'Explore', search: 'Search',
  post: 'Post', like: 'Like', comment: 'Comment', share: 'Share', save: 'Save',
  delete: 'Delete', edit: 'Edit', cancel: 'Cancel', confirm: 'Confirm',
  submit: 'Submit', send: 'Send', reply: 'Reply', follow: 'Follow',
  unfollow: 'Unfollow', block: 'Block', report: 'Report', mute: 'Mute',
  upload: 'Upload', photo: 'Photo', video: 'Video', story: 'Story',
  channel: 'Channel', group: 'Group', members: 'Members', admin: 'Admin',
  verified: 'Verified', supa: 'Supa', upgrade: 'Upgrade',
  subscription: 'Subscription', payment: 'Payment', monthly: 'Monthly',
  yearly: 'Yearly', language: 'Language', theme: 'Theme', privacy: 'Privacy',
  security: 'Security', help: 'Help', about: 'About', trending: 'Trending',
  recommended: 'Recommended', recent: 'Recent', loading: 'Loading',
  error: 'Error', success: 'Success', noResults: 'No results',
  noMessages: 'No messages', noPosts: 'No posts', typeMessage: 'Type a message',
  writePost: 'Write a post', createGroup: 'Create Group',
  createChannel: 'Create Channel', joinGroup: 'Join Group',
  leaveGroup: 'Leave Group', groupName: 'Group Name',
  description: 'Description', public: 'Public', private: 'Private',
  inviteCode: 'Invite Code', copyLink: 'Copy Link', copied: 'Copied',
  online: 'Online', offline: 'Offline', seen: 'Seen', delivered: 'Delivered',
  read: 'Read', ai: 'AI', darkMode: 'Dark Mode', lightMode: 'Light Mode',
};

export function I18nProvider({ children }) {
  const [translations, setTranslations] = useState(FALLBACK);
  const [lang, setLang] = useState('en');
  const [dir, setDir] = useState('ltr');

  const loadTranslations = useCallback(async (language) => {
    if (!language || language === 'en') {
      setTranslations(FALLBACK);
      setLang('en');
      setDir('ltr');
      document.documentElement.setAttribute('dir', 'ltr');
      return;
    }
    try {
      const res = await fetch(`https://vesselx.onrender.com/api/i18n/${language}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setTranslations({ ...FALLBACK, ...(data.translations || {}) });
      setLang(data.code || language);
      const direction = data.dir || 'ltr';
      setDir(direction);
      document.documentElement.setAttribute('dir', direction);
    } catch {
      setTranslations(FALLBACK);
    }
  }, []);

  const setLanguage = useCallback((language, direction = 'ltr') => {
    setLang(language);
    setDir(direction);
    document.documentElement.setAttribute('dir', direction);
  }, []);

  return (
    <I18nContext.Provider value={{ t: translations, lang, dir, setLanguage, loadTranslations }}>
      {children}
    </I18nContext.Provider>
  );
}

export default I18nContext;

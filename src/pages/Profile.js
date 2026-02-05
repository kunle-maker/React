import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import API from '../utils/api';
import { FiSettings, FiGrid, FiBookmark, FiUserCheck, FiUserPlus, FiMoreHorizontal } from 'react-icons/fi';

const Profile = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('posts');

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(userData);
    fetchProfile();
    fetchPosts();
  }, [username]);

  const fetchProfile = async () => {
    try {
      const data = await API.getUser(username);
      setProfile(data.user);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const data = await API.request(`/api/users/${username}/posts`);
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      await API.followUser(username);
      fetchProfile();
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  if (!profile && isLoading) {
    return (
      <div className="loading-page">
        <span className="loading-spinner"></span>
      </div>
    );
  }

  const isOwnProfile = currentUser?.username === username || currentUser?._id === profile?._id;

  return (
    <div className="profile-page">
      <Navbar user={currentUser} />
      
      <main className="main-content">
        <header className="profile-header">
          <div className="profile-avatar">
            <img 
              src={profile?.profilePicture || '/default-avatar.png'} 
              alt={profile?.username} 
              className="profile-avatar-img"
            />
          </div>
          
          <div className="profile-info">
            <div className="profile-header-row">
              <h2 className="profile-username">{profile?.username}</h2>
              {isOwnProfile ? (
                <>
                  <Link to="/settings" className="btn btn-secondary">Edit Profile</Link>
                  <FiSettings size={24} className="cursor-pointer" />
                </>
              ) : (
                <div className="profile-actions">
                  <button 
                    className={`btn ${profile?.isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={handleFollow}
                  >
                    {profile?.isFollowing ? (
                      <><FiUserCheck className="mr-2" /> Following</>
                    ) : (
                      <><FiUserPlus className="mr-2" /> Follow</>
                    )}
                  </button>
                  <button className="btn btn-secondary">Message</button>
                  <FiMoreHorizontal size={24} className="cursor-pointer" />
                </div>
              )}
            </div>
            
            <div className="profile-stats">
              <div className="stat-item"><strong>{posts.length}</strong> posts</div>
              <div className="stat-item"><strong>{profile?.followers?.length || profile?.followersCount || 0}</strong> followers</div>
              <div className="stat-item"><strong>{profile?.following?.length || profile?.followingCount || 0}</strong> following</div>
            </div>
            
            <div className="profile-bio-container">
              <h1 className="profile-full-name">{profile?.name}</h1>
              <p className="profile-bio">{profile?.bio}</p>
            </div>
          </div>
        </header>
        
        <div className="profile-tabs">
          <button 
            className={`profile-tab ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            <FiGrid size={12} className="mr-2" /> POSTS
          </button>
          {isOwnProfile && (
            <button 
              className={`profile-tab ${activeTab === 'saved' ? 'active' : ''}`}
              onClick={() => setActiveTab('saved')}
            >
              <FiBookmark size={12} className="mr-2" /> SAVED
            </button>
          )}
        </div>
        
        <div className="profile-posts-grid">
          {posts.map(post => (
            <div key={post._id} className="grid-post-item">
              {post.media && post.media[0]?.type === 'video' ? (
                <video src={post.media[0].url} />
              ) : (
                <img src={post.media?.[0]?.url} alt="post" />
              )}
              <div className="grid-post-overlay">
                <div className="overlay-stat">❤️ {post.likes?.length || post.likesCount || 0}</div>
                <div className="overlay-stat">💬 {post.comments?.length || post.commentsCount || 0}</div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Profile;
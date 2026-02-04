import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import { FiGrid, FiBookmark, FiUserPlus, FiSettings, FiEdit3 } from 'react-icons/fi';

const Profile = () => {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(userData);
    fetchProfile();
    fetchPosts();
  }, [username]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`https://vesselx.onrender.com/api/users/${username}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://vesselx.onrender.com/api/users/${username}/posts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      const response = await fetch(`https://vesselx.onrender.com/api/users/${username}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        setIsFollowing(!isFollowing);
        fetchProfile();
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  if (isLoading) {
    return (
      <>
        <Navbar user={currentUser} />
        <div className="loading-page">
          <span className="loading-spinner"></span>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar user={currentUser} />
      
      <main className="main-content">
        <div className="profile-header">
          <div className="profile-avatar">
            <img 
              src={user?.profilePicture || '/default-avatar.png'} 
              alt={user?.username}
              className="profile-avatar-img"
            />
          </div>
          
          <div className="profile-info">
            <div className="profile-header-row">
              <h1 className="profile-username">{user?.username}</h1>
              
              {user?._id === currentUser?._id ? (
                <>
                  <button className="btn btn-secondary profile-edit-btn">
                    <FiEdit3 size={16} />
                    Edit Profile
                  </button>
                  <button className="btn btn-secondary">
                    <FiSettings size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className={`btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={handleFollow}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <button className="btn btn-secondary">Message</button>
                </>
              )}
            </div>
            
            <div className="profile-stats">
              <div className="profile-stat">
                <strong>{posts.length}</strong>
                <span>posts</span>
              </div>
              <div className="profile-stat">
                <strong>{user?.followers?.length || 0}</strong>
                <span>followers</span>
              </div>
              <div className="profile-stat">
                <strong>{user?.following?.length || 0}</strong>
                <span>following</span>
              </div>
            </div>
            
            <div className="profile-bio">
              <h2>{user?.name}</h2>
              <p>{user?.bio || 'No bio yet.'}</p>
            </div>
          </div>
        </div>

        <div className="profile-tabs">
          <button 
            className={`profile-tab ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            <FiGrid size={20} />
            <span>Posts</span>
          </button>
          
          <button 
            className={`profile-tab ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            <FiBookmark size={20} />
            <span>Saved</span>
          </button>
        </div>

        <div className="profile-content">
          {activeTab === 'posts' && (
            <div className="posts-grid">
              {posts.map((post) => (
                <div key={post._id} className="post-grid-item">
                  <img src={post.media?.[0]?.url} alt="Post" />
                  <div className="post-grid-overlay">
                    <span>❤️ {post.likes?.length || 0}</span>
                    <span>💬 {post.comments?.length || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default Profile;
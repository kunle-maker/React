import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom'; // Add useNavigate
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import { FiSettings, FiGrid, FiUserCheck, FiUserPlus, FiMoreHorizontal, FiX, FiUsers, FiMessageCircle } from 'react-icons/fi';
import API from '../utils/api';

const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate(); // Add navigate
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showFollowList, setShowFollowList] = useState(null);
  const [followListData, setFollowListData] = useState([]);
  const [isFollowListLoading, setIsFollowListLoading] = useState(false);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(userData);
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const profileData = await API.getUser(username);
        console.log('Profile Data:', profileData);
        setProfile(profileData.user || profileData);
        try {
          const postsData = await API.request(`/api/users/${username}/posts`);
          console.log('Posts Data:', postsData);
          const postsArray = postsData.posts || postsData || [];
          const processedPosts = postsArray.map(post => ({
            ...post,
            user: post.userId || post.user || {
              username: username,
              name: profileData.user?.name || username,
              profilePicture: profileData.user?.profilePicture || `/api/media/${profileData.user?.profilePicture}` || '/default-avatar.png'
            },
            media: post.media || [],
            likesCount: post.likesCount || post.likes?.length || 0,
            commentsCount: post.commentsCount || post.comments?.length || 0
          }));
          
          setPosts(processedPosts);
        } catch (postError) {
          console.error('Error fetching posts:', postError);
          setPosts([]);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setProfile({
          username: username,
          name: username,
          followers: [],
          following: [],
          followersCount: 0,
          followingCount: 0
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [username]);

  const getProfilePicture = () => {
    if (!profile?.profilePicture) return '/default-avatar.png';
    if (profile.profilePicture.startsWith('http')) return profile.profilePicture;
    return `https://vesselx.onrender.com/api/media/${profile.profilePicture}`;
  };

  const handleFollow = async () => {
    try {
      const data = await API.followUser(username);
      setProfile(prev => ({
        ...prev,
        isFollowing: !prev.isFollowing,
        followersCount: data.followersCount !== undefined ? data.followersCount : (prev.isFollowing ? prev.followersCount - 1 : prev.followersCount + 1)
      }));
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleMessage = () => {
    navigate(`/messages?user=${username}`);
  };

  const openFollowList = async (type) => {
    setShowFollowList(type);
    setIsFollowListLoading(true);
    try {
      const data = type === 'followers' 
        ? await API.getFollowers(username)
        : await API.getFollowing(username);
      setFollowListData(data.users || data || []);
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      setFollowListData([]);
    } finally {
      setIsFollowListLoading(false);
    }
  };

  // Function to cache post data when navigating to full view
  const handlePostClick = (post) => {
    sessionStorage.setItem(`post_${post._id}`, JSON.stringify(post));
    navigate(`/post/${post._id}`);
  };

  if (isLoading) {
    return (
      <div className="loading-page">
        <span className="loading-spinner"></span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="error-page">
        <h2>User not found</h2>
      </div>
    );
  }

  const isOwnProfile = currentUser?.username === username || currentUser?._id === profile?._id;

  return (
    <div className="profile-page">
      <Navbar user={currentUser} />
      
      <main className="main-content">
        <div className="profile-container">
          {/* Profile Header */}
          <div className="profile-header">
            <div className="profile-avatar-section">
              <div className="profile-avatar-wrapper">
                <img 
                  src={getProfilePicture()} 
                  alt={profile.username} 
                  className="profile-avatar-img"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${profile.username}&background=random`;
                  }}
                />
              </div>
            </div>
            
            <div className="profile-info-section">
              <div className="profile-info-header">
                <h2 className="profile-username">{profile.username}</h2>
                
                {isOwnProfile ? (
                  <div className="profile-actions">
                    <Link to="/settings" className="btn btn-secondary">
                      Edit Profile
                    </Link>
                    <button className="btn-icon">
                      <FiSettings size={24} />
                    </button>
                  </div>
                ) : (
                  <div className="profile-actions">
                    <button 
                      className={`btn ${profile?.isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={handleFollow}
                    >
                      {profile?.isFollowing ? (
                        <>
                          <FiUserCheck className="mr-2" /> Following
                        </>
                      ) : (
                        <>
                          <FiUserPlus className="mr-2" /> Follow
                        </>
                      )}
                    </button>
                    <button className="btn btn-secondary" onClick={handleMessage}>
                      Message
                    </button>
                    <button className="btn-icon">
                      <FiMoreHorizontal size={24} />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="profile-stats">
                <div className="stat-item">
                  <strong>{posts.length}</strong>
                  <span>posts</span>
                </div>
                <div className="stat-item clickable" onClick={() => openFollowList('followers')}>
                  <strong>{profile.followersCount || profile.followers?.length || 0}</strong>
                  <span>followers</span>
                </div>
                <div className="stat-item clickable" onClick={() => openFollowList('following')}>
                  <strong>{profile.followingCount || profile.following?.length || 0}</strong>
                  <span>following</span>
                </div>
              </div>
              
              <div className="profile-bio-section">
                <h1 className="profile-name">{profile.name || profile.username}</h1>
                {profile.bio && <p className="profile-bio">{profile.bio}</p>}
              </div>
            </div>
          </div>
          
          {/* Posts Grid */}
          <div className="profile-posts-container">
            {posts.length === 0 ? (
              <div className="empty-posts">
                <div className="empty-icon">📷</div>
                <h3>No Posts Yet</h3>
                {isOwnProfile ? (
                  <p>Share your first photo or video</p>
                ) : (
                  <p>@{profile.username} hasn't posted anything yet</p>
                )}
              </div>
            ) : (
              <>
                {/* Post Count */}
                <div className="posts-count-header">
                  <FiGrid size={16} />
                  <span>POSTS</span>
                  <span className="post-count-number">{posts.length}</span>
                </div>
                
                {/* Posts Grid - UPDATED WITH ONCLICK */}
                <div className="posts-grid">
                  {posts.map((post) => (
                    <div 
                      key={post._id} 
                      className="post-grid-item"
                      onClick={() => handlePostClick(post)}
                    >
                      {post.media && post.media[0]?.type === 'video' ? (
                        <div className="post-thumbnail video-thumbnail">
                          <video src={post.media[0].url} />
                          <div className="video-indicator">▶️</div>
                        </div>
                      ) : (
                        <div className="post-thumbnail">
                          <img 
                            src={post.media?.[0]?.url} 
                            alt="Post" 
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/300x300?text=Image+Not+Found';
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Post Stats Overlay */}
                      <div className="post-stats-overlay">
                        <div className="stat-item">
                          <FiUsers size={16} />
                          <span>{post.likesCount || post.likes?.length || 0}</span>
                        </div>
                        <div className="stat-item">
                          <FiMessageCircle size={16} />
                          <span>{post.commentsCount || post.comments?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Follow List Modal */}
      {showFollowList && (
        <div className="modal-overlay active" onClick={() => setShowFollowList(null)}>
          <div className="modal follow-list-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{showFollowList.charAt(0).toUpperCase() + showFollowList.slice(1)}</span>
              <button className="modal-close" onClick={() => setShowFollowList(null)}>
                <FiX size={24} />
              </button>
            </div>
            <div className="modal-content">
              {isFollowListLoading ? (
                <div className="loading-spinner" style={{ margin: '20px auto' }}></div>
              ) : followListData.length === 0 ? (
                <div className="empty-list">
                  <p>No {showFollowList} yet</p>
                </div>
              ) : (
                <div className="follow-list">
                  {followListData.map(user => (
                    <div key={user._id} className="follow-list-item">
                      <Link 
                        to={`/profile/${user.username}`} 
                        onClick={() => setShowFollowList(null)}
                        className="user-link"
                      >
                        <img 
                          src={user.profilePicture || `https://ui-avatars.com/api/?name=${user.username}&background=random`} 
                          alt={user.username}
                          className="user-avatar"
                        />
                        <div className="user-info">
                          <div className="username">@{user.username}</div>
                          <div className="name">{user.name}</div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
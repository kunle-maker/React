import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { FiSearch, FiUserPlus, FiCheck, FiPlay } from 'react-icons/fi';
import API from '../utils/api';

const Search = () => {
  const navigate = useNavigate(); 
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [postResults, setPostResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    
    // Check if there's a query in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q');
    if (q) {
      handleSearch(q);
    } else {
      handleSearch('');
    }
  }, []);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      try {
        const data = await API.searchUsers('');
        setSearchResults(data.slice(0, 20));
        setPostResults([]);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
      return;
    }

    setIsLoading(true);
    try {
      if (query.startsWith('#')) {
        const data = await API.request(`/api/posts/search?hashtag=${encodeURIComponent(query.substring(1))}`);
        setPostResults(data.posts || []);
        setSearchResults([]);
      } else {
        const data = await API.searchUsers(query);
        setSearchResults(data);
        setPostResults([]);
      }
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
      setPostResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async (userResult) => {
    try {
      const username = userResult.username;
      await API.followUser(username);
      
      // Update the followed user in results and increment/decrement followers count
      setSearchResults(prev =>
        prev.map(u => {
          if (u.username === username) {
            const isFollowing = !u.isFollowing;
            const currentFollowers = u.followers?.length || 0;
            const newFollowersCount = isFollowing ? currentFollowers + 1 : Math.max(0, currentFollowers - 1);
            
            // Mocking the followers array for UI update if backend doesn't return full object
            return { 
              ...u, 
              isFollowing: isFollowing,
              followers: isFollowing 
                ? [...(u.followers || []), user?._id] 
                : (u.followers || []).filter(id => id !== user?._id)
            };
          }
          return u;
        })
      );
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  return (
    <>
      <Navbar user={user} />
      
      <main className="main-content">
        <div className="search-page">
          <div className="search-header">
            <h1>Search</h1>
            <p>Find people and discover new connections</p>
          </div>
          
          <div className="search-box">
            <FiSearch size={20} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="search-results">
            {isLoading ? (
              <div className="loading-results">
                <span className="loading-spinner"></span>
                <p>Searching...</p>
              </div>
            ) : searchResults.length === 0 && postResults.length === 0 ? (
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <h3>No results found</h3>
                <p>Try searching for something else</p>
              </div>
            ) : (
              <>
                {searchResults.length > 0 && (
                  <>
                    <div className="results-header">
                      <h3>People</h3>
                      <span className="results-count">{searchResults.length} results</span>
                    </div>
                    
                    <div className="users-list">
                      {searchResults.map((userResult) => (
                        <div key={userResult._id} className="search-user-card">
                          <Link 
                            to={`/profile/${userResult.username}`}
                            className="user-link"
                          >
                            <img
                              src={userResult.profilePicture || '/default-avatar.png'}
                              alt={userResult.username}
                              className="user-avatar"
                            />
                            <div className="user-info">
                              <div className="user-username">@{userResult.username}</div>
                              <div className="user-name">{userResult.name}</div>
                              <div className="user-followers">
                                {userResult.followers?.length || 0} followers
                              </div>
                            </div>
                          </Link>
                          
                          <div className="user-actions">
                            {userResult._id !== user?._id && (
                              <button
                                className={`btn ${userResult.isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                                onClick={() => handleFollow(userResult)}
                              >
                                {userResult.isFollowing ? (
                                  <>
                                    <FiCheck size={16} /> Following
                                  </>
                                ) : (
                                  <>
                                    <FiUserPlus size={16} /> Follow
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {postResults.length > 0 && (
                  <>
                    <div className="results-header" style={{ marginTop: '24px' }}>
                      <h3>Posts</h3>
                      <span className="results-count">{postResults.length} results</span>
                    </div>
                    
                    <div className="posts-grid" style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                      gap: '16px',
                      padding: '16px 0'
                    }}>
                      {postResults.map((post) => (
                        <div 
                          key={post._id} 
                          className="search-post-card"
                          onClick={() => navigate(`/post/${post._id}`, { state: { post } })}
                          style={{ 
                            background: 'var(--card-bg)', 
                            borderRadius: '12px', 
                            overflow: 'hidden', 
                            cursor: 'pointer',
                            border: '1px solid var(--border-color)',
                            transition: 'transform 0.2s'
                          }}
                        >
                          {post.media && post.media[0] && (
                            <div className="post-media-preview" style={{ aspectRatio: '1/1', background: '#000', overflow: 'hidden' }}>
                              {post.media[0].type === 'video' ? (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                  <video src={post.media[0].url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '4px' }}>
                                    <FiPlay size={12} color="white" />
                                  </div>
                                </div>
                              ) : (
                                <img src={post.media[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              )}
                            </div>
                          )}
                          <div style={{ padding: '12px' }}>
                            <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>@{post.username}</div>
                            <div style={{ 
                              fontSize: '13px', 
                              color: 'var(--text-dim)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {post.caption}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default Search;
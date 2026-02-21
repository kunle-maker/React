import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { FiSearch, FiUserPlus, FiCheck } from 'react-icons/fi';
import API from '../utils/api';

const Search = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchType, setSearchType] = useState('people'); // 'people' or 'posts'
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    
    // Check if there is a query in the URL (e.g., from a hashtag click)
    const params = new URLSearchParams(window.location.search);
    const urlQuery = params.get('q');
    
    if (urlQuery) {
      handleSearch(urlQuery);
    } else {
      // Load initial suggestions
      handleSearch('');
    }
  }, [window.location.search]);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      // Get suggestions when search is empty
      try {
        const data = await API.searchUsers('');
        setSearchResults(data.slice(0, 20));
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
      return;
    }

    setIsLoading(true);
    try {
      let data;
      if (query.startsWith('#')) {
        // Search for posts with hashtag
        const response = await API.request(`/api/posts/search?q=${encodeURIComponent(query)}`);
        // The backend might return { posts: [...] } or just [...]
        data = response.posts || response;
        setSearchType('posts');
      } else {
        // Search for users
        data = await API.searchUsers(query);
        setSearchType('people');
      }
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
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
            <p>{searchType === 'posts' ? 'Discover posts and trends' : 'Find people and discover new connections'}</p>
          </div>
          
          <div className="search-box">
            <FiSearch size={20} />
            <input
              type="text"
              placeholder={searchType === 'posts' ? "Search hashtags..." : "Search users..."}
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
            ) : searchResults.length === 0 ? (
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <h3>No results found</h3>
                <p>Try searching for something else</p>
              </div>
            ) : (
              <>
                <div className="results-header">
                  <h3>{searchType === 'posts' ? 'Posts' : 'People'}</h3>
                  <span className="results-count">{searchResults.length} results</span>
                </div>
                
                {searchType === 'posts' ? (
                  <div className="posts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                    {searchResults.map((post) => (
                      <div key={post._id} className="search-post-card" onClick={() => navigate(`/post/${post._id}`, { state: { post } })} style={{ cursor: 'pointer', borderRadius: '12px', overflow: 'hidden', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                        {post.media && post.media[0] && (
                          <div style={{ aspectRatio: '1/1', overflow: 'hidden' }}>
                            {post.media[0].type === 'video' ? (
                              <video src={post.media[0].url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <img src={post.media[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                          </div>
                        )}
                        <div style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <img src={post.user?.profilePicture || '/default-avatar.png'} style={{ width: '24px', height: '24px', borderRadius: '50%' }} alt="" />
                            <span style={{ fontSize: '12px', fontWeight: '600' }}>@{post.user?.username || 'user'}</span>
                          </div>
                          <p style={{ fontSize: '14px', margin: 0, display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.caption}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
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
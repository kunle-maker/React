import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { FiSearch, FiUserPlus, FiCheck } from 'react-icons/fi';
import API from '../utils/api';

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    
    // Load initial suggestions
    handleSearch('');
  }, []);

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
      const data = await API.searchUsers(query);
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async (username) => {
    try {
      await API.followUser(username);
      // Update the followed user in results
      setSearchResults(prev =>
        prev.map(user =>
          user.username === username
            ? { ...user, isFollowing: true }
            : user
        )
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
            ) : searchResults.length === 0 ? (
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <h3>No results found</h3>
                <p>Try searching for something else</p>
              </div>
            ) : (
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
                            onClick={() => handleFollow(userResult.username)}
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
          </div>
        </div>
      </main>
    </>
  );
};

export default Search;
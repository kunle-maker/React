import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import AIAssistant from './pages/AIAssistant';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/" /> : <Login />
          } />
          <Route path="/register" element={
            isAuthenticated ? <Navigate to="/" /> : <Register />
          } />
          <Route path="/" element={
            isAuthenticated ? <Feed /> : <Navigate to="/login" />
          } />
          <Route path="/profile/:username" element={
            isAuthenticated ? <Profile /> : <Navigate to="/login" />
          } />
          <Route path="/settings" element={
            isAuthenticated ? <Settings /> : <Navigate to="/login" />
          } />
          <Route path="/ai" element={
            isAuthenticated ? <AIAssistant /> : <Navigate to="/login" />
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

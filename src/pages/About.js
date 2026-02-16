import React from 'react';

const About = () => {
  return (
    <div className="page-container" style={styles.container}>
      <div className="page-header" style={styles.header}>
        <h1>About Vesselx</h1>
      </div>
      <div className="page-content" style={styles.content}>
        <p style={styles.paragraph}>
          <strong>Vesselx</strong> is a modern social platform designed to carry connections forward. 
          Built with React, Node.js, and MongoDB, it offers a seamless experience for sharing posts, 
          messaging friends, creating groups, and even chatting with an AI assistant.
        </p>
        <p style={styles.paragraph}>
          Key features include:
        </p>
        <ul style={styles.list}>
          <li>📸 Share images and videos with Cloudinary integration</li>
          <li>💬 Real‑time direct and group messaging via Socket.IO</li>
          <li>🤖 AI Assistant powered by Groq (LLaMA 3.3)</li>
          <li>🔔 Web push notifications</li>
          <li>🌗 Dark/light theme toggle</li>
          <li>🔐 Secure authentication with email verification</li>
        </ul>
        <p style={styles.paragraph}>
          Version <strong>1.0.0</strong>
        </p>
        <p style={styles.paragraph}>
          Created by Ayokunle. Follow <a href="/profile/OfficialDeveloper">@OfficialDeveloper</a> for updates.
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '40px auto',
    padding: '20px',
    background: 'var(--card-bg)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  },
  header: {
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '15px',
    marginBottom: '20px',
  },
  content: {
    lineHeight: '1.6',
  },
  paragraph: {
    marginBottom: '15px',
  },
  list: {
    marginLeft: '20px',
    marginBottom: '15px',
  },
};

export default About;
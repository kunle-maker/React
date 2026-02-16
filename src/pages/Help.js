import React from 'react';

const Help = () => {
  return (
    <div className="page-container" style={styles.container}>
      <div className="page-header" style={styles.header}>
        <h1>Help Center</h1>
      </div>
      <div className="page-content" style={styles.content}>
        <h3 style={styles.subheader}>Frequently Asked Questions</h3>
        
        <div style={styles.faqItem}>
          <strong>How do I create a post?</strong>
          <p>On the feed page, click the "Create Post" button at the top, select images/videos, add a caption, and click "Post".</p>
        </div>
        
        <div style={styles.faqItem}>
          <strong>How do I send a message?</strong>
          <p>Go to the Messages page, search for a user, and start typing. For group messages, create or join a group.</p>
        </div>
        
        <div style={styles.faqItem}>
          <strong>What is Vesselx AI?</strong>
          <p>Vesselx AI is your personal assistant. Click the AI icon in the sidebar or go to the AI page to start a conversation.</p>
        </div>
        
        <div style={styles.faqItem}>
          <strong>How do I change my theme?</strong>
          <p>Use the theme toggle button in the sidebar to switch between dark and light mode.</p>
        </div>
        
        <div style={styles.faqItem}>
          <strong>I didn't receive a verification email. What should I do?</strong>
          <p>Check your spam folder. If it's not there, you can request a new verification email from the login page.</p>
        </div>
        
        <p style={styles.contact}>
          Still need help? Contact us at <a href="mailto:oluwagbemiga183@gmail.com">oluwagbemiga183@gmail.com</a>.
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
  subheader: {
    marginBottom: '20px',
    fontSize: '1.2rem',
  },
  faqItem: {
    marginBottom: '20px',
    padding: '15px',
    background: 'var(--bg-dark)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
  },
  contact: {
    marginTop: '30px',
    textAlign: 'center',
    fontStyle: 'italic',
  },
};

export default Help;
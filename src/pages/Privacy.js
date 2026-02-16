import React from 'react';

const Privacy = () => {
  return (
    <div className="page-container" style={styles.container}>
      <div className="page-header" style={styles.header}>
        <h1>Privacy Policy</h1>
      </div>
      <div className="page-content" style={styles.content}>
        <p><em>Last updated: February 2025</em></p>
        
        <h3 style={styles.subheader}>1. Information We Collect</h3>
        <p>We collect information you provide directly, such as when you create an account, post content, send messages, or communicate with others. This may include your name, email, username, profile picture, and any content you upload.</p>
        
        <h3 style={styles.subheader}>2. How We Use Your Information</h3>
        <p>We use your information to operate, maintain, and improve Vesselx, communicate with you, and personalize your experience. We do not sell your personal data.</p>
        
        <h3 style={styles.subheader}>3. Sharing of Information</h3>
        <p>Your profile information and posts are visible to other users according to your privacy settings. Direct messages are private between participants.</p>
        
        <h3 style={styles.subheader}>4. Data Security</h3>
        <p>We implement reasonable security measures to protect your information. However, no method of transmission over the Internet is 100% secure.</p>
        
        <h3 style={styles.subheader}>5. Your Choices</h3>
        <p>You can update your profile information, delete posts, or deactivate your account at any time.</p>
        
        <h3 style={styles.subheader}>6. Contact Us</h3>
        <p>If you have questions about this policy, contact us at <a href="mailto:oluwagbemiga183@gmail.com">oluwagbemiga183@gmail.com</a>.</p>
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
    marginTop: '20px',
    marginBottom: '10px',
  },
};

export default Privacy;
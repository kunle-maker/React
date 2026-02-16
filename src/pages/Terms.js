import React from 'react';

const Terms = () => {
  return (
    <div className="page-container" style={styles.container}>
      <div className="page-header" style={styles.header}>
        <h1>Terms of Service</h1>
      </div>
      <div className="page-content" style={styles.content}>
        <p><em>Last updated: February 2025</em></p>
        
        <h3 style={styles.subheader}>1. Acceptance of Terms</h3>
        <p>By accessing or using Vesselx, you agree to be bound by these Terms. If you do not agree, you may not use the service.</p>
        
        <h3 style={styles.subheader}>2. Eligibility</h3>
        <p>You must be at least 10 years old to use Vesselx. By using the service, you represent that you meet this requirement.</p>
        
        <h3 style={styles.subheader}>3. User Conduct</h3>
        <p>You agree not to post illegal, offensive, or harmful content. You are responsible for your interactions with others.</p>
        
        <h3 style={styles.subheader}>4. Content Ownership</h3>
        <p>You retain ownership of content you post. By posting, you grant Vesselx a license to display and distribute your content on the platform.</p>
        
        <h3 style={styles.subheader}>5. Termination</h3>
        <p>We may suspend or terminate your account for violations of these Terms or for any other reason at our discretion.</p>
        
        <h3 style={styles.subheader}>6. Disclaimer of Warranties</h3>
        <p>Vesselx is provided "as is" without warranties of any kind. We do not guarantee that the service will be uninterrupted or error-free.</p>
        
        <h3 style={styles.subheader}>7. Limitation of Liability</h3>
        <p>To the maximum extent permitted by law, Vesselx shall not be liable for any indirect, incidental, or consequential damages.</p>
        
        <h3 style={styles.subheader}>8. Changes to Terms</h3>
        <p>We may update these Terms from time to time. Continued use of the service after changes constitutes acceptance.</p>
        
        <p>For questions, contact <a href="mailto:legal@vesselx.com">legal@vesselx.com</a>.</p>
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

export default Terms;
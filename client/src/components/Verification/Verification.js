import React, { useState } from 'react';
import axios from 'axios';
import './VerifyEmail.css';

function VerifyEmail({ onClose }) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      // Adjust the URL according to your backend API endpoint
      const response = await axios.post('https://host-ss-project-test-server.vercel.app/verify', { email, verificationToken: token });
      
      // Assuming your backend sends back a message or status
      setMessage(response.data.message || 'Verification successful!');
    } catch (error) {
      console.error('Verification error:', error);
      setMessage('Invalid verification token or error occurred.');
    }
  };

  return (
    <div className="verify-email-overlay">
      <div className="verify-email-container">
        <button className="close-button" onClick={onClose}>×</button>
        <h2>Verify Email</h2>
        <form onSubmit={handleVerify} className="verify-email-form">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Enter verification code"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
          <button type="submit">Verify</button>
        </form>
        {message && <p className="verify-message">{message}</p>}
      </div>
    </div>
  );
}

export default VerifyEmail;

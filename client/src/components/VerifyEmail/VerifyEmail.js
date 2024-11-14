import React, { useState } from 'react';
import axios from 'axios';
import './VerifyEmail.css';
import { useNavigate } from 'react-router-dom';

function VerifyEmail({ onClose }) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();  // Add useNavigate hook

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!email || !token) {
      setMessage('Please enter both email and verification code.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('https://host-ss-project-test-server.vercel.app/verify', { email, verificationToken: token });
      setMessage(response.data.message || 'Email verified successfully!');

      // Redirect to sign-in page after successful verification
      setTimeout(() => {
        navigate('/verify');  // Navigate to sign-in page
      }, 2000);  // Wait 2 seconds before redirect to give user time to see the message

    } catch (error) {
      // Display specific error message
      if (error.response) {
        setMessage(error.response.data.message || 'Invalid verification token or email.');
      } else {
        setMessage('Network error. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verify-email-overlay">
      <div className="verify-email-container">
        <button className="close-button" onClick={onClose}>×</button>
        <h2>Verify Your Email</h2>
        <form onSubmit={handleVerify} className="verify-email-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="verify-input"
          />
          <input
            type="text"
            placeholder="Verification Code"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            className="verify-input"
          />
          <button type="submit" className="verify-button" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
        {message && <p className="verify-message">{message}</p>}
      </div>
    </div>
  );
}

export default VerifyEmail;

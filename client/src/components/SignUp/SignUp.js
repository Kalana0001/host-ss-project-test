import React, { useState } from 'react';
import './SignUp.css';
import background from '../../assets/bg.svg';
import avatar from '../../assets/avatar.svg';
import wave from '../../assets/wave.png';
import { ToastContainer, toast } from 'react-toastify'; 
import 'react-toastify/dist/ReactToastify.css'; 
import { useNavigate } from 'react-router-dom'; 
import axios from 'axios'; 
import validateForm from '../Validation/SignUpValidation'; 

const SignUp = () => {
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'user', // Default value
  });

  const [errors, setErrors] = useState({});
  const [dbStatus, setDbStatus] = useState(''); // To hold status of email test
  const navigate = useNavigate(); 

  const handleChange = (e) => {
    setValues({
      ...values,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      try {
        const response = await axios.post('https://host-ss-project-test-server.vercel.app/signup', values); // Updated URL

        if (response.status === 200) {
          const { token } = response.data;
          
          localStorage.setItem('token', token);
          toast.success('Signup successful!');
          
          setValues({
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            userType: 'user',
          });

          navigate('/verify');
        } else {
          setErrors({ general: 'Signup failed. Please try again.' });
        }
      } catch (error) {
        console.error('Error:', error);
        if (error.response) {
          const status = error.response.status;
          if (status === 400) setErrors({ general: 'Invalid input data.' });
          else if (status === 409) setErrors({ general: 'Email already exists.' });
          else setErrors({ general: 'An error occurred. Please try again later.' });
        } else {
          setErrors({ general: 'An error occurred. Please try again later.' });
        }
        toast.error('An error occurred. Please try again later.');
      }
    }
  };

  // Function to send a test email
  const testEmail = async () => {
    try {
      const response = await axios.post('https://host-ss-project-test-server.vercel.app/test-email', {
        email: values.email, // Send a test email to the current email value
      });

      if (response.status === 200) {
        setDbStatus('Test email sent successfully!');
        toast.success('Test email sent successfully!');
      } else {
        setDbStatus('Failed to send test email.');
        toast.error('Failed to send test email.');
      }
    } catch (error) {
      setDbStatus('Error sending test email.');
      toast.error('Error sending test email.');
    }
  };

  return (
    <div className="signup-page">
      <img className="wave" src={wave} alt="wave" />
      <div className="container">
        <div className="img">
          <h1 className="title1">SIGN UP</h1>
          <img src={background} alt="background" />
        </div>
        <div className="login-content">
          <form onSubmit={handleSubmit}>
            <img src={avatar} alt="avatar" />
            <h2 className="title">Welcome</h2>

            {errors.general && <p className="error-message">{errors.general}</p>}

            <div className="input-div one">
              <div className="i">
                <i className="fas fa-user"></i>
              </div>
              <div className="div">
                <input 
                  type="text" 
                  className="input" 
                  placeholder='Name'
                  name="name"
                  value={values.name}
                  onChange={handleChange} 
                />
                {errors.name && <p className="error-message">{errors.name}</p>}
              </div>
            </div>

            <div className="input-div one">
              <div className="i">
                <i className="fas fa-envelope"></i>
              </div>
              <div className="div">
                <input 
                  type="email" 
                  className="input" 
                  placeholder='Email'
                  name="email"
                  value={values.email}
                  onChange={handleChange} 
                />
                {errors.email && <p className="error-message">{errors.email}</p>}
              </div>
            </div>

            <div className="input-div pass">
              <div className="i">
                <i className="fas fa-lock"></i>
              </div>
              <div className="div">
                <input 
                  type="password" 
                  className="input" 
                  placeholder='Password'
                  name="password"
                  value={values.password}
                  onChange={handleChange} 
                />
                {errors.password && <p className="error-message">{errors.password}</p>}
              </div>
            </div>

            <div className="input-div pass">
              <div className="i">
                <i className="fas fa-lock"></i>
              </div>
              <div className="div">
                <input 
                  type="password" 
                  className="input" 
                  placeholder='Confirm Password'
                  name="confirmPassword"
                  value={values.confirmPassword}
                  onChange={handleChange} 
                />
                {errors.confirmPassword && <p className="error-message">{errors.confirmPassword}</p>}
              </div>
            </div>

            <div className="input-div user-type">
              <div className="i">
                <i className="fas fa-user-circle"></i>
              </div>
              <div className="div">
                <select 
                  className="input" 
                  name="userType"
                  value={values.userType}
                  onChange={handleChange}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <a href="#">Forgot Password?</a>
            <input type="submit" className="btn" value="Sign Up" />
            <a href='/signin' className="abtn">SIGN IN</a>
            <p>Already Have An Account?</p>
          </form>

          {/* Button to send test email */}
          <button className="btn-test-email" onClick={testEmail}>
            Send Test Email
          </button>

          {/* Display the test email status */}
          {dbStatus && <p className="db-status">{dbStatus}</p>}
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default SignUp;

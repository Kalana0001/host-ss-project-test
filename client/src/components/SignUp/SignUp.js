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
    userType: 'user',
  });

  const [errors, setErrors] = useState({});
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

    const noErrors = Object.keys(validationErrors).length === 0;

    if (noErrors) {
      try {
        const response = await axios.post('https://software-project-host-server.vercel.app/signup', values);

        if (response.status === 200) {
          toast.success('Signup successful! Please check your email to verify your account.');
          navigate('/verifyemail');

          // Reset form values on successful signup
          setValues({
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            userType: 'user',
          });
        } else {
          setErrors({ general: 'Signup failed. Please try again.' });
        }
      } catch (error) {
        console.error('Error:', error);
        if (error.response && error.response.status === 400) {
          setErrors({ general: 'Invalid input data.' });
        } else if (error.response && error.response.status === 409) {
          setErrors({ general: 'Email already exists.' });
        } else {
          setErrors({ general: 'An error occurred. Please try again later.' });
        }
        toast.error('An error occurred. Please try again later.');
      }
    }
  };

  return (
    <div className="signup-page">
      <img className="wave" src={wave} alt="Decorative wave" />
      <div className="container">
        <div className="img">
          <h1 className="title1">SIGN UP</h1>
          <img src={background} alt="Background illustration" />
        </div>
        <div className="login-content">
          <form onSubmit={handleSubmit}>
            <img src={avatar} alt="User avatar" />
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
                  placeholder="Name"
                  name="name"
                  value={values.name}
                  onChange={handleChange}
                  aria-label="Name"
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
                  placeholder="Email"
                  name="email"
                  value={values.email}
                  onChange={handleChange}
                  aria-label="Email"
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
                  placeholder="Password"
                  name="password"
                  value={values.password}
                  onChange={handleChange}
                  aria-label="Password"
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
                  placeholder="Confirm Password"
                  name="confirmPassword"
                  value={values.confirmPassword}
                  onChange={handleChange}
                  aria-label="Confirm Password"
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
                  aria-label="User type"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <a href="#">Forgot Password?</a>
            <input type="submit" className="btn" value="Sign Up" />
            <a href="/signin" className="abtn">SIGN IN</a>
            <p>Already Have An Account?</p>
          </form>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default SignUp;

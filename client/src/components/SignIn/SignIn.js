import React, { useState, useEffect } from 'react';
import './SignIn.css';
import background from '../../assets/bg.svg';
import avatar from '../../assets/avatar.svg';
import wave from '../../assets/wave.png';
import { ToastContainer, toast } from 'react-toastify'; 
import 'react-toastify/dist/ReactToastify.css'; 
import { useNavigate } from 'react-router-dom'; 
import axios from 'axios'; 
import Validation from '../Validation/LoginValidation'; // Import the validation function

const SignIn = () => {
    const [values, setValues] = useState({
        email: '',
        password: '',
        userType: '' // State for user type
    });

    const [errors, setErrors] = useState({});
    const navigate = useNavigate(); 

    // Fetch user type based on email input
    const fetchUserType = async (email) => {
        try {
            const res = await axios.get(`https://host-ss-project-test-server.vercel.app/getUserType?email=${email}`); // Use the backend URL
            if (res.data.userType) {
                setValues((prevValues) => ({
                    ...prevValues,
                    userType: res.data.userType
                }));
            } else {
                setValues((prevValues) => ({
                    ...prevValues,
                    userType: ''
                }));
            }
        } catch (error) {
            console.error('Error fetching user type:', error);
            toast.error("Failed to fetch user type.");
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setValues({
            ...values,
            [name]: value,
        });

        // Fetch user type when email changes
        if (name === 'email') {
            fetchUserType(value);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const validationErrors = Validation(values);
        setErrors(validationErrors);

        if (validationErrors.email === "" && validationErrors.password === "") {
            try {
                const res = await axios.post('https://host-ss-project-test-server.vercel.app/signin', values); // Use the backend URL

                if (res.data.token) { // Check if token is present in response
                    localStorage.setItem('token', res.data.token); // Store the JWT token in local storage
                    toast.success('Login successful!');

                    // Navigate based on user type
                    if (values.userType === 'admin') {
                        navigate('/adminhome'); // Navigate to admin home
                    } else if (values.userType === 'user') {
                        navigate('/home'); // Navigate to user home
                    } else {
                        toast.error("Invalid user type.");
                    }
                } else {
                    toast.error("No records existed"); 
                }
            } catch (err) {
                console.error('Error:', err); 
                toast.error("An error occurred. Please try again.");
            }
        }
    };

    return (
        <div>
            <img className="wave" src={wave} alt="wave" />
            <div className="container">
                <div className="img">
                    <h1 className="title1">SIGN IN</h1>
                    <img src={background} alt="background" />
                </div>
                <div className="login-content">
                    <form onSubmit={handleSubmit}>
                        <img src={avatar} alt="avatar" />
                        <h2 className="title">Welcome Back</h2>

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
                                {errors.email && <span className="error-message">{errors.email}</span>} {/* Display email error */}
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
                                {errors.password && <span className="error-message">{errors.password}</span>} {/* Display password error */}
                            </div>
                        </div>

                        {/* User Type Dropdown */}
                        <div className="input-div user-type">
                            <div className="i">
                                <i className="fas fa-user-circle"></i>
                            </div>
                            <div className="div">
                                <select 
                                    name="userType"
                                    className="input" 
                                    value={values.userType}
                                    onChange={handleChange} 
                                >
                                    <option value="">Select User Type</option>
                                    <option value="admin">Admin</option>
                                    <option value="user">User</option>
                                    {/* Add other user types if needed */}
                                </select>
                                {errors.userType && <span className="error-message">{errors.userType}</span>} {/* Display user type error */}
                            </div>
                        </div>

                        <input type="submit" className="btn" value="Sign In" />
                        <a href='/signup' className="abtn">SIGN UP</a>
                        <p>Don't Have An Account?</p>
                    </form>
                </div>
            </div>
            <ToastContainer /> {/* Add ToastContainer for notifications */}
        </div>
    );
};

export default SignIn;

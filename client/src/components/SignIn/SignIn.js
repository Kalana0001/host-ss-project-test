import React, { useState } from 'react';
import './SignIn.css';
import background from '../../assets/bg.svg';
import avatar from '../../assets/avatar.svg';
import wave from '../../assets/wave.png';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Validation from '../Validation/LoginValidation';
import ReCAPTCHA from "react-google-recaptcha";

const SignIn = () => {
    const [values, setValues] = useState({
        email: '',
        password: '',
        userType: ''
    });

    const [errors, setErrors] = useState({});
    const [recaptchaToken, setRecaptchaToken] = useState(""); // Store reCAPTCHA token
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setValues({
            ...values,
            [name]: value,
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const validationErrors = Validation(values);
        setErrors(validationErrors);

        if (validationErrors.email === "" && validationErrors.password === "") {
            if (!recaptchaToken) {
                toast.error("Please complete the reCAPTCHA.");
                return;
            }

            try {
                // Verify reCAPTCHA on the server
                const recaptchaResponse = await axios.post('https://host-ss-project-test-server.vercel.app/verify-recaptcha', {
                    token: recaptchaToken,
                });

                if (recaptchaResponse.data.success) {
                    // Proceed with login
                    const res = await axios.post('https://host-ss-project-test-server.vercel.app/signin', values);

                    if (res.data.token) {
                        localStorage.setItem('token', res.data.token);
                        toast.success('Login successful!');

                        if (values.userType === 'admin') {
                            navigate('/adminhome');
                        } else if (values.userType === 'user') {
                            navigate('/home');
                        } else {
                            toast.error("Invalid user type.");
                        }
                    } else {
                        toast.error("No records existed.");
                    }
                } else {
                    toast.error("reCAPTCHA verification failed. Please try again.");
                }
            } catch (err) {
                console.error('Error:', err);
                toast.error("An error occurred. Please try again.");
            }
        }
    };

    const onChange = (value) => {
        setRecaptchaToken(value); // Save the reCAPTCHA token
    };

    return (
        <div>
            <ToastContainer />
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
                                {errors.email && <span className="error-message">{errors.email}</span>}
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
                                {errors.password && <span className="error-message">{errors.password}</span>}
                            </div>
                        </div>

                        <ReCAPTCHA
                            className='recaptcha'
                            sitekey="6LdmbpAqAAAAAFny7WuwsaoIV8g_2ELM1t9ZLn9_"
                            onChange={onChange}
                        />

                        <input type="submit" className="btn" value="Sign In" />
                        <a href='/signup' className="sign_route">SIGN UP</a>
                        <p>Don't Have An Account?</p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SignIn;

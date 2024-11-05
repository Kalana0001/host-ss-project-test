import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import 'react-toastify/dist/ReactToastify.css';
import './AdminHome.css';

function AdminHome() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    profilePicture: null,
  });

  const [userInfo, setUserInfo] = useState({
    id: '',
    email: '',
    name: '',
  });

  const navigate = useNavigate(); 

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token'); 

        if (!token) {
          console.error('No token found, user is not authenticated.');
          navigate('/signin'); 
          return; 
        }

        const response = await fetch('https://host-ss-project-test-server.vercel.app/users', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`, 
            'Content-Type': 'application/json', 
          },
        });

        if (response.status === 403) {
          alert("Your session has expired, please log in again.");
          localStorage.removeItem('token'); 
          navigate('/signin'); 
          return; 
        }

        if (!response.ok) {
          console.error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
          throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        setUserInfo({
          id: data.id, 
          email: data.email,
          name: data.name,
        });

        setFormData({
          fullName: data.name || '', 
          email: data.email || '', 
          profilePicture: null, 
        });
      } catch (error) {
        console.error('Error fetching user data:', error.message); 
      }
    };

    fetchUserData();
  }, [navigate]); 

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, profilePicture: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const formDataToSend = new FormData();
    formDataToSend.append('fullName', formData.fullName);
    formDataToSend.append('email', formData.email);
    if (formData.profilePicture) {
      formDataToSend.append('profilePicture', formData.profilePicture);
    }

    try {
      const response = await fetch('https://host-ss-project-test-server.vercel.app/users/update', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
      } else {
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error.message);
    }
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to logout?");
    
    if (confirmLogout) {
      const token = localStorage.getItem('token');
      try {
        await fetch("https://host-ss-project-test-server.vercel.app/logout", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        });
        localStorage.removeItem('token'); 
        console.log('User logged out');    
        navigate('/');                     
      } catch (error) {
        console.error("Logout failed:", error); 
      }
    } else {
      console.log('Logout canceled');          
    }
  };

  return (
    <div className='home'>
      <p className="admin-welcome">{userInfo.name}, Welcome to Admin Home!</p>
      <div className="app-container">
        <div className="profile-card">
          <div className="profile-image">
            <img
              src={formData.profilePicture ? URL.createObjectURL(formData.profilePicture) : "https://via.placeholder.com/150"}
              alt="Profile"
            />
          </div>
          <h2>{formData.fullName}</h2>
          <div className="user-info">
            <p className='user_data'>User ID: {userInfo.id}</p>
            <p className='user_data'>Name: {userInfo.name}</p>
            <p className='user_data'>Email: {userInfo.email}</p>
          </div>
          <div className="buttons">
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>

        <div className="edit-profile-form">
          <h2 className='home_h1'>Edit Profile</h2>
          <form onSubmit={handleSubmit}>
            <label>Full Name</label>
            <input 
              type="text" 
              name="fullName"
              className='home_input' 
              value={formData.fullName} 
              onChange={handleChange} 
            />
            <label>Email</label>
            <input 
              type="text"
              name="email"
              className='home_input' 
              value={formData.email} 
              onChange={handleChange} 
            />
            <label>Profile Picture</label>
            <input 
              type="file" 
              name="profilePicture" 
              className='home_input' 
              onChange={handleFileChange} 
            />
            <button type="submit" className="update-btn">Update</button>
            <a href='/useractivity' className="user_view_btn">User Activities</a>
            <a href='/usermanage' className="user_view_btn">Users</a>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AdminHome; 

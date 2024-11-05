import React, { useEffect, useState } from 'react';
import './UserActivities.css'; 

const UserActivities = () => {
    const [activities, setActivities] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUserActivities = async () => {
            try {
                const response = await fetch('https://host-ss-project-test-server.vercel.app/userActivities', { // Updated URL
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch user activities');
                }

                const data = await response.json();
                setActivities(data);
            } catch (err) {
                setError(err.message);
            }
        };

        fetchUserActivities();
    }, []);

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className='user_activities'>
            <div className="user-activities-container">
                <h2 className='acth2'>User Activities</h2>
                <a href='/adminhome' className="user_view_btns">Back</a>
                <table className="activities-table">
                    <thead>
                        <tr>
                            <th>User ID</th>
                            <th>Action</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activities.map(activity => (
                            <tr key={activity.id}>
                                <td>{activity.user_id}</td>
                                <td>{activity.action}</td>
                                <td>{new Date(activity.timestamp).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserActivities;

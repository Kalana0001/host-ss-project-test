const express = require("express");
const mysql = require("mysql2/promise"); // Use promise-based version for better async support
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
require('dotenv').config();
const bcrypt = require("bcrypt");
const app = express();

// Allow any origin in CORS
app.use(cors({
    origin: '*', // Allow all origins
}));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Create a connection pool for the database
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
db.getConnection()
    .then(() => {
        console.log("Successfully connected to the database.");
    })
    .catch(error => {
        console.error("Database connection failed:", error.message);
    });

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

// Middleware for token authentication
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token || !token.startsWith('Bearer ')) return res.status(401).json("Access Denied: No Token Provided");

    jwt.verify(token.split(' ')[1], JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json("Invalid Token");
        }
        req.user = user;
        next();
    });
}

// Unified log action function
async function logAction(userId, action) {
    const sql = "INSERT INTO audit_logs (user_id, action) VALUES (?, ?)";
    try {
        await db.query(sql, [userId, action]);
    } catch (err) {
        console.error("Error logging action to the database:", err);
    }
}

// Signup route
app.post("/signup", async (req, res) => {
    const { name, email, password, userType } = req.body;
    const sql = "INSERT INTO signs (name, email, password, userType) VALUES (?, ?, ?, ?)";

    try {
        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds, which determines the hashing complexity

        // Insert the user with the hashed password
        const values = [name, email, hashedPassword, userType];
        await db.query(sql, values);
        
        res.json("User Registered Successfully");
    } catch (err) {
        console.error("Error in /signup:", err);
        res.status(500).json("Error registering user");
    }
});
// Sign-in route (login)
app.post("/signin", async (req, res) => {
    const { email, password } = req.body;
    const sql = "SELECT * FROM signs WHERE email = ?";

    try {
        const [data] = await db.query(sql, [email]);

        if (data.length > 0) {
            const user = data[0];

            // Compare the password using bcrypt
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                await logAction(user.id, "Login Failed");
                return res.status(401).json("Login Failed");
            }

            // Generate JWT
            const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '2h' });
            await logAction(user.id, "Signed in");
            res.json({ message: "Login Successful", token });
        } else {
            await logAction(null, `Login Failed for email: ${email}`);
            return res.status(401).json("Login Failed");
        }
    } catch (err) {
        console.error("Error in /signin:", err);
        res.status(500).json("Error during sign-in");
    }
});

// Logout route
app.post("/logout", authenticateToken, async (req, res) => {
    if (req.user && req.user.id) {
        await logAction(req.user.id, "Signed out");
        res.json({ message: "Logout Successful" });
    } else {
        res.status(400).json({ message: "User ID not found" });
    }
});

// Fetch user data route
app.get("/users", authenticateToken, async (req, res) => {
    const sql = "SELECT * FROM signs WHERE id = ?";
    
    try {
        const [data] = await db.query(sql, [req.user.id]);
        
        await logAction(req.user.id, "Viewed own data");
        
        if (data.length > 0) {
            return res.json(data[0]);
        } else {
            return res.status(404).json("User not found");
        }
    } catch (err) {
        console.error("Error fetching user data:", err);
        res.status(500).json("Error fetching data");
    }
});

// Corrected getUserType route
app.get('/getUserType', async (req, res) => {
    const email = req.query.email;
    const sql = "SELECT userType FROM signs WHERE email = ?";

    try {
        const [data] = await db.query(sql, [email]);

        if (data.length > 0) {
            res.json({ userType: data[0].userType });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (err) {
        console.error("Error fetching user type:", err);
        res.status(500).json({ message: 'Error fetching user type' });
    }
});

// API endpoint to retrieve all user activities
app.get('/userActivities', async (req, res) => {
    const sql = 'SELECT * FROM audit_logs';

    try {
        const [results] = await db.query(sql);
        res.json(results);
    } catch (error) {
        console.error("Database query failed:", error);
        return res.status(500).json({ error: 'Database query failed' });
    }
});

// API Endpoint to Get All Users
app.get('/viewUsers', async (req, res) => {
    const query = 'SELECT * FROM signs';

    try {
        const [results] = await db.query(query);
        res.json(results);
    } catch (err) {
        console.error('Error fetching users:', err);
        return res.status(500).send('Server Error');
    }
});

// API for health check
app.get("/", (req, res) => {
    res.send("Server is running");
});

// Test database connection endpoint
app.get("/test-db", async (req, res) => {
    try {
        const [results] = await db.query("SELECT 1");
        res.json({ message: "Database connection successful", results });
    } catch (err) {
        console.error("Database connection failed:", err);
        res.status(500).json({ message: "Database connection failed" });
    }
});

// reCAPTCHA verification API route
app.post('/verify-recaptcha', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ success: false, message: 'reCAPTCHA token is missing' });
    }

    try {
        const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify`, null, {
            params: {
                secret: RECAPTCHA_SECRET_KEY, // Securely access the key
                response: token,
            },
        });

        if (response.data.success) {
            res.json({ success: true, message: "reCAPTCHA verified successfully" });
        } else {
            res.status(400).json({ success: false, message: "reCAPTCHA verification failed", errors: response.data['error-codes'] });
        }
    } catch (err) {
        console.error('Error verifying reCAPTCHA:', err);
        res.status(500).json({ success: false, message: "Server error during reCAPTCHA verification" });
    }
});

// Start server
const PORT = process.env.PORT || 8089; // Use PORT from environment variables or default to 8087
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Export the app for Vercel
module.exports = app; // Only exporting the app

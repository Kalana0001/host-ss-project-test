const express = require("express");
const mysql = require("mysql2/promise"); // Use promise-based version for better async support
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
require('dotenv').config();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
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

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your Gmail address
        pass: process.env.EMAIL_PASS  // Your Gmail password or App Password
    }
});

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
    const sql = "INSERT INTO testt_logs (user_id, action) VALUES (?, ?)";
    try {
        await db.query(sql, [userId, action]);
    } catch (err) {
        console.error("Error logging action to the database:", err);
    }
}

// Signup route
app.post("/signup", async (req, res) => {
    const { name, email, password, userType } = req.body;

    try {
        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10); // 10 salt rounds

        // Generate verification token
        const verificationToken = Math.floor(100000 + Math.random() * 900000); // 6-digit token

        // Insert the user with the hashed password and verification token
        const sql = "INSERT INTO test (name, email, password, userType, verification_token) VALUES (?, ?, ?, ?, ?)";
        await db.query(sql, [name, email, hashedPassword, userType, verificationToken]);

        // Send verification email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Please verify your email address',
            html: `
                <p>Dear ${name},</p>
                <p>Thank you for registering. Please verify your email by using the following code:</p>
                <h3>${verificationToken}</h3>
                <p>This code will expire in 10 minutes. Please enter it promptly.</p>
                <p>If you did not request this, please ignore this email.</p>
            `
        };

        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                console.error("Error sending verification email:", error);
                return res.status(500).json("Error sending verification email.");
            }
            res.json("User registered. Please check your email for the verification code.");
        });

    } catch (err) {
        console.error("Error in /signup:", err);
        res.status(500).json("Error registering user");
    }
});
app.post("/verify", async (req, res) => {
    const { email, verificationToken } = req.body;
    
    try {
        // Query to find the user by email and verification token
        const sql = "SELECT * FROM test WHERE email = ? AND verification_token = ?";
        const [user] = await db.query(sql, [email, verificationToken]);

        if (user.length > 0) {
            // User found, check if the verification token matches
            const updateSql = "UPDATE test SET verified = TRUE WHERE email = ?";
            await db.query(updateSql, [email]);

            // Optionally, you can remove or invalidate the token after successful verification
            res.json("Email verified successfully!");
        } else {
            res.status(400).json("Invalid verification token or email.");
        }
    } catch (err) {
        console.error("Error in /verify:", err);
        res.status(500).json("Error verifying email.");
    }
});

// Sign-in route (login)
app.post("/signin", async (req, res) => {
    const { email, password } = req.body;
    const sql = "SELECT * FROM test WHERE email = ?";

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
    const sql = "SELECT * FROM test WHERE id = ?";
    
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
    const sql = "SELECT userType FROM test WHERE email = ?";

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
    const sql = 'SELECT * FROM testt_logs';

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
    const query = 'SELECT * FROM test';

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
app.get('/test-db', async (req, res) => {
    try {
      if (db) {
        await db.query('SELECT 1'); // Basic query to test the connection
        res.status(200).send('Database connection is successful!');
      } else {
        res.status(500).send('Database connection is not initialized.');
      }
    } catch (error) {
      console.error("Database Connection Test Error:", error);
      res.status(500).send('Error connecting to the database.');
    }
  });

// Start server
const PORT = process.env.PORT || 8089; // Use PORT from environment variables or default to 8087
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Export the app for Vercel
module.exports = app; // Only exporting the app

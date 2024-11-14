const express = require("express");
const mysql = require("mysql2/promise"); // Use promise-based version for better async support
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
require('dotenv').config();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const app = express();

app.use(cors({
    origin: '*', // Allow all origins
}));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Create a connection pool for the database
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
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

// Nodemailer transporter setup
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
        const hashedPassword = await bcrypt.hash(password, 10); // 10 salt rounds

        // Generate verification token
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit token as a string

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

        await transporter.sendMail(mailOptions);
        res.json("User registered. Please check your email for the verification code.");

    } catch (err) {
        console.error("Error in /signup:", err);
        res.status(500).json("Error registering user or sending verification email.");
    }
});

// Email verification route
app.post("/verify", async (req, res) => {
    const { email, verificationToken } = req.body;
    
    try {
        const sql = "SELECT * FROM test WHERE email = ? AND verification_token = ?";
        const [user] = await db.query(sql, [email, verificationToken]);

        if (user.length > 0) {
            const updateSql = "UPDATE test SET verified = TRUE WHERE email = ?";
            await db.query(updateSql, [email]);
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
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                await logAction(user.id, "Login Failed");
                return res.status(401).json("Login Failed");
            }

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

// Test email setup route
app.get("/test-email", async (req, res) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: "your-test-email@example.com",
        subject: 'Test Email',
        text: 'This is a test email from your application.'
    };
    try {
        await transporter.sendMail(mailOptions);
        res.send("Test email sent successfully.");
    } catch (error) {
        console.error("Test email failed:", error);
        res.status(500).send("Failed to send test email.");
    }
});

// Health check route
app.get("/", (req, res) => {
    res.send("Server is running");
});

const PORT = process.env.PORT || 8089; 
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Export the app for Vercel
module.exports = app;

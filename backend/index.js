const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
require('dotenv').config();
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

// Email transporter setup using Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Signup route
app.post("/signup", async (req, res) => {
    const { name, email, password, userType } = req.body;

    try {
        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

        // Insert the user with the hashed password
        const sql = "INSERT INTO signs (name, email, password, userType) VALUES (?, ?, ?, ?)";
        const values = [name, email, hashedPassword, userType];
        const [result] = await db.query(sql, values);
        
        // Generate a verification token (you can store it in your database or send directly)
        const verificationToken = jwt.sign({ email: email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Send verification email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Please verify your email address',
            html: `
                <p>Hi ${name},</p>
                <p>Thank you for registering with us. Please verify your email by clicking the link below:</p>
                <a href="${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}">Verify Email</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you did not register, please ignore this email.</p>
            `
        };

        // Send the email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
                return res.status(500).json("Error sending verification email");
            }

            res.json("User registered successfully. Please check your email for verification.");
        });
    } catch (err) {
        console.error("Error in /signup:", err);
        res.status(500).json("Error registering user");
    }
});

// Email verification route
app.post("/verify", async (req, res) => {
    const { token } = req.body;

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Optionally, update the user record to set them as 'verified'
        const sql = "UPDATE signs SET verified = true WHERE email = ?";
        await db.query(sql, [decoded.email]);

        res.json("Email verified successfully!");
    } catch (err) {
        console.error("Error verifying email:", err);
        res.status(400).json("Invalid or expired token");
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
                return res.status(401).json("Login Failed");
            }

            // Generate JWT
            const token = jwt.sign({ id: user.id, name: user.name }, process.env.JWT_SECRET, { expiresIn: '2h' });
            res.json({ message: "Login Successful", token });
        } else {
            return res.status(401).json("Login Failed");
        }
    } catch (err) {
        console.error("Error in /signin:", err);
        res.status(500).json("Error during sign-in");
    }
});

// Logout route
app.post("/logout", async (req, res) => {
    res.json({ message: "Logout Successful" });
});

// Fetch user data route
app.get("/users", async (req, res) => {
    const sql = "SELECT * FROM signs WHERE id = ?";
    
    try {
        const [data] = await db.query(sql, [req.user.id]);
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

// Start server
const PORT = process.env.PORT || 8089;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Export the app for Vercel
module.exports = app; // Only exporting the app

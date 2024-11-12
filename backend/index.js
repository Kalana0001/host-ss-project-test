const express = require("express");
const mysql = require("mysql2/promise"); // Use promise-based version for better async support
const cors = require("cors");
const jwt = require("jsonwebtoken");
require('dotenv').config();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer"); // Ensure nodemailer is required

const app = express();

app.use(cors({ origin: 'https://www.authwarpper.me' })); // Allow all origins
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Use express's urlencoded

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
    .then(() => console.log("Successfully connected to the database."))
    .catch(error => console.error("Database connection failed:", error.message));

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// Setup for email transport
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Middleware for token authentication
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token || !token.startsWith('Bearer ')) return res.status(401).json("Access Denied: No Token Provided");

    jwt.verify(token.split(' ')[1], JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json("Invalid Token");
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
    const verificationToken = Math.floor(100000 + Math.random() * 900000);

    console.log('Received signup request:', req.body);

    const sql = "INSERT INTO test (name, email, password, userType, verification_token) VALUES (?, ?, ?, ?, ?)";
    const hashedPassword = await bcrypt.hash(password, 10);
    const values = [name, email, hashedPassword, userType, verificationToken];

    db.query(sql, values, (err) => {
        if (err) {
            console.error('Error inserting user into database:', err);
            return res.status(500).json("Error registering user");
        }

        console.log('User inserted successfully');

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Please verify your email address',
            html: `
                <p>Dear ${name},</p>
                <p>Thank you for registering with us. Please use the following verification code to confirm your email address:</p>
                <h3 style="color: #4CAF50;">${verificationToken}</h3>
                <p>This code will expire in 10 minutes, so please enter it promptly.</p>
                <p><strong>Important:</strong> Please do not share this code with anyone. If you did not request this email, please ignore it.</p>
                <p>Best regards,</p>
                <p><strong>Your Company Name</strong></p>
                <p><em>If you have any questions, feel free to contact our support team.</em></p>
            `
        };

        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).send('Error sending verification email');
            }
            res.status(200).send('User created. Please check your email for verification.');
        });
    });
});

// Verification route
app.post("/verify", (req, res) => {
    const { email, verificationToken } = req.body;

    const query = 'SELECT * FROM test WHERE email = ? AND verification_token = ?';

    db.query(query, [email, verificationToken], (err, result) => {
        if (err) return res.status(500).json("Error verifying email");

        if (result.length > 0) {
            const currentTime = new Date();

            if (currentTime > result[0].token_expiry) {
                return res.status(400).json("Verification token has expired");
            }

            const updateQuery = 'UPDATE test SET verified = TRUE WHERE email = ?';
            db.query(updateQuery, [email], (err) => {
                if (err) return res.status(500).json("Error updating verification status");
                res.json("Email verified successfully!");
            });
        } else {
            res.status(400).json("Invalid or expired verification token");
        }
    });
});

// Sign-in route (login)
app.post("/signin", async (req, res) => {
    const { email, password } = req.body;
    const sql = "SELECT * FROM test WHERE email = ?";

    db.query(sql, [email], async (err, data) => {
        if (err) return res.status(500).json("Error");

        if (data.length > 0) {
            const user = data[0];

            if (!user.verified) {
                return res.status(403).json("Please verify your email before signing in.");
            }

            const isPasswordCorrect = await bcrypt.compare(password, user.password);
            if (!isPasswordCorrect) {
                logAction(user.id, "Login Failed");
                return res.status(401).json("Login Failed");
            }

            const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '2h' });
            logAction(user.id, "Signed in");
            res.json({ message: "Login Successful", token });
        } else {
            logAction(null, `Login Failed for email: ${email}`);
            return res.status(401).json("Login Failed");
        }
    });
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

// Get user type
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

// Retrieve all user activities
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

// Retrieve all users
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

// Health check endpoint
app.get("/", (req, res) => {
    res.send("Server is running");
});

// Test database connection endpoint
app.get("/test-db", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT 1");
        res.json("Database connection successful");
    } catch (error) {
        console.error("Database connection failed:", error);
        res.status(500).json("Database connection failed");
    }
});

const PORT = process.env.PORT || 4008; // Updated default port in comment
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

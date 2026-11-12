
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const connectDB = require("./db");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

app.use(express.json());
app.use(express.static("public"));

let students;
let users;

// Socket.io connection
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
    });
});

// JWT Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Access denied. Token required."
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
        if (error) {
            return res.status(403).json({
                message: "Invalid or expired token"
            });
        }

        req.user = user;
        next();
    });
}

// Home Route
app.get("/", (req, res) => {
    res.send("Student Management API is running!");
});

// Signup API
app.post("/auth/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                message: "Invalid input"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (!cleanName || !cleanEmail) {
            return res.status(400).json({
                message: "Name and email cannot be empty"
            });
        }

        const existingUser = await users.findOne({
            email: cleanEmail
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            name: cleanName,
            email: cleanEmail,
            password: hashedPassword
        };

        const result = await users.insertOne(newUser);

        res.status(201).json({
            message: "Account created successfully!",
            userId: result.insertedId
        });

    } catch (error) {
        console.error("Signup error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        res.status(500).json({
            message: "Unable to create account"
        });
    }
});

// Login API
app.post("/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            !email ||
            !password ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                message: "Valid email and password are required"
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const user = await users.findOne({
            email: cleanEmail
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured");
        }

        const token = jwt.sign(
            {
                userId: user._id.toString(),
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({
            message: "Login successful!",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            message: "Unable to login"
        });
    }
});

// Protected Profile API
app.get("/auth/profile", authenticateToken, async (req, res) => {
    try {
        const user = await users.findOne(
            {
                _id: new ObjectId(req.user.userId)
            },
            {
                projection: { password: 0 }
            }
        );

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json({
            message: "Authenticated successfully!",
            user
        });

    } catch (error) {
        console.error("Profile error:", error);

        res.status(500).json({
            message: "Unable to fetch profile"
        });
    }
});

// GET All Students - Protected
app.get("/students", authenticateToken, async (req, res) => {
    try {
        const data = await students.find().toArray();
        res.json(data);

    } catch (error) {
        console.error("Fetch students error:", error);

        res.status(500).json({
            message: "Unable to fetch students"
        });
    }
});

// GET Student by ID - Protected
app.get("/students/:id", authenticateToken, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                message: "Invalid student ID"
            });
        }

        const student = await students.findOne({
            _id: new ObjectId(req.params.id)
        });

        if (!student) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.json(student);

    } catch (error) {
        console.error("Fetch student error:", error);

        res.status(500).json({
            message: "Unable to fetch student"
        });
    }
});

// POST New Student - Protected
app.post("/students", authenticateToken, async (req, res) => {
    try {
        const { name, course } = req.body;

        if (
            !name ||
            !course ||
            typeof name !== "string" ||
            typeof course !== "string"
        ) {
            return res.status(400).json({
                message: "Valid name and course are required"
            });
        }

        const newStudent = {
            name: name.trim(),
            course: course.trim()
        };

        if (!newStudent.name || !newStudent.course) {
            return res.status(400).json({
                message: "Name and course cannot be empty"
            });
        }

        const result = await students.insertOne(newStudent);

        // Notify connected clients
        io.emit("students:changed");

        res.status(201).json({
            message: "Student added successfully!",
            student: {
                _id: result.insertedId,
                ...newStudent
            }
        });

    } catch (error) {
        console.error("Add student error:", error);

        res.status(500).json({
            message: "Unable to add student"
        });
    }
});

// PUT Update Student - Protected
app.put("/students/:id", authenticateToken, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                message: "Invalid student ID"
            });
        }

        const { name, course } = req.body;

        if (!name && !course) {
            return res.status(400).json({
                message: "Provide name or course to update"
            });
        }

        const updates = {};

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({
                    message: "Invalid student name"
                });
            }

            updates.name = name.trim();
        }

        if (course !== undefined) {
            if (typeof course !== "string" || !course.trim()) {
                return res.status(400).json({
                    message: "Invalid course"
                });
            }

            updates.course = course.trim();
        }

        const result = await students.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updates }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        // Notify connected clients
        io.emit("students:changed");

        res.json({
            message: "Student updated successfully!"
        });

    } catch (error) {
        console.error("Update student error:", error);

        res.status(500).json({
            message: "Unable to update student"
        });
    }
});

// DELETE Student - Protected
app.delete("/students/:id", authenticateToken, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                message: "Invalid student ID"
            });
        }

        const result = await students.deleteOne({
            _id: new ObjectId(req.params.id)
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        // Notify connected clients
        io.emit("students:changed");

        res.json({
            message: "Student deleted successfully!"
        });

    } catch (error) {
        console.error("Delete student error:", error);

        res.status(500).json({
            message: "Unable to delete student"
        });
    }
});

// Start Server
async function startServer() {
    try {
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is missing from .env");
        }

        const db = await connectDB();

        students = db.collection("students");
        users = db.collection("users");

        await users.createIndex(
            { email: 1 },
            { unique: true }
        );

        server.listen(3000, () => {
            console.log("Server running on port 3000");
            console.log("Socket.io is ready!");
        });

    } catch (error) {
        console.error("Server startup failed:", error);
    }
}

startServer();

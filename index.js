
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { graphqlHTTP } = require("express-graphql");

const {
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLID,
    GraphQLList,
    GraphQLNonNull
} = require("graphql");

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

// ---------------- SOCKET.IO ----------------

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
    });
});

// ---------------- JWT AUTHENTICATION ----------------

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

// ---------------- HOME ROUTE ----------------

app.get("/", (req, res) => {
    res.send("Student Management API is running!");
});

// ---------------- SIGNUP API ----------------

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

// ---------------- LOGIN API ----------------

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

// ---------------- PROFILE API ----------------

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

// ---------------- REST API: GET ALL STUDENTS ----------------

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

// ---------------- REST API: GET STUDENT BY ID ----------------

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

// ---------------- REST API: ADD STUDENT ----------------

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

// ---------------- REST API: UPDATE STUDENT ----------------

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

// ---------------- REST API: DELETE STUDENT ----------------

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

// ================= GRAPHQL API =================

// Student Type
const StudentType = new GraphQLObjectType({
    name: "Student",

    fields: {
        id: {
            type: GraphQLID,
            resolve: (student) => student._id.toString()
        },

        name: {
            type: GraphQLString
        },

        course: {
            type: GraphQLString
        }
    }
});

// GraphQL Queries
const RootQuery = new GraphQLObjectType({
    name: "RootQueryType",

    fields: {
        students: {
            type: new GraphQLList(StudentType),

            resolve: async () => {
                return await students.find().toArray();
            }
        },

        student: {
            type: StudentType,

            args: {
                id: {
                    type: new GraphQLNonNull(GraphQLID)
                }
            },

            resolve: async (_, args) => {
                if (!ObjectId.isValid(args.id)) {
                    throw new Error("Invalid student ID");
                }

                const result = await students.findOne({
                    _id: new ObjectId(args.id)
                });

                if (!result) {
                    throw new Error("Student not found");
                }

                return result;
            }
        }
    }
});

// GraphQL Mutations
const RootMutation = new GraphQLObjectType({
    name: "RootMutationType",

    fields: {
        addStudent: {
            type: StudentType,

            args: {
                name: {
                    type: new GraphQLNonNull(GraphQLString)
                },

                course: {
                    type: new GraphQLNonNull(GraphQLString)
                }
            },

            resolve: async (_, args) => {
                const name = args.name.trim();
                const course = args.course.trim();

                if (!name || !course) {
                    throw new Error("Name and course cannot be empty");
                }

                const newStudent = {
                    name,
                    course
                };

                const result = await students.insertOne(newStudent);

                io.emit("students:changed");

                return {
                    _id: result.insertedId,
                    ...newStudent
                };
            }
        },

        updateStudent: {
            type: StudentType,

            args: {
                id: {
                    type: new GraphQLNonNull(GraphQLID)
                },

                name: {
                    type: GraphQLString
                },

                course: {
                    type: GraphQLString
                }
            },

            resolve: async (_, args) => {
                if (!ObjectId.isValid(args.id)) {
                    throw new Error("Invalid student ID");
                }

                const updates = {};

                if (args.name !== undefined) {
                    if (typeof args.name !== "string" || !args.name.trim()) {
                        throw new Error("Invalid student name");
                    }

                    updates.name = args.name.trim();
                }

                if (args.course !== undefined) {
                    if (typeof args.course !== "string" || !args.course.trim()) {
                        throw new Error("Invalid course");
                    }

                    updates.course = args.course.trim();
                }

                if (Object.keys(updates).length === 0) {
                    throw new Error("Provide name or course to update");
                }

                const result = await students.updateOne(
                    { _id: new ObjectId(args.id) },
                    { $set: updates }
                );

                if (result.matchedCount === 0) {
                    throw new Error("Student not found");
                }

                io.emit("students:changed");

                return await students.findOne({
                    _id: new ObjectId(args.id)
                });
            }
        },

        deleteStudent: {
            type: GraphQLString,

            args: {
                id: {
                    type: new GraphQLNonNull(GraphQLID)
                }
            },

            resolve: async (_, args) => {
                if (!ObjectId.isValid(args.id)) {
                    throw new Error("Invalid student ID");
                }

                const result = await students.deleteOne({
                    _id: new ObjectId(args.id)
                });

                if (result.deletedCount === 0) {
                    throw new Error("Student not found");
                }

                io.emit("students:changed");

                return "Student deleted successfully!";
            }
        }
    }
});

// Create GraphQL Schema
const schema = new GraphQLSchema({
    query: RootQuery,
    mutation: RootMutation
});

// Protected GraphQL Endpoint
app.use(
    "/graphql",
    authenticateToken,
    graphqlHTTP({
        schema,
        graphiql: true
    })
);

// ================= END GRAPHQL API =================

// ---------------- START SERVER ----------------

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
            console.log("GraphQL endpoint: http://localhost:3000/graphql");
        });

    } catch (error) {
        console.error("Server startup failed:", error);
    }
}

startServer();


const express = require("express");
const { ObjectId } = require("mongodb");
const connectDB = require("./db");

const app = express();
app.use(express.json());
app.use(express.static("public"));
let students;

// Home route
app.get("/", (req, res) => {
    res.send("Student Management API is running!");
});

// GET all students
app.get("/students", async (req, res) => {
    const data = await students.find().toArray();
    res.json(data);
});

// GET student by ID
app.get("/students/:id", async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid student ID" });
    }

    const student = await students.findOne({
        _id: new ObjectId(req.params.id)
    });

    if (!student) {
        return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);
});

// POST new student
app.post("/students", async (req, res) => {
    const { name, course } = req.body;

    if (!name || !course) {
        return res.status(400).json({
            message: "Name and course are required"
        });
    }

    const newStudent = { name, course };

    const result = await students.insertOne(newStudent);

    res.status(201).json({
        message: "Student added successfully!",
        student: { _id: result.insertedId, ...newStudent }
    });
});

// PUT update student
app.put("/students/:id", async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid student ID" });
    }

    const { name, course } = req.body;

    if (!name && !course) {
        return res.status(400).json({
            message: "Provide name or course to update"
        });
    }

    const result = await students.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { ...(name && { name }), ...(course && { course }) } }
    );

    if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Student not found" });
    }

    res.json({ message: "Student updated successfully!" });
});

// DELETE student
app.delete("/students/:id", async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid student ID" });
    }

    const result = await students.deleteOne({
        _id: new ObjectId(req.params.id)
    });

    if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Student not found" });
    }

    res.json({ message: "Student deleted successfully!" });
});

// Start server after database connection
async function startServer() {
    try {
        const db = await connectDB();
        students = db.collection("students");

        app.listen(3000, () => {
            console.log("Server running on port 3000");
        });
    } catch (error) {
        console.error("Server startup failed:", error);
    }
}

startServer();

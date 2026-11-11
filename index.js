
const express = require("express");

const app = express();

// Middleware to read JSON data
app.use(express.json());

// Temporary student database
let students = [
    { id: 1, name: "Neha", course: "BCA" },
    { id: 2, name: "Rahul", course: "BCA" }
];

// Home route
app.get("/", (req, res) => {
    res.send("Student Management API is running!");
});

// GET: Show all students
app.get("/students", (req, res) => {
    res.json(students);
});

// GET: Find student by ID
app.get("/students/:id", (req, res) => {
    const student = students.find(
        s => s.id === Number(req.params.id)
    );

    if (!student) {
        return res.status(404).json({
            message: "Student not found"
        });
    }

    res.json(student);
});

// POST: Add new student
app.post("/students", (req, res) => {
    const { name, course } = req.body;

    if (!name || !course) {
        return res.status(400).json({
            message: "Name and course are required"
        });
    }

    const newStudent = {
        id: students.length
            ? Math.max(...students.map(s => s.id)) + 1
            : 1,
        name: name,
        course: course
    };

    students.push(newStudent);

    res.status(201).json({
        message: "Student added successfully!",
        student: newStudent
    });
});

// PUT: Update student
app.put("/students/:id", (req, res) => {
    const student = students.find(
        s => s.id === Number(req.params.id)
    );

    if (!student) {
        return res.status(404).json({
            message: "Student not found"
        });
    }

    student.name = req.body.name || student.name;
    student.course = req.body.course || student.course;

    res.json({
        message: "Student updated successfully!",
        student: student
    });
});

// DELETE: Delete student
app.delete("/students/:id", (req, res) => {
    const id = Number(req.params.id);

    const index = students.findIndex(s => s.id === id);

    if (index === -1) {
        return res.status(404).json({
            message: "Student not found"
        });
    }

    const deletedStudent = students.splice(index, 1);

    res.json({
        message: "Student deleted successfully!",
        student: deletedStudent[0]
    });
});

// PUT: Update student details
app.put("/students/:id", (req, res) => {

    const studentId = Number(req.params.id);

    const student = students.find(s => s.id === studentId);

    if (!student) {
        return res.status(404).json({
            message: "Student not found!"
        });
    }

    student.name = req.body.name || student.name;
    student.course = req.body.course || student.course;

    res.json({
        message: "Student updated successfully!",
        student: student
    });
});

app.delete("/students/:id", (req, res) => {

    const id = Number(req.params.id);

    const index = students.findIndex(s => s.id === id);

    if (index === -1) {
        return res.status(404).json({
            message: "Student not found!"
        });
    }

    const deletedStudent = students.splice(index, 1);

    res.json({
        message: "Student deleted successfully!",
        student: deletedStudent[0]
    });
});


// Start server (keep this at the end)
app.listen(3000, () => {
    console.log("Server running on port 3000");
});

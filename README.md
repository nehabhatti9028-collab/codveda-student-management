# 🎓 Student Management System

A full-stack Student Management System built using React, Node.js, Express.js, and MongoDB. This project was developed as part of my Full Stack Development internship at Codveda Technologies.

## 🚀 Project Overview

The application helps manage student records through a modern and responsive dashboard. It supports student CRUD operations, authentication, database integration, real-time updates, and GraphQL APIs.

## ✨ Features

- Modern and responsive React dashboard
- Add, view, update, and delete student records
- Search student records
- User signup and login
- Password hashing using bcrypt
- JWT-based authentication
- Protected API routes
- MongoDB database integration
- Real-time updates using Socket.io
- GraphQL queries and mutations
- Custom confirmation modal and interactive UI

## 🛠️ Tech Stack

| Area | Technologies |
|---|---|
| Frontend | React.js, Vite, HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| Authentication | JWT, bcrypt |
| Real-time | Socket.io |
| API | REST API, GraphQL |
| Tools | VS Code, Thunder Client, Git, GitHub |

## 📁 Project Structure

```text
Codveda_Internship/
├── client/
│   └── React frontend
├── public/
│   └── Static frontend files
├── index.js
├── db.js
├── package.json
├── package-lock.json
└── .gitignore
```

## ⚙️ Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/nehabhatti9028-collab/codveda-student-management.git
```

### 2. Open the project

```bash
cd codveda-student-management
```

### 3. Install backend dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the root directory and add your own MongoDB connection string and JWT secret.

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

Never upload your actual `.env` file to GitHub.

### 5. Start the backend

```bash
node index.js
```

### 6. Start the frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Open the local URL displayed by Vite in your browser.

## 🧪 Testing

The application was tested using Thunder Client.

- REST API CRUD operations
- Signup and login
- Protected routes
- MongoDB data operations
- Socket.io real-time updates
- GraphQL queries and mutations

## 📚 Learning Outcomes

Through this project, I gained practical experience in full-stack development, REST API creation, React development, authentication, database integration, real-time communication, GraphQL, and GitHub version control.

## 👩‍💻 Developed By

**Neha Bhatti**

BCA Student | Aspiring Full Stack Developer

## 📌 Internship

Codveda Technologies — Full Stack Development Internship

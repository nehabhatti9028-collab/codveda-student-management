
const API_URL = "/students";

const studentForm = document.getElementById("studentForm");
const studentList = document.getElementById("studentList");

const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editForm");
const editName = document.getElementById("editName");
const editCourse = document.getElementById("editCourse");
const cancelEdit = document.getElementById("cancelEdit");

const deleteModal = document.getElementById("deleteModal");
const cancelDelete = document.getElementById("cancelDelete");
const confirmDelete = document.getElementById("confirmDelete");

const toast = document.getElementById("toast");

let studentToEdit = null;
let studentToDelete = null;
let toastTimer;

function showMessage(message, type = "success") {
    clearTimeout(toastTimer);

    toast.textContent = message;
    toast.className = "toast show";

    if (type === "error") {
        toast.classList.add("error");
    }

    toastTimer = setTimeout(function() {
        toast.className = "toast";
    }, 2500);
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

async function loadStudents() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Unable to load students");
        }

        const students = await response.json();

        studentList.innerHTML = "";

        students.forEach(student => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${escapeHTML(student.name)}</td>
                <td>${escapeHTML(student.course)}</td>
                <td>
                    <button class="edit-btn" data-id="${student._id}">Edit</button>
                    <button class="delete-btn" data-id="${student._id}">Delete</button>
                </td>
            `;

            studentList.appendChild(row);
        });

    } catch (error) {
        showMessage(error.message, "error");
    }
}

studentForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const course = document.getElementById("course").value.trim();

    if (!name || !course) {
        showMessage("Please fill all fields", "error");
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, course })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to add student");
        }

        studentForm.reset();
        await loadStudents();
        showMessage("Student added successfully!");

    } catch (error) {
        showMessage(error.message, "error");
    }
});

studentList.addEventListener("click", function(event) {
    const button = event.target;
    const id = button.dataset.id;

    if (!id) return;

    const row = button.closest("tr");

    if (button.classList.contains("edit-btn")) {
        studentToEdit = id;

        editName.value = row.cells[0].textContent;
        editCourse.value = row.cells[1].textContent;

        editModal.classList.remove("hidden");
    }

    if (button.classList.contains("delete-btn")) {
        studentToDelete = id;
        deleteModal.classList.remove("hidden");
    }
});

editForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const name = editName.value.trim();
    const course = editCourse.value.trim();

    if (!name || !course) {
        showMessage("Please fill all fields", "error");
        return;
    }

    if (!studentToEdit) return;

    try {
        const response = await fetch(`${API_URL}/${studentToEdit}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, course })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to update student");
        }

        editModal.classList.add("hidden");
        studentToEdit = null;

        await loadStudents();
        showMessage("Student updated successfully!");

    } catch (error) {
        showMessage(error.message, "error");
    }
});

cancelEdit.addEventListener("click", function() {
    editModal.classList.add("hidden");
    studentToEdit = null;
    editForm.reset();
});

cancelDelete.addEventListener("click", function() {
    deleteModal.classList.add("hidden");
    studentToDelete = null;
});

confirmDelete.addEventListener("click", async function() {
    if (!studentToDelete) return;

    confirmDelete.disabled = true;

    try {
        const response = await fetch(`${API_URL}/${studentToDelete}`, {
            method: "DELETE"
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to delete student");
        }

        deleteModal.classList.add("hidden");
        studentToDelete = null;

        await loadStudents();
        showMessage("Student deleted successfully!");

    } catch (error) {
        showMessage(error.message, "error");

    } finally {
        confirmDelete.disabled = false;
    }
});

editModal.addEventListener("click", function(event) {
    if (event.target === editModal) {
        editModal.classList.add("hidden");
        studentToEdit = null;
        editForm.reset();
    }
});

deleteModal.addEventListener("click", function(event) {
    if (event.target === deleteModal) {
        deleteModal.classList.add("hidden");
        studentToDelete = null;
    }
});

loadStudents();

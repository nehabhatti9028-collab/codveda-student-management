
import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'

function App() {
  const [students, setStudents] = useState([])
  const [name, setName] = useState('')
  const [course, setCourse] = useState('')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editCourse, setEditCourse] = useState('')
  const [studentToDelete, setStudentToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [token, setToken] = useState(
    () => localStorage.getItem('token') || ''
  )
  const [user, setUser] = useState(null)

  const [authMode, setAuthMode] = useState('login')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const [showAdminMenu, setShowAdminMenu] = useState(false)

  function authHeaders(extraHeaders = {}) {
    return {
      ...extraHeaders,
      Authorization: `Bearer ${token}`
    }
  }

  function logout() {
    localStorage.removeItem('token')
    setToken('')
    setUser(null)
    setStudents([])
    setShowAdminMenu(false)
    setMessage('You have been logged out')
  }

  async function handleAuth(e) {
    e.preventDefault()
    setMessage('')

    if (!authEmail.trim() || !authPassword.trim()) {
      setMessage('Please enter email and password')
      return
    }

    if (authMode === 'signup' && !authName.trim()) {
      setMessage('Please enter your name')
      return
    }

    setAuthLoading(true)

    try {
      const endpoint = authMode === 'signup'
        ? '/auth/signup'
        : '/auth/login'

      const body = authMode === 'signup'
        ? {
            name: authName.trim(),
            email: authEmail.trim(),
            password: authPassword
          }
        : {
            email: authEmail.trim(),
            password: authPassword
          }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.message || 'Authentication failed')
        return
      }

      if (authMode === 'signup') {
        setMessage('Account created successfully! Please login.')
        setAuthMode('login')
        setAuthName('')
        setAuthPassword('')
      } else {
        if (!data.token) {
          setMessage('Login successful, but token was not received')
          return
        }

        localStorage.setItem('token', data.token)
        setUser(null)
        setToken(data.token)
        setAuthPassword('')
        setMessage('')
      }
    } catch {
      setMessage('Unable to connect to the server')
    } finally {
      setAuthLoading(false)
    }
  }

  async function loadStudents() {
    try {
      const response = await fetch('/students', {
        headers: authHeaders()
      })

      if (response.status === 401 || response.status === 403) {
        logout()
        return
      }

      if (!response.ok) {
        throw new Error('Unable to load students')
      }

      const data = await response.json()
      setStudents(data)
    } catch {
      setMessage('Unable to load students')
    }
  }

  // Check logged-in user
  useEffect(() => {
    let ignore = false

    async function checkLogin() {
      if (!token) {
        setCheckingAuth(false)
        return
      }

      try {
        const response = await fetch('/auth/profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (!response.ok) {
          localStorage.removeItem('token')

          if (!ignore) {
            setToken('')
            setUser(null)
          }

          return
        }

        const data = await response.json()

        if (!ignore) {
          setUser(data.user)
        }
      } catch {
        if (!ignore) {
          setMessage('Unable to verify login')
        }
      } finally {
        if (!ignore) {
          setCheckingAuth(false)
        }
      }
    }

    checkLogin()

    return () => {
      ignore = true
    }
  }, [token])

  // Load students after login
  useEffect(() => {
    if (token && user) {
      loadStudents()
    }
  }, [token, user])

  // Socket.io real-time connection
  useEffect(() => {
    if (!token || !user) return

    const socket = io('http://localhost:3000')

    socket.on('connect', () => {
      console.log('Connected to Socket.io:', socket.id)
    })

    socket.on('students:changed', async () => {
      try {
        const response = await fetch('/students', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token')
          setToken('')
          setUser(null)
          setStudents([])
          return
        }

        if (!response.ok) {
          throw new Error('Unable to refresh students')
        }

        const data = await response.json()
        setStudents(data)

        console.log('Student records updated in real time')
      } catch (error) {
        console.error('Real-time update error:', error)
      }
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message)
    })

    return () => {
      socket.disconnect()
    }
  }, [token, user])

  async function addStudent(e) {
    e.preventDefault()

    if (!name.trim() || !course.trim()) {
      setMessage('Please fill all fields')
      return
    }

    try {
      const response = await fetch('/students', {
        method: 'POST',
        headers: authHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          name: name.trim(),
          course: course.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.message || 'Unable to add student')
        return
      }

      setName('')
      setCourse('')
      setMessage('Student added successfully!')
      await loadStudents()
    } catch {
      setMessage('Unable to add student')
    }
  }

  function startEdit(student) {
    setEditingId(student._id)
    setEditName(student.name)
    setEditCourse(student.course)
    setMessage('')
  }

  async function saveEdit(id) {
    if (!editName.trim() || !editCourse.trim()) {
      setMessage('Please fill all fields')
      return
    }

    try {
      const response = await fetch(`/students/${id}`, {
        method: 'PUT',
        headers: authHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          name: editName.trim(),
          course: editCourse.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.message || 'Unable to update student')
        return
      }

      setEditingId(null)
      setMessage('Student updated successfully!')
      await loadStudents()
    } catch {
      setMessage('Unable to update student')
    }
  }

  async function confirmDelete() {
    if (!studentToDelete) return

    setDeleting(true)

    try {
      const response = await fetch(
        `/students/${studentToDelete._id}`,
        {
          method: 'DELETE',
          headers: authHeaders()
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(data.message || 'Unable to delete student')
        return
      }

      setStudentToDelete(null)
      setMessage('Student deleted successfully!')
      await loadStudents()
    } catch {
      setMessage('Unable to delete student')
    } finally {
      setDeleting(false)
    }
  }

  const filteredStudents = students.filter(student =>
    `${student.name} ${student.course}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const totalCourses = new Set(
    students.map(student => student.course.toLowerCase())
  ).size

  if (checkingAuth) {
    return (
      <div className="app">
        <main className="container">
          Checking your login...
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={authPageStyle}>
        <div style={authCardStyle}>
          <h1 style={{ color: '#243047', marginBottom: '8px' }}>
            Student Management
          </h1>

          <p style={{ color: '#64748b', marginBottom: '25px' }}>
            {authMode === 'login'
              ? 'Login to access your dashboard'
              : 'Create your account to get started'}
          </p>

          <form onSubmit={handleAuth}>
            {authMode === 'signup' && (
              <input
                type="text"
                placeholder="Your full name"
                value={authName}
                onChange={e => setAuthName(e.target.value)}
                style={authInputStyle}
              />
            )}

            <input
              type="email"
              placeholder="Email address"
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              style={authInputStyle}
            />

            <input
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              style={authInputStyle}
            />

            <button
              type="submit"
              disabled={authLoading}
              style={authButtonStyle}
            >
              {authLoading
                ? 'Please wait...'
                : authMode === 'login'
                  ? 'Login'
                  : 'Create Account'}
            </button>
          </form>

          {message && (
            <p style={{ marginTop: '15px', color: '#2563eb' }}>
              {message}
            </p>
          )}

          <p style={authFooterStyle}>
            {authMode === 'login'
              ? "Don't have an account? "
              : 'Already have an account? '}

            <button
              type="button"
              onClick={() => {
                setAuthMode(
                  authMode === 'login' ? 'signup' : 'login'
                )
                setMessage('')
              }}
              style={switchAuthStyle}
            >
              {authMode === 'login' ? 'Sign up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Student Management</h1>
          <p>Manage your student records in one place</p>
          <p style={{ marginTop: '6px' }}>
            Welcome, {user.name}
          </p>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            className="header-label"
            onClick={() => setShowAdminMenu(!showAdminMenu)}
            aria-expanded={showAdminMenu}
            style={adminTriggerStyle}
          >
            ADMIN PANEL <span>▾</span>
          </button>

          {showAdminMenu && (
            <div style={adminMenuStyle}>
              <div style={profileIconStyle}>
                {user.name?.charAt(0).toUpperCase()}
              </div>

              <h3 style={{ color: '#243047', marginBottom: '5px' }}>
                Admin Profile
              </h3>

              <p style={profileNameStyle}>
                {user.name}
              </p>

              <p style={profileEmailStyle}>
                {user.email}
              </p>

              <div style={menuDividerStyle} />

              <p style={accountStatusStyle}>
                <span style={{ color: '#16a34a' }}>●</span>
                Account Active
              </p>

              <button
                onClick={logout}
                style={logoutButtonStyle}
              >
                <span>↪</span> Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="container">
        <div className="dashboard-heading">
          <div>
            <h2>Dashboard Overview</h2>
            <p>Here's what's happening with your students.</p>
          </div>
        </div>

        <section className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">👥</span>
            <p>Total Students</p>
            <h3>{students.length}</h3>
          </div>

          <div className="stat-card">
            <span className="stat-icon">📚</span>
            <p>Unique Courses</p>
            <h3>{totalCourses}</h3>
          </div>

          <div className="stat-card">
            <span className="stat-icon">🔎</span>
            <p>Search Results</p>
            <h3>{filteredStudents.length}</h3>
          </div>
        </section>

        <section className="form-section">
          <h2>Add New Student</h2>

          <form onSubmit={addStudent}>
            <input
              type="text"
              placeholder="Enter student name"
              value={name}
              onChange={e => setName(e.target.value)}
            />

            <input
              type="text"
              placeholder="Enter course name"
              value={course}
              onChange={e => setCourse(e.target.value)}
            />

            <button type="submit">Add Student</button>
          </form>

          {message && (
            <p className="message">{message}</p>
          )}
        </section>

        <section className="list-section">
          <div className="list-heading">
            <div>
              <h2>Student Records</h2>
              <p>View and manage all registered students</p>
            </div>

            <input
              className="search-input"
              type="search"
              placeholder="Search name or course..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student Name</th>
                  <th>Course</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((student, index) => (
                  <tr key={student._id}>
                    <td>{index + 1}</td>

                    <td>
                      {editingId === student._id ? (
                        <input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                        />
                      ) : (
                        student.name
                      )}
                    </td>

                    <td>
                      {editingId === student._id ? (
                        <input
                          value={editCourse}
                          onChange={e => setEditCourse(e.target.value)}
                        />
                      ) : (
                        student.course
                      )}
                    </td>

                    <td className="actions">
                      {editingId === student._id ? (
                        <>
                          <button
                            className="save-btn"
                            onClick={() => saveEdit(student._id)}
                          >
                            Save
                          </button>

                          <button
                            className="cancel-btn"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="edit-btn"
                            onClick={() => startEdit(student)}
                          >
                            Edit
                          </button>

                          <button
                            className="delete-btn"
                            onClick={() => setStudentToDelete(student)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan="4">
                      {search
                        ? 'No matching students found'
                        : 'No students found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {studentToDelete && (
        <div
          className="modal-overlay"
          onClick={() => !deleting && setStudentToDelete(null)}
        >
          <div
            className="delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="delete-icon">!</div>

            <h2 id="delete-title">Delete Student?</h2>

            <p>
              Are you sure you want to delete{' '}
              <strong>{studentToDelete.name}</strong>?
              This action cannot be undone.
            </p>

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setStudentToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                className="delete-btn"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const authPageStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f4f7fb',
  padding: '20px'
}

const authCardStyle = {
  background: '#fff',
  padding: '35px',
  borderRadius: '16px',
  width: '100%',
  maxWidth: '420px',
  boxShadow: '0 8px 30px rgba(0,0,0,0.08)'
}

const authInputStyle = {
  width: '100%',
  padding: '13px',
  marginBottom: '15px',
  border: '1px solid #dbe3ef',
  borderRadius: '8px',
  fontSize: '14px',
  boxSizing: 'border-box',
  background: '#fff',
  color: '#243047'
}

const authButtonStyle = {
  width: '100%',
  padding: '13px',
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '15px',
  fontWeight: '600'
}

const authFooterStyle = {
  marginTop: '22px',
  textAlign: 'center',
  color: '#64748b'
}

const switchAuthStyle = {
  border: 'none',
  background: 'none',
  color: '#2563eb',
  cursor: 'pointer',
  fontWeight: '600'
}

const adminTriggerStyle = {
  cursor: 'pointer',
  border: '1px solid #dbe3ef',
  padding: '10px 16px',
  borderRadius: '8px',
  background: '#fff',
  color: '#2563eb',
  fontWeight: '600'
}

const adminMenuStyle = {
  position: 'absolute',
  right: 0,
  top: '48px',
  width: '260px',
  background: '#fff',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 8px 30px rgba(0,0,0,0.14)',
  zIndex: 100
}

const profileIconStyle = {
  width: '45px',
  height: '45px',
  borderRadius: '50%',
  background: '#dbeafe',
  color: '#2563eb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '20px',
  fontWeight: '700',
  marginBottom: '14px'
}

const profileNameStyle = {
  color: '#243047',
  fontWeight: '600',
  fontSize: '14px'
}

const profileEmailStyle = {
  color: '#64748b',
  fontSize: '13px',
  marginTop: '5px',
  overflowWrap: 'anywhere'
}

const menuDividerStyle = {
  borderTop: '1px solid #e2e8f0',
  margin: '16px 0'
}

const accountStatusStyle = {
  color: '#475569',
  fontSize: '13px',
  marginBottom: '15px'
}

const logoutButtonStyle = {
  width: '100%',
  padding: '11px',
  border: 'none',
  borderRadius: '8px',
  background: '#fee2e2',
  color: '#dc2626',
  fontWeight: '600',
  cursor: 'pointer'
}

export default App

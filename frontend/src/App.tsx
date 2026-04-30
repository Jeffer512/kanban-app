
import { Route, Routes } from 'react-router'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import ProjectsPage from './pages/ProjectsPage'

function App() {
  return (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route 
      path="/" 
      element={
        <ProtectedRoute>
          <ProjectsPage />
        </ProtectedRoute>
      } 
    />
</Routes>
  )
}

export default App

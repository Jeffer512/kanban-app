
import { Route, Routes } from 'react-router'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import ProjectsPage from './pages/ProjectsPage'
import BoardsPage from './pages/BoardsPage'
import KanbanBoard from './pages/KanbanBoard'

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
    <Route 
      path="/projects/:projectId" 
      element={
        <ProtectedRoute>
          <BoardsPage />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/boards/:boardId" 
      element={
        <ProtectedRoute>
          <KanbanBoard />
        </ProtectedRoute>
      } 
    />
</Routes>
  )
}

export default App

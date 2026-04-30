import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getProjects } from '../api/kanbanService';
import { useAuth } from '../context/AuthContext';
import type { Project } from '../types/kanban';

const ProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await getProjects();
        setProjects(data);
      } catch {
        setError('Could not load projects. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <p className="text-text-muted animate-pulse">Loading your workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg p-6 sm:p-10">
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black text-text-main tracking-tight">
            Projects
          </h1>
          <p className="text-text-muted mt-1">
            Welcome back, <span className="text-text-main font-medium">{user?.username}</span>
          </p>
        </div>
        <button 
          onClick={logout}
          className="text-sm font-bold text-text-muted hover:text-text-main transition-colors cursor-pointer"
        >
          Logout
        </button>
      </header>

      <main className="max-w-7xl mx-auto">
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create Project Placeholder Card */}
          <button className="group flex flex-col items-center justify-center aspect-video rounded-2xl border-2 border-dashed border-border hover:border-text-main transition-all cursor-pointer">
            <span className="text-3xl text-text-muted group-hover:text-text-main transition-colors">+</span>
            <span className="text-sm font-bold text-text-muted group-hover:text-text-main mt-2">New Project</span>
          </button>

          {/* Project Cards */}
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="flex flex-col justify-between aspect-video p-6 rounded-2xl bg-card-bg border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              <h2 className="text-xl font-bold text-text-main truncate">
                {project.name}
              </h2>
              <div className="flex justify-between items-center">
                <span className="px-2.5 py-0.5 rounded-full bg-app-bg border border-border text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  {project.role}
                </span>
                <span className="text-[11px] text-text-muted">
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ProjectsPage;
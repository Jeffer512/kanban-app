import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getProjects, createProject, updateProject, deleteProject } from '../api/kanbanService';
import { CreateProjectSchema } from '../schemas/kanban';
import type { Project } from '../types/kanban';
import { useAuth } from '../context/AuthContext';
import { z } from 'zod';

const ProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');

  const { user, logout } = useAuth();

  // Load projects on mount
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

  // Real-time validation
  const validation = CreateProjectSchema.safeParse({ name: projectName });
  const nameError = !validation.success && projectName.length > 0 
    ? z.treeifyError(validation.error).properties?.name?.errors
    : null;

  const handleOpenCreateModal = () => {
    setProjectToEdit(null);
    setProjectName('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToEdit(project);
    setProjectName(project.name);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!validation.success) return;

    const backup = [...projects];
    setIsModalOpen(false);

    if (projectToEdit) {
      // Optimistic update
      setProjects(prev => prev.map(p => p.id === projectToEdit.id ? { ...p, name: projectName } : p));
      try {
        await updateProject(projectToEdit.id, projectName);
      } catch {
        setProjects(backup);
        setError('Failed to update project');
      }
    } else {
      // Optimistic create
      const tempId = crypto.randomUUID();
      const optimisticProject: Project = { 
        id: tempId, 
        name: projectName, 
        role: 'owner', 
        created_at: new Date().toISOString() 
      };
      setProjects(prev => [optimisticProject, ...prev]);

      try {
        const realProject = await createProject(projectName);
        setProjects(prev => prev.map(p => p.id === tempId ? { ...realProject, role: p.role } : p));
      } catch {
        setProjects(backup);
        setError('Failed to create project');
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this project?')) return;

    const backup = [...projects];
    // Optimistic delete
    setProjects(prev => prev.filter(p => p.id !== id));
    setActiveMenuId(null);

    try {
      await deleteProject(id);
    } catch {
      setProjects(backup);
      setError('Failed to delete project');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center">
      <p className="text-text-muted animate-pulse font-bold">Loading Workspace...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-app-bg p-6 sm:p-10 text-text-main">
      {/* HEADER */}
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Projects</h1>
          <p className="text-text-muted mt-1">Logged in as <span className="text-text-main font-bold">{user?.username}</span></p>
        </div>
        <button onClick={logout} className="text-sm font-bold text-text-muted hover:text-text-main cursor-pointer transition-colors">
          Logout
        </button>
      </header>

      <main className="max-w-7xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex justify-between">
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* NEW PROJECT BUTTON */}
          <button 
            onClick={handleOpenCreateModal}
            className="group flex flex-col items-center justify-center aspect-video rounded-2xl border-2 border-dashed border-border hover:border-text-main transition-all cursor-pointer"
          >
            <span className="text-3xl text-text-muted group-hover:text-text-main">+</span>
            <span className="text-sm font-bold text-text-muted group-hover:text-text-main mt-2">New Project</span>
          </button>

          {/* PROJECT LIST */}
          {projects.map((project) => (
            <div key={project.id} className="relative group">
              <Link
                to={`/projects/${project.id}`}
                className="flex flex-col justify-between aspect-video p-6 rounded-2xl bg-card-bg border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <h2 className="text-xl font-bold truncate pr-6">{project.name}</h2>
                <div className="flex justify-between items-center">
                  <span className="px-2 py-0.5 rounded-full bg-app-bg border border-border text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    {project.role}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>

              {/* PROJECT MENU TOGGLE */}
              <button 
                onClick={(e) => { e.preventDefault(); setActiveMenuId(activeMenuId === project.id ? null : project.id); }}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-app-bg text-text-muted hover:text-text-main cursor-pointer z-10"
              >
                ⋮
              </button>

              {/* DROPDOWN MENU */}
              {activeMenuId === project.id && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setActiveMenuId(null)} />
                  <div className="absolute top-12 right-4 w-36 bg-card-bg border border-border shadow-2xl rounded-xl z-30 py-2 overflow-hidden">
                    <button 
                      onClick={(e) => handleOpenEditModal(e, project)}
                      className="w-full text-left px-4 py-2 text-sm font-medium hover:bg-app-bg transition-colors"
                    >
                      Rename
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, project.id)}
                      className="w-full text-left px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* CREATE/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card-bg border border-border p-8 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{projectToEdit ? 'Rename Project' : 'New Project'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-main cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Project Name</label>
                <input
                  autoFocus
                  type="text"
                  className={`w-full p-3 rounded-xl bg-app-bg border ${nameError ? 'border-red-500' : 'border-border'} outline-none focus:ring-2 focus:ring-zinc-500/20 transition-all`}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
                {nameError && <p className="text-red-500 text-xs mt-2">{nameError}</p>}
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-text-muted hover:bg-app-bg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!validation.success}
                  className="flex-1 bg-text-main text-app-bg px-4 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-30 transition-all cursor-pointer"
                >
                  {projectToEdit ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
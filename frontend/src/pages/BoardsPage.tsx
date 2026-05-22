import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { getBoards, createBoard, updateBoard, deleteBoard } from '../api/kanbanService';
import { CreateBoardSchema } from '../schemas/kanban';
import type { Board } from '../types/kanban';
import { useSocket } from '../context/SocketContext';

const BoardsPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [boardToEdit, setBoardToEdit] = useState<Board | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [boardName, setBoardName] = useState('');

  const socket = useSocket();

  useEffect(() => {
    const fetchProjects = async () => {
      if (!projectId) return;
      try {
        const data = await getBoards(projectId);
        setBoards(data);
      } catch {
        setError('Could not load boards for this project. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();

    socket.emit('join-project', projectId);

    socket.on('project-updated', fetchProjects);

    return (() => {
      socket.off('project-updated');
      socket.emit('leave-project', projectId)
    })
  }, [projectId, socket]);

  // Real-time validation
  const validation = CreateBoardSchema.safeParse({ name: boardName });
  const nameError = !validation.success && boardName.length > 0 
    ? validation.error.issues[0].message 
    : null;

  const handleOpenCreateModal = () => {
    setBoardToEdit(null);
    setBoardName('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (e: React.MouseEvent, board: Board) => {
    e.preventDefault();
    e.stopPropagation();
    setBoardToEdit(board);
    setBoardName(board.name);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!validation.success || !projectId) return;

    const backup = [...boards];
    setIsModalOpen(false);
    if (boardToEdit) {
      // Optimistic update
      setBoards(prev => prev.map(b => b.id === boardToEdit.id ? { ...b, name: boardName } : b));
      try {
        await updateBoard(boardToEdit.id, boardName);
      } catch {
        setBoards(backup);
        setError('Failed to rename board');
      }
    } else {
      // Optimistic create
      const tempId = crypto.randomUUID();
      const optimisticBoard: Board = { 
        id: tempId, 
        name: boardName, 
        project_id: projectId,
        created_at: new Date().toISOString() 
      };
      setBoards(prev => [...prev, optimisticBoard]);

      try {
        const realBoard = await createBoard(projectId, boardName);
        // Replace temp with real data (real ID is needed for navigation)
        setBoards(prev => prev.map(b => b.id === tempId ? realBoard : b));
      } catch {
        setBoards(backup);
        setError('Failed to create board');
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this board? All columns and tasks will be lost.')) return;

    const backup = [...boards];
    // Optimistic delete
    setBoards(prev => prev.filter(b => b.id !== id));
    setActiveMenuId(null);

    try {
      await deleteBoard(id);
    } catch {
      setBoards(backup);
      setError('Failed to delete board');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center">
      <p className="text-text-muted animate-pulse font-bold">Loading Boards...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-app-bg p-6 sm:p-10 text-text-main">
      {/* HEADER */}
      <header className="max-w-7xl mx-auto mb-12">
        <Link to="/" className="text-sm font-bold text-text-muted hover:text-text-main transition-colors flex items-center gap-2 mb-4">
          ← Back to Projects
        </Link>
        <h1 className="text-4xl font-black tracking-tight">Project Boards</h1>
      </header>

      <main className="max-w-7xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex justify-between">
            {error}
            <button onClick={() => setError(null)} className="cursor-pointer">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* NEW BOARD BUTTON */}
          <button 
            onClick={handleOpenCreateModal}
            className="group flex flex-col items-center justify-center aspect-square rounded-2xl border-2 border-dashed border-border hover:border-text-main transition-all cursor-pointer"
          >
            <span className="text-3xl text-text-muted group-hover:text-text-main">+</span>
            <span className="text-xs font-bold uppercase tracking-widest text-text-muted group-hover:text-text-main mt-2">New Board</span>
          </button>

          {/* BOARDS LIST */}
          {boards.map((board) => (
            <div key={board.id} className="relative group">
              <Link
                to={`/boards/${board.id}`}
                className="flex flex-col justify-between aspect-square p-6 rounded-2xl bg-card-bg border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <h2 className="text-xl font-bold truncate pr-6">{board.name}</h2>
                <div className="flex justify-between items-center">

                  <span className="text-[10px] font-black text-text-muted uppercase bg-app-bg px-2 py-1 rounded border border-border self-start">
                    Kanban
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {new Date(board.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>

              {/* MENU TOGGLE */}
              <button 
                onClick={(e) => { e.preventDefault(); setActiveMenuId(activeMenuId === board.id ? null : board.id); }}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-app-bg text-text-muted hover:text-text-main cursor-pointer z-10"
              >
                ⋮
              </button>

              {/* DROPDOWN MENU */}
              {activeMenuId === board.id && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setActiveMenuId(null)} />
                  <div className="absolute top-12 right-4 w-36 bg-card-bg border border-border shadow-2xl rounded-xl z-30 py-2 overflow-hidden">
                    <button 
                      onClick={(e) => handleOpenEditModal(e, board)}
                      className="w-full text-left px-4 py-2 text-sm font-medium hover:bg-app-bg transition-colors cursor-pointer"
                    >
                      Rename
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, board.id)}
                      className="w-full text-left px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
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

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card-bg border border-border p-8 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">

              <h3 className="text-xl font-bold">{boardToEdit ? 'Rename Board' : 'New Board'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-main cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Board Name</label>
                <input
                  autoFocus
                  type="text"
                  className={`w-full p-3 rounded-xl bg-app-bg border ${nameError ? 'border-red-500' : 'border-border'} outline-none focus:ring-2 focus:ring-zinc-500/20 transition-all`}
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
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
                  {boardToEdit ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardsPage;
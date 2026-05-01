import React, { useState } from 'react';
import type { Task } from '../types/kanban';
import { CreateTaskSchema } from '../schemas/kanban';
import { z } from 'zod';

interface Props {
  initialData?: Task | null;
  onClose: () => void;
  onSubmit: (title: string, description: string) => void;
}

export const TaskModal = ({ initialData, onClose, onSubmit }: Props) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');

  const validation = CreateTaskSchema.safeParse({ 
    title, 
    description, 
    columnId: '00000000-0000-0000-0000-000000000000' // Dummy ID for validation
  });

  const titleError = !validation.success && title.length > 0 
    ? z.treeifyError(validation.error).properties?.title?.errors 
    : null;

  const descriptionError = !validation.success && title.length > 0 
    ? z.treeifyError(validation.error).properties?.description?.errors 
    : null;

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (validation.success) {
      onSubmit(title, description);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card-bg border border-border p-8 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">{initialData ? 'Edit Task' : 'New Task'}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-main cursor-pointer">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Title</label>
            <input
              autoFocus
              type="text"
              className={`w-full p-3 rounded-xl bg-app-bg border ${titleError ? 'border-red-500' : 'border-border'} outline-none focus:ring-2 focus:ring-zinc-500/20 transition-all`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {titleError && <p className="text-red-500 text-xs mt-2">{titleError}</p>}

          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-text-muted mb-2">Description</label>
            <textarea
              className={`w-full p-3 rounded-xl bg-app-bg border ${descriptionError ? 'border-red-500' : 'border-border'}  text-text-main outline-none focus:ring-2 focus:ring-zinc-500/20 h-32 resize-none`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {descriptionError && <p className="text-red-500 text-xs mt-2">{descriptionError}</p>}

          </div>
          
          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-text-muted hover:bg-app-bg transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={!validation.success}
              className="flex-1 bg-text-main text-app-bg px-4 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-30 transition-all cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
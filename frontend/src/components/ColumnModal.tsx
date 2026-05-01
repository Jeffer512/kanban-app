import React, { useState } from 'react';
import type { ColumnWithTasks } from '../types/kanban';
import { CreateColumnSchema } from '../schemas/kanban';

interface Props {
  initialData?: ColumnWithTasks | null;
  onClose: () => void;
  onSubmit: (title: string) => void;
}

export const ColumnModal = ({ initialData, onClose, onSubmit }: Props) => {
  const [title, setTitle] = useState(initialData?.title || '');

  const validation = CreateColumnSchema.safeParse({ title });

  const titleError = !validation.success && title.length > 0 
    ? validation.error.issues[0].message 
    : null;

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (validation.success) {
      onSubmit(title);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card-bg border border-border p-8 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">{initialData ? 'Edit Column' : 'New Column'}</h3>
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
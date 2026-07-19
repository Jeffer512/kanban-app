import React, { useState } from 'react';
import type { Task } from '../types/kanban';
import { CreateTaskSchema } from '../schemas/kanban';
import { z } from 'zod';
import { generateTaskContent } from '../api/kanbanService';

interface Props {
  initialData?: Task | null;
  onClose: () => void;
  onSubmit: (title: string, description: string) => void;
}

export const TaskModal = ({ initialData, onClose, onSubmit }: Props) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const validation = CreateTaskSchema.safeParse({ 
    title, 
    description, 
    columnId: '00000000-0000-0000-0000-000000000000'
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

  const handleAiAssist = async () => {
    if (!title.trim() || aiLoading) return;

    setAiLoading(true);
    setAiError(null);
    setAiSuggestion(null);

    try {
      const result = await generateTaskContent(title);
      setAiSuggestion(result.title);
      setDescription(result.description);
    } catch {
      setAiError('AI generation failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const acceptTitleSuggestion = () => {
    if (aiSuggestion) {
      setTitle(aiSuggestion);
      setAiSuggestion(null);
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

            {aiSuggestion && (
              <div className="mt-2 flex items-center gap-2 text-sm text-text-muted bg-zinc-500/10 rounded-xl px-3 py-2">
                <span>✨ Suggested: <span className="text-text-main font-medium">{aiSuggestion}</span></span>
                <button
                  type="button"
                  onClick={acceptTitleSuggestion}
                  className="ml-auto text-xs font-bold text-text-main hover:opacity-70 cursor-pointer px-2 py-1 rounded-lg border border-border"
                >
                  Use
                </button>
                <button
                  type="button"
                  onClick={() => setAiSuggestion(null)}
                  className="ml-1 text-text-muted hover:text-text-main cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-text-muted mb-2">Description</label>
            <textarea
              className={`w-full p-3 rounded-xl bg-app-bg border ${descriptionError ? 'border-red-500' : 'border-border'}  text-text-main outline-none focus:ring-2 focus:ring-zinc-500/20 h-32 resize-none`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {descriptionError && <p className="text-red-500 text-xs mt-2">{descriptionError}</p>}

            <button
              type="button"
              onClick={handleAiAssist}
              disabled={!title.trim() || aiLoading}
              className="mt-2 flex items-center gap-2 text-xs font-bold text-text-muted hover:text-text-main disabled:opacity-30 transition-all cursor-pointer px-3 py-1.5 rounded-xl border border-border hover:bg-zinc-500/5"
            >
              {aiLoading ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>✨ AI Assist</>
              )}
            </button>

            {aiError && <p className="text-red-500 text-xs mt-2">{aiError}</p>}
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
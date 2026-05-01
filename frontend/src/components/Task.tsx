import { useState } from "react";
import type { Task } from "../types/kanban";
import { Draggable } from '@hello-pangea/dnd';

interface Props {
  task: Task; // Removed optional/null since the parent maps over valid tasks
  index: number;
  onEdit: () => void;
  onDelete: (id: string) => void;
}

export const TaskCard = ({ task, index, onEdit, onDelete }: Props) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps} // This makes the WHOLE card the handle
          className={`group relative p-4 mb-3 bg-app-bg border border-border rounded-xl shadow-sm transition-all ${
            snapshot.isDragging ? 'shadow-2xl ring-2 ring-zinc-500/50 rotate-2' : ''
          }`}
        >
        {/* MENU TOGGLE */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-card-bg text-text-muted hover:text-text-main transition-all cursor-pointer z-10"
        >
          ⋮
        </button>

        {/* DROPDOWN MENU */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
            <div className="absolute top-8 right-2 bg-card-bg border border-border shadow-xl rounded-lg py-1 w-28 z-1000 overflow-hidden">
              <button 
                onClick={() => { onEdit(); setMenuOpen(false); }} 
                className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-app-bg transition-colors cursor-pointer"
              >
                Edit Task
              </button>
              <button 
                onClick={() => { onDelete(task.id); setMenuOpen(false); }} 
                className="w-full text-left px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                Delete Task
              </button>
            </div>
          </>
        )}

        {/* CONTENT */}
        <h4 className="text-sm font-bold text-text-main leading-tight pr-4">
          {task.title}
        </h4>

        {task.description && (
          <p className="mt-2 text-xs text-text-muted line-clamp-3 leading-relaxed">
            {task.description}
          </p>
        )}
        
      </div>
    )}
  </Draggable>
  );
};
import { useState } from "react";
import type { ColumnWithTasks, Task } from "../types/kanban";
import { TaskCard } from "./Task";

interface Props {
  column?: ColumnWithTasks | null;
  onEdit: (column: ColumnWithTasks) => void;
  onDelete: (id: string) => void;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (tasId: string) => void;
}

export const Column = ({ column, onEdit, onDelete, onAddTask, onEditTask, onDeleteTask } : Props) => {
  const [menuOpen, setMenuOpen] = useState(false);
  if (!column) return;
  return (
    <div className="relative bg-card-bg rounded-2xl border border-border flex flex-col flex-1 min-w-60 max-w-80 min-h-50">
      <div className="p-4 font-bold flex justify-between">
        {column.title}
        <button className="cursor-pointer" onClick={() => setMenuOpen(!menuOpen)}>⋮</button>
      </div>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-8 right-2 bg-card-bg border border-border shadow-xl rounded-lg py-1 w-24 z-30">
            <button onClick={() => {onEdit(column); setMenuOpen(false);}} className="w-full text-left px-3 py-1 hover:bg-app-bg">Edit</button>
            <button onClick={() => onDelete(column?.id)} className="w-full text-left px-3 py-1 text-red-500 hover:bg-app-bg">Delete</button>
          </div>
        </>
      )}
      
      <div className="flex-1 overflow-y-auto p-3">
        {column.tasks.map(task => (
          <TaskCard key={task.id} task={task} onEdit={() => onEditTask(task)} onDelete={onDeleteTask} />
        ))}
      </div>

      <button onClick={onAddTask} className="p-4 text-sm text-text-muted hover:text-text-main cursor-pointer">
        + Add Task
      </button>
    </div>
  );
};
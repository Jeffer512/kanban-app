import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { getFullBoard, createTask, updateTask, deleteTask,createColumn, updateColumn, deleteColumn, moveTask } from '../api/kanbanService';
import type { FullBoard, Task, ColumnWithTasks } from '../types/kanban';
import { Column } from '../components/Column';
import { TaskModal } from '../components/TaskModal';
import { ColumnModal } from '../components/ColumnModal';
import { DragDropContext } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';

const KanbanBoard = () => {
  const { boardId } = useParams<{ boardId: string }>();

  const [board, setBoard] = useState<FullBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [taskModal, setTaskModal] = useState<{ isOpen: boolean; task?: Task; columnId?: string }>({ isOpen: false });
  const [colModal, setColumnModal] = useState<{ isOpen: boolean; column?: ColumnWithTasks }>({ isOpen: false });

  useEffect(() => {
    const fetchBoard = async () => {
      if (boardId) {
        try {
          const data = await getFullBoard(boardId);
          setBoard(data);
        } catch {
          setError('Could not load data for this board. Please try again later.');
        } finally {
          setLoading(false);
        }
      }
    }
    fetchBoard();
  }, [boardId])

  // --- TASK ACTIONS ---

  const handleTaskSubmit = async (title: string, description: string) => {
    if (!board) return;
    const { task, columnId } = taskModal;
    const backup = structuredClone(board);

    try {
      if (task) {
        // Optimistic update
        setBoard({
          ...board,
          columns: board.columns.map(col => ({
            ...col,
            tasks: col.tasks.map(t => t.id === task.id ? { ...t, title, description } : t)
          }))
        });
        setTaskModal({ isOpen: false });
        await updateTask(task.id, { title, description });
      } else if (columnId) {
        // Optimistic create
        const tempId = crypto.randomUUID();
        const newTask: Task = { id: tempId, title, description, order_index: 999, created_at: new Date().toISOString() };
        
        setBoard({
          ...board,
          columns: board.columns.map(col => 
            col.id === columnId ? { ...col, tasks: [...col.tasks, newTask] } : col
          )
        });
        setTaskModal({ isOpen: false });
        const realTask = await createTask(columnId, title, description);
        // Replace temp with real
        setBoard(prev => ({
          ...prev!,
          columns: prev!.columns.map(col => ({
            ...col,
            tasks: col.tasks.map(t => t.id === tempId ? realTask : t)
          }))
        }));
      }
    } catch {
      setBoard(backup);
      setError(`Failed to ${task? "update" : "create"} task`);
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    if (!board) return;
    const backup = structuredClone(board);

    // Optimistic delete
    setBoard({
      ...board,
      columns: board.columns.map(col => ({
        ...col,
        tasks: col.tasks.filter(t => t.id !== taskId)
      }))
    });

    try {
      await deleteTask(taskId);
    } catch {
      setBoard(backup);
      setError('Failed to delete task');

    }
  };

  // --- COLUMN ACTIONS ---

  const handleColumnSubmit = async (title: string) => {
    if (!board || !boardId) return;
    const { column } = colModal;
    const backup = structuredClone(board);

    try {
      if (column) {
        // Optimistic update
        setBoard({
          ...board,
          columns: board.columns.map(c => c.id === column.id ? { ...c, title } : c)
        });
        setColumnModal({ isOpen: false });
        await updateColumn(column.id, title);
      } else {
        // Optimistic create
        const tempId = crypto.randomUUID();
        const newCol: ColumnWithTasks = { id: tempId, title, order_index: board.columns.length, created_at: new Date().toISOString(), tasks: [] };
        setBoard({ ...board, columns: [...board.columns, newCol] });
        setColumnModal({ isOpen: false });
        const realCol = await createColumn(boardId, title);
        setBoard(prev => ({
          ...prev!,
          columns: prev!.columns.map(c => c.id === tempId ? { ...realCol, tasks: [] } : c)
        }));
      }
    } catch {
      setBoard(backup);
      setError(`Failed to ${column? "update" : "create"} column`);
    }
  };

  const handleColumnDelete = async (columnId: string) => {
    if (!board || !window.confirm("Delete this column? All tasks in the column will be deleted")) return;
    const backup = structuredClone(board);

    // Optimistic delete
    setBoard({
      ...board,
      columns: board.columns.filter(c => c.id !== columnId)
    });

    try {
      await deleteColumn(columnId);
    } catch {
      setBoard(backup);
      setError("Failed to delete column");

    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const backup = structuredClone(board);
    const newBoard = structuredClone(board!);

    const sourceCol = newBoard.columns.find(c => c.id === source.droppableId);
    const destCol = newBoard.columns.find(c => c.id === destination.droppableId);

    if (!sourceCol || !destCol) return;

    const [movedTask] = sourceCol.tasks.splice(source.index, 1);
    destCol.tasks.splice(destination.index, 0, movedTask);

    setBoard(newBoard);

    try {
      await moveTask(draggableId, destination.droppableId, destination.index);
    } catch {
      setBoard(backup);
      alert("Failed to sync move with server");
    }
  };

  if (loading) return <div className="min-h-screen bg-app-bg" />;

  return (
    <div className="min-h-screen flex flex-col bg-app-bg px-8 pb-8 text-text-main">
      {/* HEADER */}
      <header className="py-5 px-6 sm:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-border">
        <div>
          {/* Link back to the specific project's boards */}
          <Link 
            to={`/projects/${board?.project_id}`} 
            className="text-sm font-bold text-text-muted hover:text-text-main transition-colors flex items-center gap-2 mb-2"
          >
            ← Back to Boards
          </Link>
          <h1 className="text-4xl font-black tracking-tight text-text-main">
            {board?.name}
          </h1>
        </div>
        
        <button 
          onClick={() => setColumnModal({ isOpen: true })}
          className="bg-text-main text-app-bg px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-zinc-900/20"
        >
          + Add Column
        </button>
      </header>

      {/* KANBAN GRID */}
      <DragDropContext onDragEnd={onDragEnd}>
        <main className="flex-1 flex flex-wrap gap-6 p-6 justify-center items-start">    
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex justify-between">
              {error}
              <button onClick={() => setError(null)}>✕</button>
            </div>
          )} 
          {board?.columns.map(column => (
            <Column 
              key={column.id} 
              column={column} 
              onEdit={(column) => setColumnModal({ isOpen: true, column })}
              onDelete={handleColumnDelete}
              onAddTask={() => setTaskModal({ isOpen: true, columnId: column.id })}
              onEditTask={(task) => setTaskModal({ isOpen: true, task })}
              onDeleteTask={handleTaskDelete}
            />
          ))}
          
          {/* Empty state prompt when no columns exist */}
          {board?.columns.length === 0 && (
            <div className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-2xl text-text-muted">
              <p className="font-bold">This board has no columns.</p>
              <p className="text-sm mt-1">Click "Add Column" to get started.</p>
            </div>
          )}
        </main>
      </DragDropContext>

      {/* MODALS */}
      {taskModal.isOpen && (
        <TaskModal 
          initialData={taskModal.task} 
          onClose={() => setTaskModal({ isOpen: false })} 
          onSubmit={handleTaskSubmit} 
        />
      )}

      {colModal.isOpen && (
        <ColumnModal 
          initialData={colModal.column} 
          onClose={() => setColumnModal({ isOpen: false })} 
          onSubmit={handleColumnSubmit} 
        />
      )}
    </div>
  );

};

export default KanbanBoard;
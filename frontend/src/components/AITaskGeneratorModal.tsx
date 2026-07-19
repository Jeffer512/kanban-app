import { useState } from 'react';
import { generateTasks } from '../api/kanbanService';

interface ColumnInfo {
  id: string;
  title: string;
}

interface GeneratedTask {
  title: string;
  description: string;
  suggestedColumn: string;
}

interface Props {
  columns: ColumnInfo[];
  onClose: () => void;
  onCreateTasks: (tasks: Array<{ columnId: string; title: string; description: string }>) => Promise<void>;
}

export const AITaskGeneratorModal = ({ columns, onClose, onCreateTasks }: Props) => {
  const [step, setStep] = useState<'input' | 'loading' | 'preview'>('input');
  const [prompt, setPrompt] = useState('');
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [taskColumns, setTaskColumns] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleGenerate = async () => {
    if (prompt.trim().length < 10) return;

    setStep('loading');
    setError(null);

    try {
      const columnTitles = columns.map(c => c.title);
      const result = await generateTasks(prompt, columnTitles);
      setGeneratedTasks(result.tasks);
      setSelectedIndices(new Set(result.tasks.map((_, i) => i)));

      const columnMap: Record<number, string> = {};
      result.tasks.forEach((task, i) => {
        const match = columns.find(c => c.title === task.suggestedColumn);
        columnMap[i] = match?.id ?? columns[0]?.id ?? '';
      });
      setTaskColumns(columnMap);
      setStep('preview');
    } catch {
      setError('Failed to generate tasks. Please try again.');
      setStep('input');
    }
  };

  const toggleTask = (index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const changeColumn = (index: number, columnId: string) => {
    setTaskColumns(prev => ({ ...prev, [index]: columnId }));
  };

  const handleCreate = async () => {
    const tasksToCreate = [...selectedIndices]
      .sort()
      .filter(i => taskColumns[i])
      .map(i => ({
        columnId: taskColumns[i],
        title: generatedTasks[i].title,
        description: generatedTasks[i].description,
      }));

    if (tasksToCreate.length === 0) return;

    setCreating(true);
    try {
      await onCreateTasks(tasksToCreate);
      onClose();
    } catch {
      setError('Failed to create tasks. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card-bg border border-border p-8 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">✨ Generate Tasks with AI</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-main cursor-pointer">✕</button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
            {error}
          </div>
        )}

        {step === 'input' && (
          <div className="space-y-4 flex-1 flex flex-col">
            <p className="text-sm text-text-muted">
              Describe the work you want to break into tasks. Be as specific as you like.
            </p>
            <textarea
              autoFocus
              className="w-full p-4 rounded-xl bg-app-bg border border-border text-text-main outline-none focus:ring-2 focus:ring-zinc-500/20 h-40 resize-none"
              placeholder="e.g. Set up CI/CD pipeline with GitHub Actions, including linting, testing, and deployment to staging..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div className="flex gap-3 pt-2 mt-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-text-muted hover:bg-app-bg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={prompt.trim().length < 10}
                className="flex-1 bg-text-main text-app-bg px-4 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-30 transition-all cursor-pointer"
              >
                Generate
              </button>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <span className="inline-block w-8 h-8 border-2 border-text-main border-t-transparent rounded-full animate-spin" />
            <p className="text-text-muted text-sm font-medium">Analyzing and generating tasks...</p>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-muted">
                {generatedTasks.length} tasks generated
              </p>
              <button
                type="button"
                onClick={() => {
                  if (selectedIndices.size === generatedTasks.length) {
                    setSelectedIndices(new Set());
                  } else {
                    setSelectedIndices(new Set(generatedTasks.map((_, i) => i)));
                  }
                }}
                className="text-xs font-bold text-text-muted hover:text-text-main transition-colors cursor-pointer"
              >
                {selectedIndices.size === generatedTasks.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-1">
              {generatedTasks.map((task, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl border transition-all ${
                    selectedIndices.has(i)
                      ? 'border-text-main/30 bg-zinc-500/5'
                      : 'border-border opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIndices.has(i)}
                      onChange={() => toggleTask(i)}
                      className="mt-1 w-4 h-4 rounded border-border accent-text-main cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-text-muted mt-1 line-clamp-2">{task.description}</p>
                      )}
                      <select
                        value={taskColumns[i] ?? ''}
                        onChange={(e) => changeColumn(i, e.target.value)}
                        className="mt-2 text-xs bg-app-bg border border-border rounded-lg px-2 py-1 text-text-muted outline-none cursor-pointer"
                      >
                        {columns.map(col => (
                          <option key={col.id} value={col.id}>
                            {col.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-text-muted hover:bg-app-bg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={selectedIndices.size === 0 || creating}
                className="flex-1 bg-text-main text-app-bg px-4 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-app-bg border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  `Create Selected (${selectedIndices.size})`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};  
import React, { useState } from 'react';
import { addProjectMembers } from '../api/kanbanService';
import type { ProjectRole } from '../types/kanban';

interface Props {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const InviteMembersModal = ({ projectId, onClose, onSuccess }: Props) => {
  const [rows, setRows] = useState([{ username: '', role: 'member' as ProjectRole }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRow = () => {
    setRows([...rows, { username: '', role: 'member' }]);
  };

  const updateRow = (index: number, field: 'username' | 'role', value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Filter out rows with empty usernames
      
      const validRows = rows.filter(r => r.username.trim() !== '');
      if (validRows.length === 0) throw new Error("Please enter at least one username");

      await addProjectMembers(projectId, validRows);
      onSuccess();
      onClose();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to invite users");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card-bg border border-border p-8 rounded-2xl w-full max-w-lg shadow-2xl">
        <h3 className="text-xl font-bold mb-6 text-text-main">Invite Members</h3>

        {error && (
          <p className="mb-4 p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
            {rows.map((row, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  placeholder="Username"
                  className="flex-1 p-2 rounded-xl bg-app-bg border border-border text-sm outline-none focus:ring-2 focus:ring-zinc-500/20"
                  value={row.username}
                  onChange={(e) => updateRow(index, 'username', e.target.value)}
                  required
                />
                <select
                  className="p-2 rounded-xl bg-app-bg border border-border text-sm outline-none cursor-pointer"
                  value={row.role}
                  onChange={(e) => updateRow(index, 'role', e.target.value)}
                >
                  <option value="viewer">Viewer</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="text-text-muted hover:text-red-500 p-2 cursor-pointer"
                  disabled={rows.length === 1}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="text-xs font-bold text-text-muted hover:text-text-main transition-colors cursor-pointer"
          >
            + Add another user
          </button>

          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl font-bold text-sm text-text-muted hover:bg-app-bg transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-text-main text-app-bg py-2 rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-30 transition-all cursor-pointer"
            >
              {isSubmitting ? 'Sending...' : 'Send Invitations'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
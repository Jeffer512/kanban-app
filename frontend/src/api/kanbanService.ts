import api from './axios';
import type { Project, Board, Column, Task } from '../types/kanban';

// --- PROJECTS ---
export const getProjects = async () => {
  const response = await api.get<Project[]>('/projects');
  return response.data;
};

export const createProject = async (name: string) => {
  const response = await api.post<Project>('/projects', { name });
  return response.data;
};

export const updateProject = async (id: string, name: string) => {
  const response = await api.patch<Project>(`/projects/${id}`, { name });
  return response.data;
};

export const deleteProject = async (id: string) => {
  await api.delete(`/projects/${id}`);
};

// --- BOARDS ---
export const getBoards = async (projectId: string) => {
  const response = await api.get<Board[]>(`/projects/${projectId}/boards`);
  return response.data;
};

export const createBoard = async (projectId: string, name: string) => {
  const response = await api.post<Board>(`/projects/${projectId}/boards`, { name });
  return response.data;
};
  
export const updateBoard = async (id: string, name: string) => {
  const response = await api.patch<Board>(`/boards/${id}`, { name });
  return response.data;
};

export const deleteBoard = async (id: string) => {
  await api.delete(`/boards/${id}`);
};
  
export const getFullBoard = async (boardId: string) => {
  const response = await api.get<Board & { columns: Column[] }>(`/boards/${boardId}/layout`);
  return response.data;
};

// --- COLUMNS ---
export const createColumn = async (boardId: string, title: string) => {
  const response = await api.post<Column>(`/boards/${boardId}/columns`, { title });
  return response.data;
};

export const updateColumn = async (id: string, title: string) => {
  const response = await api.patch<Column>(`/columns/${id}`, { title });
  return response.data;
};

export const deleteColumn = async (id: string) => {
  await api.delete(`/columns/${id}`);
};

// --- TASKS ---
export const createTask = async (columnId: string, title: string, description?: string) => {
  const response = await api.post<Task>(`/columns/${columnId}/tasks`, { title, description });
  return response.data;
};

export const updateTask = async (id: string, updates: Partial<Task>) => {
  const response = await api.patch<Task>(`/tasks/${id}`, updates);
  return response.data;
};

export const deleteTask = async (id: string) => {
  await api.delete(`/tasks/${id}`);
};

export const moveTask = async (taskId: string, newColumnId: string, newOrderIndex: number) => {
  await api.patch(`/tasks/${taskId}/move`, { newColumnId, newOrderIndex });
};
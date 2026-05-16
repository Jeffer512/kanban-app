interface BaseEntity {
  id: string;
  created_at: string;
}

export interface Project extends BaseEntity {
  name: string;
  role: string;
}

export interface Board extends BaseEntity {
  name: string;
  project_id: string;
}

export interface Column extends BaseEntity {
  title: string;
  order_index: number;
}

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  order_index: number;
}

export interface ColumnWithTasks extends Column {
  tasks: Task[];
}

export interface FullBoard extends Board {
  columns: ColumnWithTasks[];
}

export type ProjectRole = 'admin' | 'member' | 'viewer';

export interface ProjectMember {
  user_id: string;
  username: string;
  role: ProjectRole;
}

export type Invitation = {
  project_id: string;
  project_name: string;
  inviter: string;
}
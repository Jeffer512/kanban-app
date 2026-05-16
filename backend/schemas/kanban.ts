import { z } from 'zod';

/** 
 * ID Schema
 */
export const IdSchema = z.uuid();

/**
 * Project Schemas
 */
export const CreateProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
});

// Make all fields optional for PATCH requests
export const UpdateProjectSchema = CreateProjectSchema.partial();

/**
 * Board Schemas
 */
export const CreateBoardSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
});

export const UpdateBoardSchema = CreateBoardSchema.partial();

/**
 * Column Schemas
 */
export const CreateColumnSchema = z.object({
  title: z.string().min(1, "Title is required").max(50),
});

export const UpdateColumnSchema = CreateColumnSchema.partial();

/**
 * Task Schemas
 */
export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(50),
  description: z.string().max(300).nullable().optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

export const MoveTaskSchema = z.object({
  newColumnId: z.uuid(),
  newOrderIndex: z.number().int().min(0),
});

export const AddUsersSchema = z.object({
  newUsers: z.array(
    z.tuple([
      z.string().min(1).max(50), 
      z.enum(['owner', 'admin', 'member', 'viewer'])
    ])
  ).min(1, "At least one user must be provided")
});
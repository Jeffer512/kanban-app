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
  content: z.string().max(300).nullable().optional(),
  columnId: z.uuid(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

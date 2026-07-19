import type { Request, Response } from 'express';
import { z } from 'zod';
import { generateTaskContent, generateTasksFromPrompt } from '../services/gemini.ts';

const GenerateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(50),
});

const GenerateTasksSchema = z.object({
  prompt: z.string().min(10, "Prompt must be at least 10 characters").max(1000),
  columnTitles: z.array(z.string()).min(1, "At least one column is required"),
});

export async function generateTask(req: Request, res: Response) {
  const bodyResult = GenerateTaskSchema.safeParse(req.body);

  if (!bodyResult.success) {
    return res.status(400).json({ error: "Invalid data", details: z.treeifyError(bodyResult.error) });
  }

  const { title } = bodyResult.data;

  try {
    const result = await generateTaskContent(title);
    res.json(result);
  } catch (error) {
    console.error('Gemini generation failed:', error);
    res.status(502).json({ error: 'AI generation failed. Please try again.' });
  }
}

export async function generateTasks(req: Request, res: Response) {
  const bodyResult = GenerateTasksSchema.safeParse(req.body);

  if (!bodyResult.success) {
    return res.status(400).json({ error: "Invalid data", details: z.treeifyError(bodyResult.error) });
  }

  const { prompt, columnTitles } = bodyResult.data;

  try {
    const result = await generateTasksFromPrompt(prompt, columnTitles);
    res.json(result);
  } catch (error) {
    console.error('Gemini tasks generation failed:', error);
    res.status(502).json({ error: 'AI task generation failed. Please try again.' });
  }
}

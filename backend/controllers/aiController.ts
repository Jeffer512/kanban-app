import type { Request, Response } from 'express';
import { z } from 'zod';
import { generateTaskContent } from '../services/gemini.ts';

const GenerateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(50),
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


const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface TaskContent {
  title: string;
  description: string;
}


function buildTaskPrompt(title: string): string {
  return `You are a product manager helping a team write clear, concise task cards for a kanban board.

Given this raw task title: "${title}"

Suggest an improved title (max 100 characters) and write a concise 1-3 sentence description (max 1000 characters). Base the description only on what the title implies — do not invent additional context, requirements, or acceptance criteria.

Examples:

Title: "Implement JWT auth"
Response: { "title": "Implement JWT Authentication", "description": "Add JSON Web Token authentication to secure API endpoints. Generate tokens on login, validate on protected routes, and handle token expiration for enhanced security." }

Title: "Add dark mode support"
Response: { "title": "Add Dark Mode Toggle", "description": "Add a dark color scheme with a user-toggleable switch. Apply dark theme colors across the UI and ensure all components render correctly in both modes." }

Title: "Fix Login Bug"
Response: { "title": "Fix Login Authentication Error", "description": "Investigate and resolve the login failure affecting users. Root cause and specific fix to be determined during implementation." }

Respond in JSON format:
{ "title": "...", "description": "..." }`;
}

async function callGemini(prompt: string, maxTokens = 3000): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
      },
      
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini returned empty response');
  }

  return text;
}


export async function generateTaskContent(title: string): Promise<TaskContent> {
  const prompt = buildTaskPrompt(title);
  const raw = await callGemini(prompt, 3000);
  const parsed = JSON.parse(raw);

  const result: TaskContent = {
    title: String(parsed.title ?? title).slice(0, 100),
    description: String(parsed.description ?? '').slice(0, 1000),
  };

  return result;
}



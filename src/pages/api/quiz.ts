import type { NextApiRequest, NextApiResponse } from 'next';

type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

type QuizPayload = {
  title: string;
  questions: QuizQuestion[];
};

function getSystemPrompt(questionType: string) {
  if (questionType === 'true-false') {
    return `You are a quiz generator. Return ONLY valid JSON with this shape:
{
  "title": string,
  "questions": [
    {
      "question": string,
      "options": ["True", "False"],
      "answerIndex": number,
      "explanation": string
    }
  ]
}
Rules:
- Generate TRUE/FALSE questions only.
- Provide exactly the requested number of questions.
- Options must always be ["True", "False"] exactly.
- answerIndex must be 0 (for True) or 1 (for False).
- IMPORTANT: Vary the correct answers - DO NOT make all answers True or all answers False. Mix them up randomly.
- Create diverse and unique questions each time - avoid repetitive patterns.
- Aim for roughly balanced distribution of True and False answers.
- Explanations must be CollegeBoard/AP-level: precise, concept-driven, and 1–3 sentences.
- No markdown, no extra text, JSON only.`;
  }

  // Default: multiple-choice
  return `You are a quiz generator. Return ONLY valid JSON with this shape:
{
  "title": string,
  "questions": [
    {
      "question": string,
      "options": [string, string, string, string],
      "answerIndex": number,
      "explanation": string
    }
  ]
}
Rules:
- Generate MULTIPLE CHOICE questions only.
- Provide exactly the requested number of questions.
- Options must have 4 items and answerIndex must match the correct option (0-3).
- IMPORTANT: Vary the position of correct answers - DO NOT always put the correct answer in the same position.
- Create unique and diverse questions each time - be creative and avoid repetition.
- Make wrong options plausible but clearly distinct from the correct answer.
- Randomize which option slot (0-3) contains the correct answer for each question.
- Explanations must be CollegeBoard/AP-level: precise, concept-driven, and 1–3 sentences.
- No markdown, no extra text, JSON only.`;
}

function extractJson(text: string) {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  const slice = text.slice(first, last + 1);
  return slice;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mode, topic, studyGuide, questionType, count } = req.body || {};

  // Validate mode and content
  if (!mode || (mode !== 'topic' && mode !== 'studyGuide')) {
    return res.status(400).json({ error: 'Valid mode is required (topic or studyGuide)' });
  }

  const content = mode === 'topic' ? topic : studyGuide;
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: `${mode === 'topic' ? 'Topic' : 'Study guide'} is required` });
  }

  const safeCount = Math.min(Math.max(Number(count) || 10, 3), 50);
  const safeQuestionType = questionType || 'multiple-choice';

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GROQ_API_KEY' });
  }

  const model = 'llama-3.3-70b-versatile';

  try {
    const maxTokens = Math.min(8000, 800 + safeCount * 350);
    const SYSTEM_PROMPT = getSystemPrompt(safeQuestionType);
    
    const randomSeed = Math.random().toString(36).substring(7);
    const userPrompt = mode === 'topic'
      ? `Generate a UNIQUE and VARIED quiz on the following topic:\n\n${content}\n\nQuestion count: ${safeCount}\n\nMake this quiz different from any previous quizzes. Random seed: ${randomSeed}`
      : `Generate a UNIQUE quiz based ONLY on the following study guide content. Do not include information outside of this content:\n\n${content}\n\nQuestion count: ${safeCount}\n\nMake this quiz varied and different. Random seed: ${randomSeed}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.9,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text || 'Groq API error' });
    }

    const data = await response.json();
    const aiResponse: string = data?.choices?.[0]?.message?.content || '';
    const jsonText = extractJson(aiResponse) || aiResponse;

    let parsed: QuizPayload;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    if (!parsed?.questions?.length) {
      return res.status(500).json({ error: 'Invalid AI response format' });
    }

    // Trim to requested count if AI returned extra
    if (parsed.questions.length > safeCount) {
      parsed.questions = parsed.questions.slice(0, safeCount);
    }

    return res.status(200).json(parsed);
  } catch (error) {
    console.error('Quiz API error:', error);
    return res.status(500).json({ error: 'Server error', details: error instanceof Error ? error.message : String(error) });
  }
}

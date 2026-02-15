import type { NextApiRequest, NextApiResponse } from 'next';

type TrendingTopic = {
  id: string;
  title: string;
  category: string;
  icon: string;
};

const trendingTopics: TrendingTopic[] = [
  { id: '1', title: 'Artificial Intelligence & Machine Learning', category: 'Technology', icon: 'Brain' },
  { id: '2', title: 'World War II History', category: 'History', icon: 'Globe' },
  { id: '3', title: 'Organic Chemistry Reactions', category: 'Science', icon: 'FlaskConical' },
  { id: '4', title: 'Spanish Verb Conjugations', category: 'Language', icon: 'Languages' },
  { id: '5', title: 'Calculus: Derivatives & Integrals', category: 'Math', icon: 'Calculator' },
  { id: '6', title: 'Human Anatomy & Physiology', category: 'Biology', icon: 'Heart' },
  { id: '7', title: 'JavaScript ES6+ Features', category: 'Programming', icon: 'Code' },
  { id: '8', title: 'Climate Change & Environment', category: 'Science', icon: 'Leaf' },
  { id: '9', title: 'Ancient Greek Philosophy', category: 'Philosophy', icon: 'BookOpen' },
  { id: '10', title: 'Quantum Mechanics Basics', category: 'Physics', icon: 'Atom' },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Shuffle and return random 5 topics
    const shuffled = [...trendingTopics].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 5);
    
    return res.status(200).json({ topics: selected });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch trending topics' });
  }
}

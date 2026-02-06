export interface QuizQuestion {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
}

export interface QuizSettings {
    count?: number;
}

export interface QuizPayload {
    title: string;
    questions: QuizQuestion[];
}

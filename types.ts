
export interface Choice {
  id: string;
  text: string;
}

export type ProblemCategory = 'compulsory' | 'clinical';

export interface Problem {
  id: string;
  question: string;
  choices: Choice[];
  correctIndices: number[];
  isMultipleChoice: boolean;
  explanation: string;
  category: ProblemCategory;
  comments: string[]; // 追加
}

export interface ProblemSet {
  id: string;
  title: string;
  createdAt: number;
  problems: Problem[];
}

export type TabType = 'library' | 'create';

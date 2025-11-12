export type GoldExample = {
  id?: string;
  fileName: string;
  finalScore: number;
  notes?: string | null;
};

export type CalibrationProfile = {
  updated: number;
  timestamp: string;
};

export type SubmissionTask = {
  id: string;
  fileName: string;
  size?: number;
  status: 'Queued' | 'Running' | 'Done' | 'Failed';
  error?: string | null;
  submissionId?: string | null;
};

export type BatchJob = {
  id: string;
  total: number;
  completed: number;
  failed: number;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  parallelism: number;
  items: SubmissionTask[];
};

export type SubmissionResult = {
  submission_id: string;
  average_score: number;
};

export type RubricExport = {
  rubric_id: string;
  label: string;
  points_possible: number | null;
  avg_score: number;
  num_models: number;
};



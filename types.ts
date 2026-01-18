
export interface HealthMetrics {
  id?: string;
  systolic: number | '';
  diastolic: number | '';
  bloodSugar: number | '';
  timestamp: string;
}

export interface UserProfile {
  age: number;
  height: number;
  weight: number;
  goal: string;
  goalWeight: number;
}

export interface DailyGoals {
  water: { current: number; total: number };
  calories: { current: number; total: number };
  steps: { current: number; total: number };
}

export interface FoodLogEntry {
  id: string;
  query: string;
  verdict: string;
  rating: number;
  timestamp: string;
}

export interface AIStatus {
  label: string;
  color: 'green' | 'yellow' | 'red';
  description: string;
}

export interface FoodAnalysis {
  pros: string[];
  cons: string[];
  verdict: string;
  rating: number;
}

export interface AIResponse {
  overallSummary: string;
  bpStatus: AIStatus;
  sugarStatus: AIStatus;
  dietRecommendations: string[];
  lifestyleTips: string[];
  foodAnalysis?: FoodAnalysis;
}

export type Tab = 'dashboard' | 'logs' | 'coach';

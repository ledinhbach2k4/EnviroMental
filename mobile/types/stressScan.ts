export interface StressScanRequest {
  stressLevel: number;
  moodLevel?: number;
  sleepQuality?: number;
  energyLevel?: number;
  notes?: string;
}

export interface Recommendation {
  id: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  actionable?: boolean;
  estimatedTimeMinutes?: number;
}

export interface StressScanResult {
  id: number;
  userId: string;
  createdAt: string;
  stressScore: number;
  stressCategory: string;
  selfAssessmentScore: number;
  environmentalScore: number;
  scoreBreakdown?: any;
  sentiment?: any;
  environment?: any;
  recommendations: Recommendation[] | string[];
}

export interface StressScanHistoryItem {
  id: number;
  createdAt: string;
  stressLevel: number;
  moodLevel?: number;
  sleepQuality?: number;
  energyLevel?: number;
  stressScore: number;
  stressCategory: string;
  notes?: string;
  recommendations?: any[];
}

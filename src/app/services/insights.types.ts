// API types for insights

export interface TopicInsight {
  topicId: string;
  name: string;
  mastery: number; // 0-100
  accuracy: number; // 0-100
  avgTimeSeconds: number;
  attempts: number;
  errors: number;
  // optional parent summary attached to a topic (some endpoints may include this)
  parentSummary?: ParentSummary;
  // common errors observed for this topic (optional)
  commonErrors?: Array<{
    code?: string;
    name?: string;
    description?: string;
    count?: number;
    // allow backend-specific fields
    [k: string]: any;
  }>;
  // alternate place where backend may return subtopic breakdown
  subtopicBreakdown?: Array<{
    subtopicId?: string;
    name?: string;
    mastery?: number;
    accuracy?: number;
    attempts?: number;
    [k: string]: any;
  }>;
  subtopics?: Array<{
    subtopicId: string;
    name: string;
    mastery: number;
    accuracy: number;
    avgTimeSeconds: number;
    attempts: number;
  }>;
}

export interface Recommendation {
  id: string;
  title: string;
  description?: string;
  reason?: string[];
  targetDifficulty?: number;
  suggestedWorksheetId?: string;
}

export interface ParentSummary {
  notes?: string;
  suggestedAt?: string;
  contactNeeded?: boolean;
  // optional free-form summary text
  summary?: string;
  // recommended actions for the parent to take
  recommendedActions?: string[];
}

export interface RecommendationDetail {
  recommendedLevel?: number | string;
  targetDifficulty?: number;
  rationale?: string[] | string;
  suggestedWorksheetId?: string;
  [k: string]: any;
}

export interface FullInsightsResponse {
  studentId: string;
  studentName?: string;
  avatar?: string;
  grade?: string;
  // optional overall student level
  level?: number;
  age?: number;
  xp?: number;
  streak?: number;
  lastUpdated?: string;

  topics: TopicInsight[];
  topicId?: string;
  recommendations?: Recommendation[];
  parentSummary?: ParentSummary;
}


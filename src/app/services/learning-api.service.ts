import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { auth } from '../firebase/firebase.config';


export interface AccessCodeValidationResponse {
  valid: boolean;
  studentId?: string;
  studentName?: string;
  grade?: string;
  accessCode?: string;
  message?: string;
  firstTime?: boolean;
}

export interface ParentStudentSummary {
  id: string;
  name: string;
  grade: string;
  masterySummary: string;
  upcomingTests: string[];
  accessCode?: string;
}

export interface ParentStudentsResponse {
  students: ParentStudentSummary[];
}

export interface StudentCreateRequest {
  childName: string;
  grade: string;
}

export interface StudentCreateResponse {
  studentId: string;
  childName: string;
  grade: string;
  accessCode: string;
}

export interface StudentUpdateRequest {
  childName: string;
  grade: string;
}

export interface GenerateAccessCodeResponse {
  accessCode: string;
}

export interface TopicOption {
  id: string;
  name: string;
  grades: string;
  subtopics: []
}

export interface DiagnosticQuestion {
  id: string;
  prompt: string;
  choices: string[];
}

export interface DiagnosticStartResponse {
  diagnosticId: string;
  grade: string;
  questions: DiagnosticQuestion[];
}

export interface DiagnosticSubmitResponse {
  score: number;
  nextGrade: string;
}

export interface PracticeWorksheetQuestion {
  id: string;
  prompt: string;
  type: 'short_text' | 'multiple_choice';
  choices?: string[];
  layout?: 'horizontal' | 'vertical' | 'horizontal_with_hint';

  metadata?: {
    top?: number;
    bottom?: number;
    [key: string]: unknown;
  };
}

export interface PracticeWorksheetRequest {
  studentId?: string;
  grade: string;
  topic: string[];
  level: string;
  questionCount: number;
  source?: 'recommended' | 'practice' | 'diagnostic-followup';
}

export interface PracticeWorksheetResponse {
  worksheetId: string;
  recommendedLabel: string;
  title: string;
  instructions: string;
  grade: string;
  topic: string;
  level: string;
  questionCount: number;
  questions: PracticeWorksheetQuestion[];
  generatedAt?: string;
}

/* ---------------- V2 MULTI-TOPIC REQUEST ---------------- */

export interface PracticeWorksheetV2Request {
  studentId?: string;
  grade: string;
  topics: string[];   // MULTIPLE TOPICS
  level: string;
  skills?: string[];
  questionCount: number;
  source?: 'recommended' | 'practice' | 'diagnostic-followup';
}

export interface PracticeWorksheetV2Response {
  worksheetId: string;
  recommendedLabel: string;
  title: string;
  instructions: string;
  grade: string;
  topics: string[];   // MULTIPLE TOPICS
  level: string;
  questionCount: number;
  questions: PracticeWorksheetQuestion[];
  generatedAt?: string;
  topic: string
}


export interface TopicDetailResponse {
  id: string;
  name: string;
  description: string;
  subtopics: string[];
  mastery: any;
  difficultyTiers: Record<string, string>;
}

export interface FullInsightsResponse {
  mastery: any;
  masteryByTopic: Array<{ topic: string; mastery: number }>;
  level: string;
  worksheetsCompleted: number;
  accuracy: number;
  speed: number;
  recommendations: string[];
}

export interface ScheduledTestsResponse {
  biWeekly: string[];
  monthly: string[];
  quarterly: string[];
}

export interface SurpriseTestResponse {
  surpriseId: string;
  questions: DiagnosticQuestion[];
}

export interface ProgressOverviewTopic {
  studentId: string;
  topicId: string;
  topicName: string;
  worksheetsCompleted: number;
  testsTotal: number;
  testsPassed: number;
  currentBlock: number;
  nextTestDueAt: number;
  mastery: number;
  level: string;
  status: string;
  remediationCount: number;
  updatedAt: string;

  // Enhanced fields
  worksheetsRemainingUntilTest: number;
  blockProgressPercent: number;
  testsRemaining: number;
  isTestUnlocked: boolean;
  isRemediationRequired: boolean;
  isMastered: boolean;
}

export interface ProgressOverviewResponse {
  studentId: string;
  topicsInProgress: ProgressOverviewTopic[];
  topicsMastered: ProgressOverviewTopic[];
  recommendedNextTopicId: string | null;
  totalTopicsAvailable: number;
}

/* ================== V2.0 WORLD-CLASS MATH SYLLABUS ================== */

// New question types for v2.0
export type QuestionType =
  | 'short_text'
  | 'multiple_choice'
  | 'multi_select'
  | 'drag_and_drop'
  | 'number_pad'
  | 'fraction_input'
  | 'decimal_input'
  | 'percent_input'
  | 'graph_interpretation'
  | 'conceptual_explanation'
  | 'reasoning_puzzle'
  | 'competition_problem';

// New worksheet template types
export type WorksheetTemplate =
  | 'standard'
  | 'fluency-drill'
  | 'multi-select'
  | 'drag-and-drop'
  | 'graph-interpretation'
  | 'conceptual-explanation'
  | 'reasoning-puzzle'
  | 'competition-problem';

// Skill definition
export interface Skill {
  id: string;
  name: string;
  description: string;
  mastery: number;
  masteryDelta?: number;
}

// Domain definition
export interface Domain {
  id: string;
  name: string;
  mastery: number;
  skills: Skill[];
}

// Study material types
export interface StudyMaterial {
  id: string;
  type: 'concept' | 'video' | 'worksheet' | 'quiz' | 'example';
  title: string;
  description: string;
  url?: string;
  duration?: number;
  difficulty?: string;
}

// Enhanced topic for v2.0
export interface EnhancedTopicV2 {
  id: string;
  name: string;
  description: string;
  cbseGrade: number;
  gradeBand: string;
  practiceLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Mastery';
  kumonBand: string;
  progress: number;
  skills: Skill[];
  domains: Domain[];
  domainTags: string[];
  difficultyScore: number;
  ritBand: string;
  studyMaterials: StudyMaterial[];
  recommendedNextSkills: Skill[];
  masterySummary: {
    topic: number;
    skills: Record<string, number>;
    domains: Record<string, number>;
  };
}

// Enhanced worksheet question for v2.0
export interface EnhancedWorksheetQuestionV2 {
  id: string;
  prompt: string;
  type: QuestionType;
  template: WorksheetTemplate;
  choices?: string[];
  correctAnswer?: string | string[] | number | number[];
  expectedAnswer?: string | string[] | number | number[];
  submittedAnswer?: string | string[] | number | number[];
  metadata?: Record<string, any>;
  mastery?: number;
  masteryDelta?: number;
  correct?: boolean;
  skills?: string[];
  domains?: string[];
}

// Enhanced worksheet response for v2.0
export interface EnhancedWorksheetResponseV2 {
  worksheetId: string;
  title: string;
  instructions: string;
  grade: string;
  gradeBand: string;
  topics: string[];
  skills: string[];
  domains: string[];
  level: string;
  template: WorksheetTemplate;
  questionCount: number;
  questions: EnhancedWorksheetQuestionV2[];
  generatedAt?: string;
  estimatedDuration?: number;
}

// Enhanced submission response for v2.0
export interface EnhancedSubmissionResponseV2 {
  worksheetId: string;
  studentId: string;
  accuracy: number;
  mastery: number;
  masteryDelta: number;
  speedSeconds: number;
  level: string;
  results: EnhancedWorksheetQuestionV2[];
  recommendations: string[];
  skillMastery: Record<string, {
    skill: string;
    mastery: number;
    masteryDelta: number;
  }>;
  domainMastery: Record<string, {
    domain: string;
    mastery: number;
    masteryDelta: number;
  }>;
  nextRecommendedTopics: string[];
  nextRecommendedSkills: string[];
  certificateEarned?: boolean;
  badgesEarned?: string[];
}

/* ==================== END V2.0 INTERFACES ==================== */

@Injectable({ providedIn: 'root' })
export class LearningApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl.replace(/\/$/, '');

  async validateAccessCode(accessCode: string): Promise<AccessCodeValidationResponse> {
    const payload = { accessCode };

    try {
      return await firstValueFrom(
        this.http.post<AccessCodeValidationResponse>(`${this.apiBase}/students/access-code`, payload),
      );
    } catch {
      if (/^\d{6,8}$/.test(accessCode)) {
        return {
          valid: true,
          studentId: `student-${accessCode}`,
          studentName: 'Student',
          grade: '4',
          accessCode,
          firstTime: false,
        };
      }
      return { valid: false, message: 'Invalid access code.' };
    }
  }

  async getParentStudents(): Promise<ParentStudentSummary[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await firstValueFrom(
        this.http.get<ParentStudentsResponse>(`${this.apiBase}/students/parent`, { headers }),
      );
      return response.students ?? [];
    } catch {
      return [];
    }
  }

  async createStudent(payload: StudentCreateRequest): Promise<StudentCreateResponse> {
    const headers = await this.getAuthHeaders();
    return await firstValueFrom(
      this.http.post<StudentCreateResponse>(`${this.apiBase}/students/create`, payload, { headers }),
    );
  }


  async updateStudent(studentId: string, payload: StudentUpdateRequest): Promise<void> {
    const headers = await this.getAuthHeaders();
    await firstValueFrom(
      this.http.patch<void>(`${this.apiBase}/students/${encodeURIComponent(studentId)}`, payload, { headers }),
    );
  }


  async generateAccessCode(studentId: string): Promise<GenerateAccessCodeResponse> {
    const headers = await this.getAuthHeaders();
    return await firstValueFrom(
      this.http.post<GenerateAccessCodeResponse>(
        `${this.apiBase}/students/${encodeURIComponent(studentId)}/generate-access-code`,
        {},
        { headers },
      ),
    );
  }


  async startDiagnostic(grade: string, topics: string[]): Promise<DiagnosticStartResponse> {
    const params = new URLSearchParams();
    params.set('grade', grade);
    if (topics.length) {
      params.set('topics', topics.join(','));
    }

    try {
      return await firstValueFrom(
        this.http.get<DiagnosticStartResponse>(`${this.apiBase}/diagnostic/start?${params.toString()}`),
      );
    } catch {
      return {
        diagnosticId: `diag-${Date.now()}`,
        grade,
        questions: Array.from({ length: 20 }).map((_, index) => ({
          id: `q-${index + 1}`,
          prompt: `Question ${index + 1}: Choose the best answer.`,
          choices: ['A', 'B', 'C', 'D'],
        })),
      };
    }
  }

  submitDiagnostic(diagnosticId: string, answers: Record<string, string>) {
    return this.http.post<DiagnosticSubmitResponse>(`${this.apiBase}/diagnostic/submit`, {
      diagnosticId,
      answers,
    });
  }

  async getCurriculumTopicsByGrade(grade: string): Promise<TopicOption[]> {
    const response = await firstValueFrom(
      this.http.get<{ topics?: TopicOption[] }>(
        `${this.apiBase}/curriculum/topics?grade=${encodeURIComponent(grade)}`,
      ),
    );
    return (response.topics ?? []).filter((topic) => !!topic.id && !!topic.name);
  }

  async getTopicDetail(topicId: string): Promise<TopicDetailResponse> {
    try {
      return await firstValueFrom(
        this.http.get<TopicDetailResponse>(`${this.apiBase}/curriculum/topic/${encodeURIComponent(topicId)}`),
      );
    } catch (err: any) {
      if (err?.status === 404) {
        throw new Error(`Topic '${(topicId || '').toLowerCase()}' was not found in EnhancedSyllabus.`);
      }
      throw err;
    }
  }

  createPracticeWorksheetV1(payload: PracticeWorksheetRequest) {
    // Normalize topic IDs to lowercase before sending to backend
    const normalized = {
      ...payload,
      topic: Array.isArray(payload.topic) ? payload.topic.map((t) => t.toLowerCase()) : [],
    } as PracticeWorksheetRequest;
    return this.http.post<PracticeWorksheetResponse>(`${this.apiBase}/v1/practice/worksheet`, normalized);
  }

  async getFullInsights(studentId: string): Promise<FullInsightsResponse> {
    return await firstValueFrom(
      this.http.get<FullInsightsResponse>(
        `${this.apiBase}/insights/full/${encodeURIComponent(studentId)}`,
      ),
    );
  }

  async getScheduledTests(studentId: string): Promise<ScheduledTestsResponse> {
    return await firstValueFrom(
      this.http.get<ScheduledTestsResponse>(
        `${this.apiBase}/tests/scheduled/${encodeURIComponent(studentId)}`,
      ),
    );
  }

  async getSurpriseTest(): Promise<SurpriseTestResponse> {
    return await firstValueFrom(this.http.get<SurpriseTestResponse>(`${this.apiBase}/tests/surprise`));
  }

  submitSurpriseTest(payload: {
    testId: string;
    answers: Array<{ questionId: string; answer: number }>;
    studentId?: string;
  }) {
    return this.http.post(`${this.apiBase}/tests/surprise/submit`, payload);
  }

  generateAiWorksheet(payload: { topicId: string; grade: string; level: string }) {
    return this.http.post(`${this.apiBase}/ai/worksheet`, payload);
  }

  private async getAuthHeaders() {
    const token = await auth.currentUser?.getIdToken();
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async submitPracticeWorksheetV1(payload: {
    studentId: string | null;
    worksheetId: string | undefined;
    answers: Record<string, string>;
  }, idempotencyKey: string) {

    return this.http.post(
      `${this.apiBase}/v1/practice/worksheet/submit`,
      payload,
      {
        headers: {
          ...(await this.getAuthHeaders()),
          'Idempotency-Key': idempotencyKey
        }
      }
    );
  }


  /* ---------------- Curriculum V2 ---------------- */

  async getCurriculumTopicsV2(grade: string): Promise<any[]> {
    const response = await firstValueFrom(
      this.http.get<{ topics: any[] }>(
        `${this.apiBase}/curriculum/topics-v2?grade=${encodeURIComponent(grade)}`
      )
    );
    return response.topics ?? [];
  }

  /* ---------------- Worksheet V2 (MULTI-TOPIC) ---------------- */

  async createPracticeWorksheetV2(payload: PracticeWorksheetV2Request): Promise<PracticeWorksheetV2Response> {
    // Ensure topics are normalized to lowercase and use modular topic IDs
    const normalizedPayload: PracticeWorksheetV2Request = {
      ...payload,
      topics: Array.isArray(payload.topics) ? payload.topics.map((t) => t.toLowerCase()) : [],
      skills: Array.isArray((payload as any).skills)
        ? (payload as any).skills.map((s: string) => s.toLowerCase())
        : undefined,
    };

    return await firstValueFrom(
      this.http.post<PracticeWorksheetV2Response>(`${this.apiBase}/v2/practice/worksheet`, normalizedPayload),
    );
  }

  // progression API additions

  getProgressOverview(studentId: string) {
    return this.http.get<ProgressOverviewResponse>(
      `${this.apiBase}/progression/${studentId}/overview`
    );
  }

  getTopicProgress(studentId: string, topicId: string) {
    return this.http.get(
      `${this.apiBase}/progression/${studentId}/topics/${topicId}`
    );
  }

  createScheduledTest(studentId: string, topicId: string) {
    return this.http.post(
      `${this.apiBase}/progression/${studentId}/topics/${topicId}/test`,
      {}
    );
  }

  createAdhocTest(studentId: string, topicId: string) {
    return this.http.post(
      `${this.apiBase}/progression/${studentId}/topics/${topicId}/tests/adhoc`,
      {}
    );
  }

  createRemediationWorksheet(studentId: string, topicId: string) {
    return this.http.post(
      `${this.apiBase}/progression/${studentId}/topics/${topicId}/remediation`,
      {}
    );
  }

  /** Fetch skills for a given topic from the modular syllabus */
  getSkillsByTopic(topicId: string) {
    const normalized = (topicId || '').toLowerCase();
    return this.http.get<{ skills: Skill[] }>(`${this.apiBase}/syllabus/skills?topicId=${encodeURIComponent(normalized)}`);
  }

  advanceTopic(studentId: string, topicId: string) {
    return this.http.post(
      `${this.apiBase}/progression/${studentId}/topics/${topicId}/advance`,
      {}
    );
  }

  async getWorksheetHistory(studentId: string): Promise<any[]> {
    return await firstValueFrom(
      this.http.get<any[]>(
        `${this.apiBase}/insights/worksheets/${encodeURIComponent(studentId)}/history`
      )
    );
  }
}


import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { type MasteryState } from '../core/mastery/mastery-engine.service';
import { environment } from '../../environments/environment';

export type PuzzleType =
  | 'pattern'
  | 'missing-number'
  | 'sequence'
  | 'comparison'
  | 'arithmetic'
  | 'logic'
  | 'mcq';

export type PuzzleInputType = 'numeric' | 'text' | 'mcq';

export interface PuzzleMetadata {
  inputType?: PuzzleInputType;
  layout?: 'inline' | 'grid';
  skillId?: string;
  options?: string[];
  correctAnswer?: string;
}

export interface DynamicPuzzle {
  puzzleId: string;
  puzzleText: string;
  type: PuzzleType;
  metadata?: PuzzleMetadata;
}

export interface GeneratePuzzlesResponse {
  puzzleSessionId: string;
  puzzles: DynamicPuzzle[];
}

export interface PuzzleSubmitResult {
  puzzleId: string;
  correct: boolean;
  studentAnswer: string;
  correctAnswer: string;
}

export interface SubmitPuzzleAnswersPayload {
  studentId: string;
  puzzleSessionId: string;
  answers: Array<{
    puzzleId: string;
    answer: string | number;
  }>;
}

export interface SubmitPuzzleAnswersResponse {
  score: number;
  total: number;
  results: Array<{
    puzzleId: string;
    correct: boolean;
    correctAnswer?: string | number;
  }>;
  masterySummary?: Record<string, { level: string; accuracy: number; attempts: number; speed: number }>;
  mastery?: MasteryState;
}

@Injectable({
  providedIn: 'root',
})
export class PuzzleEngineService {
  private readonly apiRoot = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  generatePuzzles(skillId: string, difficulty: number): Observable<GeneratePuzzlesResponse> {
    const payload = {
      skillId: skillId.trim() || 'reasoning-patterns-and-classification',
      difficulty: Number.isFinite(difficulty)
        ? Math.max(1, Math.min(100, Math.round(difficulty)))
        : 50,
      count: 3,
    };
    return this.http
      .post<unknown>(`${this.apiRoot}/puzzles/generate`, payload)
      .pipe(map((response) => this.mapPuzzleResponse(response)));
  }

  submitPuzzleAnswers(payload: SubmitPuzzleAnswersPayload): Observable<SubmitPuzzleAnswersResponse> {
    const normalizedPayload: SubmitPuzzleAnswersPayload = {
      studentId: String(payload.studentId ?? '').trim(),
      puzzleSessionId: String(payload.puzzleSessionId ?? '').trim(),
      answers: Array.isArray(payload.answers) ? payload.answers : [],
    };

    return this.http
      .post<unknown>(`${this.apiRoot}/puzzles/submit`, normalizedPayload)
      .pipe(map((response) => this.mapSubmissionResponse(response)));
  }

  mapPuzzleResponse(raw: unknown): GeneratePuzzlesResponse {
    const response = raw as {
      puzzleSessionId?: unknown;
      puzzles?: unknown;
      challengeId?: unknown;
      prompt?: unknown;
      answer?: unknown;
      gamePayload?: { type?: unknown; metadata?: unknown; options?: unknown; correctAnswer?: unknown } | null;
    };

    const mappedPuzzles = Array.isArray(response?.puzzles)
      ? response.puzzles
          .map((puzzle, index) => this.normalizePuzzle(puzzle, index))
          .filter((puzzle) => puzzle.puzzleText.length > 0)
      : [];

    if (mappedPuzzles.length > 0) {
      return {
        puzzleSessionId: String(response.puzzleSessionId ?? '').trim() || `session-${Date.now()}`,
        puzzles: mappedPuzzles,
      };
    }

    const fallbackPuzzle = this.normalizePuzzle(
      {
        puzzleId: response?.challengeId,
        puzzleText: response?.prompt,
        type: response?.gamePayload?.type,
        correctAnswer: response?.answer ?? response?.gamePayload?.correctAnswer,
        metadata: {
          ...(typeof response?.gamePayload?.metadata === 'object' && response.gamePayload?.metadata
            ? (response.gamePayload.metadata as Record<string, unknown>)
            : {}),
          options: Array.isArray(response?.gamePayload?.options)
            ? response.gamePayload.options.map((value) => String(value))
            : undefined,
        },
      },
      0,
    );

    return {
      puzzleSessionId:
        String(response?.puzzleSessionId ?? response?.challengeId ?? '').trim() || `session-${Date.now()}`,
      puzzles: fallbackPuzzle.puzzleText.length > 0 ? [fallbackPuzzle] : [],
    };
  }

  mapSubmissionResponse(raw: unknown): SubmitPuzzleAnswersResponse {
    const response = raw as {
      score?: unknown;
      total?: unknown;
      results?: Array<{ puzzleId?: unknown; correct?: unknown; correctAnswer?: unknown }>;
      masterySummary?: Record<string, { level: string; accuracy: number; attempts: number; speed: number }>;
      mastery?: MasteryState;
    };

    return {
      score: Number.isFinite(Number(response?.score)) ? Number(response?.score) : 0,
      total: Number.isFinite(Number(response?.total)) ? Number(response?.total) : 0,
      results: Array.isArray(response?.results)
        ? response.results.map((result) => ({
          puzzleId: String(result?.puzzleId ?? ''),
          correct: Boolean(result?.correct),
          correctAnswer:
            typeof result?.correctAnswer === 'number' || typeof result?.correctAnswer === 'string'
              ? result.correctAnswer
              : undefined,
        }))
        : [],
      masterySummary: response?.masterySummary,
      mastery: response?.mastery,
    };
  }

  private normalizePuzzle(raw: unknown, index: number): DynamicPuzzle {
    const puzzle = raw as {
      puzzleId?: unknown;
      puzzleText?: unknown;
      type?: unknown;
      metadata?: unknown;
      options?: unknown;
      correctAnswer?: unknown;
    };

    const metadataObject =
      typeof puzzle.metadata === 'object' && puzzle.metadata !== null
        ? (puzzle.metadata as Record<string, unknown>)
        : {};

    const optionsSource = Array.isArray(metadataObject['options'])
      ? metadataObject['options']
      : Array.isArray(puzzle.options)
        ? puzzle.options
        : [];

    const normalizedType = this.normalizeType(puzzle.type);

    return {
      puzzleId: String(puzzle.puzzleId ?? '').trim() || `puzzle-${index + 1}`,
      puzzleText: String(puzzle.puzzleText ?? '').trim(),
      type: normalizedType,
      metadata: {
        inputType:
          metadataObject['inputType'] === 'numeric'
          || metadataObject['inputType'] === 'text'
          || metadataObject['inputType'] === 'mcq'
            ? (metadataObject['inputType'] as PuzzleInputType)
            : optionsSource.length > 0 || normalizedType === 'mcq'
              ? 'mcq'
              : normalizedType === 'arithmetic'
                || normalizedType === 'missing-number'
                || normalizedType === 'sequence'
                ? 'numeric'
                : 'text',
        layout: metadataObject['layout'] === 'grid' ? 'grid' : 'inline',
        skillId: typeof metadataObject['skillId'] === 'string' ? metadataObject['skillId'] : undefined,
        options: optionsSource.map((value) => String(value)).filter((value) => value.length > 0),
        correctAnswer:
          String(metadataObject['correctAnswer'] ?? puzzle.correctAnswer ?? '').trim() || undefined,
      },
    };
  }

  private normalizeType(type: unknown): PuzzleType {
    if (
      type === 'pattern'
      || type === 'missing-number'
      || type === 'sequence'
      || type === 'comparison'
      || type === 'arithmetic'
      || type === 'logic'
      || type === 'mcq'
    ) {
      return type;
    }
    return 'logic';
  }
}

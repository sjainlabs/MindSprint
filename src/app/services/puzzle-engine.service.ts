import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { type MasteryState } from '../core/mastery/mastery-engine.service';

const AI_PUZZLE_API_ROOT = 'https://mindsprint-5a5a0849665d.herokuapp.com/api';

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
  mode: 'ai-puzzle';
  score: number;
  accuracy: number;
  streak: number;
}

export interface SubmitPuzzleAnswersResponse {
  saved?: boolean;
  xpEarned?: number;
  mastery?: MasteryState;
}

@Injectable({
  providedIn: 'root',
})
export class PuzzleEngineService {
  constructor(private readonly http: HttpClient) {}

  generatePuzzles(skillId: string, difficulty: number): Observable<GeneratePuzzlesResponse> {
    let params = new HttpParams().set('mode', 'ai-puzzle');

    if (skillId.trim()) {
      params = params.set('skillId', skillId.trim());
    }
    if (Number.isFinite(difficulty)) {
      params = params.set('difficulty', String(Math.max(1, Math.min(100, Math.round(difficulty)))));
    }

    return this.http
      .get<unknown>(`${AI_PUZZLE_API_ROOT}/game/challenge`, { params })
      .pipe(map((response) => this.mapPuzzleResponse(response)));
  }

  submitPuzzleAnswers(payload: SubmitPuzzleAnswersPayload): Observable<SubmitPuzzleAnswersResponse> {
    const normalizedPayload: SubmitPuzzleAnswersPayload = {
      studentId: String(payload.studentId ?? '').trim(),
      mode: 'ai-puzzle',
      score: Math.max(0, Math.min(100, Math.round(Number(payload.score) || 0))),
      accuracy: Math.max(0, Math.min(100, Math.round(Number(payload.accuracy) || 0))),
      streak: Math.max(0, Math.floor(Number(payload.streak) || 0)),
    };

    return this.http
      .post<unknown>(`${AI_PUZZLE_API_ROOT}/game/submit`, normalizedPayload)
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
      saved?: unknown;
      xpEarned?: unknown;
      mastery?: MasteryState;
    };

    return {
      saved: Boolean(response?.saved),
      xpEarned: Number.isFinite(Number(response?.xpEarned)) ? Number(response?.xpEarned) : 0,
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

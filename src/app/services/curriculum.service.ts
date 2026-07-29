import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CurriculumApiService } from './curriculum-api.service';

export interface CurriculumTopic {
  id: string;
  name: string;
  description: string;
  grades: string[];
  subtopics: string[];
  difficultyTiers: Record<string, string>;
}

/**
 * @deprecated Use CurriculumApiService directly.
 * This wrapper delegates all calls to the backend curriculum API.
 */
@Injectable({ providedIn: 'root' })
export class CurriculumService {
  private readonly curriculumApi = inject(CurriculumApiService);

  async getAllTopics(): Promise<CurriculumTopic[]> {
    const topics = await firstValueFrom(this.curriculumApi.getAllTopics());
    return topics.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description ?? '',
      grades: t.grades,
      subtopics: t.subtopics,
      difficultyTiers: t.difficultyTiers ?? {},
    }));
  }

  async getTopicsByGrade(grade: string): Promise<CurriculumTopic[]> {
    const topics = await firstValueFrom(this.curriculumApi.getTopicsByGrade(grade));
    return topics.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description ?? '',
      grades: t.grades,
      subtopics: t.subtopics,
      difficultyTiers: t.difficultyTiers ?? {},
    }));
  }

  async getTopicById(id: string): Promise<CurriculumTopic | null> {
    try {
      const t = await firstValueFrom(this.curriculumApi.getTopicById(id));
      return {
        id: t.id,
        name: t.name,
        description: t.description ?? '',
        grades: t.grades,
        subtopics: t.subtopics,
        difficultyTiers: t.difficultyTiers ?? {},
      };
    } catch {
      return null;
    }
  }

  async getSubtopics(topicId: string): Promise<string[]> {
    try {
      const subtopics = await firstValueFrom(this.curriculumApi.getSubtopics(topicId));
      return subtopics.map((s) => s.name);
    } catch {
      return [];
    }
  }

  async getGrades(): Promise<string[]> {
    return firstValueFrom(this.curriculumApi.getAllGrades());
  }
}


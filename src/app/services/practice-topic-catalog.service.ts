import { Injectable, signal } from '@angular/core';
import {EnhancedTopic, PracticeConfigService} from './practice-config.service';
import {
  PracticeTopicDefinition,
  PRACTICE_TOPIC_CATALOG
} from './practice-topic-catalog';

@Injectable({ providedIn: 'root' })
export class PracticeTopicCatalogService {
  private readonly mergedCatalog = signal<EnhancedTopic[]>([]);
  topics = signal<EnhancedTopic[]>([]);
  selectedTopics = signal<EnhancedTopic[]>([]);
  private readonly loaded = signal(false);

  constructor(private readonly practiceConfig: PracticeConfigService) {}

  async loadMergedCatalogAsync(): Promise<void> {
    if (this.loaded()) return;

    return new Promise((resolve) => {
      this.practiceConfig.getTopics().subscribe({
        next: (enhancedTopics) => {
          const merged = enhancedTopics.map(meta => ({
            id: meta.id,
            name: meta.name,
            cbseGrade: meta.cbseGrade,
            practiceLevel: meta.practiceLevel,
            skills: meta.skills.map(s => ({
              id: s.id,
              difficultyScore: s.difficultyScore ?? 0
            })),

            subtopics: meta.subtopics,
            studyMaterial: meta.studyMaterial ?? [],
            // ⭐ REQUIRED FIELD
            kumonBand: meta.kumonBand ?? 'default',
            // ⭐ REQUIRED FIELDS from PracticeTopicDefinition
            track: 'math',
            groupKey: meta.groupKey ?? 'default',
            groupLabel: meta.groupLabel ?? 'General',
            generatorKey: meta.generatorKey ?? meta.id,
            icon: meta.icon ?? '📘',
            color: meta.color ?? '#4F46E5',
            difficulty: meta.difficulty ?? 'beginner',
            description: meta.description ?? '',
          }));

          this.mergedCatalog.set(merged);
          this.loaded.set(true);
          resolve();
        },

        error: () => {
          // this.mergedCatalog.set(PRACTICE_TOPIC_CATALOG);
          this.loaded.set(true);
          resolve();
        }
      });
    });
  }

  /** ⭐ Load static catalog + merge backend EnhancedTopic metadata */
  loadMergedCatalog(): void {
    if (this.loaded()) return; // prevent double-loading

    this.practiceConfig.getTopics().subscribe({
      next: (enhancedTopics) => {
        const merged = enhancedTopics.map(meta => ({
          id: meta.id,
          name: meta.name,
          cbseGrade: meta.cbseGrade,
          practiceLevel: meta.practiceLevel,

          // ⭐ FIXED: skills now match EnhancedTopic
          skills: meta.skills.map(s => ({
            id: s.id,
            difficultyScore: s.difficultyScore ?? 0
          })),

          subtopics: meta.subtopics,
          studyMaterial: meta.studyMaterial ?? [],

          // ⭐ REQUIRED FIELD
          kumonBand: meta.kumonBand ?? 'default',

          // ⭐ REQUIRED FIELDS from PracticeTopicDefinition
          track: 'math',
          groupKey: meta.groupKey ?? 'default',
          groupLabel: meta.groupLabel ?? 'General',
          generatorKey: meta.generatorKey ?? meta.id,
          icon: meta.icon ?? '📘',
          color: meta.color ?? '#4F46E5',
          difficulty: meta.difficulty ?? 'beginner',
          description: meta.description ?? '',
        }));

        this.mergedCatalog.set(merged);
        this.loaded.set(true);
      },

      error: () => {
        console.error('Failed to load enhanced topics');
        // this.mergedCatalog.set(PRACTICE_TOPIC_CATALOG);
        this.loaded.set(true);
      }
    });
  }

  /** ⭐ UI uses this instead of static catalog */
  getCatalog(): EnhancedTopic[] {
    return this.mergedCatalog();
  }

  /** ⭐ Find topic by modular skill ID */
  findBySkill(skillId: string): EnhancedTopic | undefined {
    const normalized = skillId.toLowerCase();

    return this.mergedCatalog().find(topic =>
      topic.skills.some(s => s.id.toLowerCase() === normalized)
    );
  }

  /** ⭐ Find topic by topicId */
  findByTopic(topicId: string): EnhancedTopic | undefined {
    return this.mergedCatalog().find(t => t.id === topicId);
  }

  /** ⭐ Get all topics (static + dynamic merged) */
  getAllTopics(): EnhancedTopic[] {
    return this.mergedCatalog();
  }
}

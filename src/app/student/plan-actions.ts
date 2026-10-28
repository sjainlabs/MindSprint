import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PracticeTopicCatalogService } from '../services/practice-topic-catalog.service';
import { PlanAction } from '../services/learning-plan.service';

/** Opens what a learning-plan action asks for: a practice sheet, a topic test, or the study guide before a sheet. */
@Injectable({ providedIn: 'root' })
export class PlanActions {
  private readonly router = inject(Router);
  private readonly catalog = inject(PracticeTopicCatalogService);

  async open(action: PlanAction, grade?: number | null): Promise<void> {
    switch (action.type) {
      case 'topic-test':
        await this.router.navigate(['/tests/topic', action.topicId]);
        return;
      case 'study-guide-then-practice':
        // The guide shows a "read this, then practise" note and its own Start practice button.
        await this.router.navigate(['/study-guides/topic', action.topicId], { queryParams: { then: 'practice' } });
        return;
      default:
        await this.practise(action.topicId, action.level, grade);
    }
  }

  /** The normal practice worksheet flow for one topic, at the plan's level. */
  async practise(topicId: string, level: string, grade?: number | null): Promise<void> {
    await this.catalog.loadMergedCatalogAsync();
    const topic = this.catalog.getCatalog().find((t) => t.id.toLowerCase() === topicId.toLowerCase());
    await this.router.navigate(['/practice/worksheet'], {
      state: topic
        ? { selectedTopics: [topic], selectedLevel: level, questionCount: 10 }
        : {
            // Topic missing from the cached catalog: fall back to the id-based worksheet state.
            selectedTopics: [topicId],
            selectedGrade: grade !== null && grade !== undefined ? String(grade) : undefined,
            selectedLevel: level,
            questionCount: 10,
          },
    });
  }
}

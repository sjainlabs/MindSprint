import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  MasteryBadgeComponent,
} from '../../../../components/mastery-badge/mastery-badge.component';
import { RecommendedSkillCardComponent } from '../../../../components/recommended-skill-card/recommended-skill-card.component';
import {
  MasteryEngineService,
  type MasteryLevel,
  type MasteryState,
} from '../../../../core/mastery/mastery-engine.service';
import { OperationsService } from '../../operations.service';
import { type OperationType, OPERATION_SKILL_MAP } from '../../models/operation-concept.model';

@Component({
  selector: 'app-mastery-check',
  standalone: true,
  imports: [CommonModule, RouterLink, MasteryBadgeComponent, RecommendedSkillCardComponent],
  templateUrl: './mastery-check.component.html',
  styleUrl: './mastery-check.component.scss',
})
export class MasteryCheckComponent implements OnInit {
  readonly operation = signal<OperationType>('add');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly masteryState = signal<MasteryState | null>(null);

  readonly operationSkill = computed(() => {
    return OPERATION_SKILL_MAP[this.operation()] ?? this.operation();
  });

  readonly selectedSkill = computed(() =>
    this.masteryState()?.skills.find((skill) => skill.skillId === this.operationSkill()) ?? null,
  );

  constructor(
    private readonly route: ActivatedRoute,
    private readonly operationsService: OperationsService,
    private readonly masteryEngine: MasteryEngineService,
  ) {}

  ngOnInit(): void {
    const operationParam = this.route.snapshot.paramMap.get('operation') as OperationType | null;
    if (operationParam) {
      this.operation.set(operationParam);
    }

    const state = this.operationsService.getLatestMasteryState();
    if (state) {
      this.masteryState.set(state);
      this.loading.set(false);
      return;
    }

    this.masteryEngine.fetchMasteryState('student-demo').subscribe({
      next: (value) => {
        this.masteryState.set(value);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load mastery right now.');
        this.loading.set(false);
      },
    });
  }

  labelFor(level: MasteryLevel): string {
    if (level === 'mastered') return 'Mastered';
    if (level === 'proficient') return 'Proficient';
    if (level === 'developing') return 'Developing';
    return 'Not started';
  }
}

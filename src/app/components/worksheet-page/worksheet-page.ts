import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PracticeConfigService } from '../../services/practice-config.service';
import { AiWorksheetService } from '../../services/ai-worksheet.service';
import {PracticeTopicCatalogService} from '../../services/practice-topic-catalog.service';

@Component({
  selector: 'app-worksheet-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './worksheet-page.html',
  styleUrls: ['./worksheet-page.css'],
})
export class WorksheetPageComponent implements OnInit {
  readonly studentId = signal('');
  readonly skillId = signal('');
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly worksheet = signal<any>(null);

  readonly answers = signal<Record<string, string | number | string[]>>({});

  constructor(
    private readonly route: ActivatedRoute,
    private readonly practiceConfig: PracticeConfigService,
    private readonly aiWorksheet: AiWorksheetService,
    private readonly catalogService: PracticeTopicCatalogService
  ) {}

  ngOnInit(): void {
    const studentId = this.route.snapshot.queryParamMap.get('studentId')?.trim() || '';
    const skillId = this.route.snapshot.queryParamMap.get('skillId')?.trim() || '';

    this.studentId.set(studentId);
    this.skillId.set(skillId);

    this.loadWorksheet();
  }

  /** ⭐ Load dynamic skills + generate worksheet */
  private loadWorksheet(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    // this.practiceConfig.getTopics().subscribe({
    //   next: (topics) => {
    //     const meta = topics.find((t) =>
    //       t.skills.some((s) => s.id.toLowerCase() === this.skillId().toLowerCase())
    //     );
    //
    //     if (!meta) {
    //       this.errorMessage.set('Skill metadata not found.');
    //       this.loading.set(false);
    //       return;
    //     }
    //
    //     const topicId = meta.id;
    //     const skillIds = meta.skills.map((s) => s.id);
    //     const difficulty = meta.skills.find((s) => s.id === this.skillId())?.difficultyScore ?? 30;
    //
    //     this.generateWorksheet(topicId, skillIds, difficulty);
    //   },
    //
    //   error: () => {
    //     this.errorMessage.set('Unable to load topic metadata.');
    //     this.loading.set(false);
    //   },
    // });
    const meta = this.catalogService.findBySkill(this.skillId());

    if (!meta) {
      this.errorMessage.set('Skill metadata not found.');
      this.loading.set(false);
      return;
    }

    const topicId = meta.id;
    const skillIds = meta.skills.map(s => s.id);
    const difficulty = meta.subtopics[0].difficulty.max;

    this.generateWorksheet(topicId, skillIds, difficulty, meta.subtopics);
  }


  private questionCount(): number {
    return 20; // or dynamic
  }
  /** ⭐ Generate worksheet using dynamic skills */
  private generateWorksheet(topicId: string, skillIds: string[], difficulty: number, subtopics: any[]): void {
    const request = {
      studentId: this.studentId(),
      topicId,
      skills: skillIds,
      difficulty,
      subtopics: subtopics.map(s => s.id),
      questionCount: this.questionCount()
    };

    this.aiWorksheet.generateWorksheet(request).subscribe({
      next: (ws) => {
        this.worksheet.set(ws);
        this.loading.set(false);
      },

      error: () => {
        this.errorMessage.set('Unable to generate worksheet.');
        this.loading.set(false);
      },
    });
  }

  /** ⭐ Update answer */
  updateAnswer(questionId: string, value: any): void {
    const updated = { ...this.answers() };
    updated[questionId] = value;
    this.answers.set(updated);
  }

  /** ⭐ Submit answers (convert all to strings) */
  submit(): void {
    const ws = this.worksheet();
    if (!ws) return;

    const normalizedAnswers = Object.fromEntries(
      Object.entries(this.answers()).map(([k, v]) => [k, String(v)])
    );

    this.aiWorksheet.submitWorksheet({
      studentId: this.studentId(),
      worksheetId: ws.worksheetId,
      answers: normalizedAnswers,
    }).subscribe({
      next: () => {
        alert('Worksheet submitted!');
      },
      error: () => {
        this.errorMessage.set('Failed to submit worksheet.');
      },
    });
  }

  /** ⭐ Count answered questions safely */
  answeredCount(): number {
    return Object.values(this.answers())
      .filter((a) => String(a).trim().length > 0)
      .length;
  }
}

import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InsightsService } from '../../services/insights.service';
import type { FullInsightsResponse, TopicInsight, Recommendation, ParentSummary } from '../../services/insights.types';

@Component({
  selector: 'app-student-insights',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-insights-modal.html',
})
export class StudentInsightsComponent implements OnInit {
  private readonly insights = inject(InsightsService);

  @Input() studentId?: string;
  @Input() topicId?: string;
  @Input() modalMode = true;

  loading = false;
  error: string | null = null;

  // Template bindings (explicitly public and loosely typed to satisfy template analyzer)
  public student: any = { name: undefined, id: undefined, avatar: undefined, grade: undefined, age: undefined, xp: undefined, streak: undefined, level: undefined };
  public topics: any[] = [];
  public recommendations: any[] = [];
  public parentSummary: any = undefined;
  public lastUpdated?: string;

  public parentNote = '';

  ngOnInit(): void {
    if (this.studentId) {
      this.loadInsights();
    }
  }

  loadInsights(): void {
    if (!this.studentId) return;
    this.loading = true;
    this.error = null;
    this.insights.getFullInsights(this.studentId, this.topicId).subscribe({
      next: (res: FullInsightsResponse) => {
        this.student = { name: res.studentName, id: res.studentId, avatar: res.avatar, grade: res.grade, age: res.age, xp: res.xp, streak: res.streak };
        this.topics = res.topics ?? [];
        this.recommendations = res.recommendations ?? [];
        this.parentSummary = res.parentSummary;
        this.lastUpdated = res.lastUpdated;
        this.loading = false;
      },
      error: (err) => {
        console.error('[StudentInsights] Error loading insights', err);
        this.error = err?.message ?? 'Unable to load insights.';
        this.loading = false;
      },
    });
  }

  onClose(): void {
    // host should remove the component or hide modal; provide an event hook if needed
    // For simple usage, we set modalMode=false and clear data
    this.loading = false;
  }

  saveParentNote(note: string | undefined): void {
    // Placeholder: wire up to API to save parent note
    console.log('[StudentInsights] saveParentNote', note);
    this.parentNote = note ?? '';
  }

  // Additional UI actions (no-op / hooks for host integration)
  onPrint(): void {
    console.log('[StudentInsights] print');
  }

  onExport(): void {
    console.log('[StudentInsights] export');
  }

  openLearningPath(): void {
    console.log('[StudentInsights] openLearningPath');
  }

  openReports(): void {
    console.log('[StudentInsights] openReports');
  }
}


import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { InsightsService } from '../../services/insights.service';
import type { RecommendationDetail } from '../../services/insights.types';

@Component({
  selector: 'app-adaptive-recommendation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './adaptive-recommendation.component.html',
})
export class AdaptiveRecommendationComponent implements OnInit {
  private readonly insights = inject(InsightsService);

  @Input() studentId?: string;
  @Input() topicId?: string;
  @Input() recommendation?: RecommendationDetail | null;
  @Output() startWorksheet = new EventEmitter<RecommendationDetail | null>();

  loading = false;
  error: string | null = null;
  data?: RecommendationDetail | null = null;
  // normalized rationale as an array for template iteration
  normalizedRationale?: string[] | null = null;

  ngOnInit(): void {
    if (this.recommendation) {
      this.data = this.recommendation;
      // normalize rationale
      const r = (this.data as any)?.rationale;
      if (Array.isArray(r)) this.normalizedRationale = r as string[];
      else if (r) this.normalizedRationale = [String(r)];
      else this.normalizedRationale = null;
      return;
    }
    if (this.studentId) {
      this.load();
    }
  }

  load(): void {
    if (!this.studentId) return;
    this.loading = true;
    this.error = null;
    this.insights.getRecommendation(this.studentId, this.topicId).subscribe({
      next: (res) => {
        this.data = res;
        const r = (res as any)?.rationale;
        if (Array.isArray(r)) this.normalizedRationale = r as string[];
        else if (r) this.normalizedRationale = [String(r)];
        else this.normalizedRationale = null;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.message ?? 'Unable to load recommendation';
        this.loading = false;
      },
    });
  }

  onStart(): void {
    this.startWorksheet.emit(this.data ?? null);
    console.log('[AdaptiveRecommendation] start worksheet', this.data);
  }
}


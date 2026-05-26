import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { InsightsService } from '../../services/insights.service';
import type { ParentSummary } from '../../services/insights.types';

@Component({
  selector: 'app-parent-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './parent-summary.component.html',
})
export class ParentSummaryComponent implements OnInit {
  @Input() studentId?: string;
  @Input() topicId?: string;
  // allow parent summary to be passed directly
  @Input() summary?: ParentSummary;

  loading = false;
  error: string | null = null;
  parentSummary?: ParentSummary;

  constructor(private readonly insights: InsightsService) {}

  ngOnInit(): void {
    if (this.summary) {
      this.parentSummary = this.summary;
      return;
    }

    if (this.studentId && this.topicId) {
      this.loadSummary(this.studentId, this.topicId);
    }
  }

  loadSummary(studentId: string, topicId: string): void {
    this.loading = true;
    this.error = null;
    this.insights.getParentSummary(studentId, topicId).subscribe({
      next: (res) => {
        // accept various shapes: if API returns { parentSummary: {...} } unwrap
        this.parentSummary = res?.parentSummary ? res.parentSummary : res;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.message ?? 'Unable to load parent summary';
        this.loading = false;
      },
    });
  }
}


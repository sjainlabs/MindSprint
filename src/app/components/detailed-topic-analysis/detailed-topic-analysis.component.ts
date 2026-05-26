import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { InsightsService } from '../../services/insights.service';
import type { TopicInsight } from '../../services/insights.types';
import { ParentSummaryComponent } from '../parent-summary/parent-summary.component';

@Component({
  selector: 'app-detailed-topic-analysis',
  standalone: true,
  imports: [CommonModule, ParentSummaryComponent],
  templateUrl: './detailed-topic-analysis.component.html',
})
export class DetailedTopicAnalysisComponent implements OnInit {
  @Input() studentId?: string;
  @Input() topicId?: string;
  // optional pre-fetched insight (if parent already has it)
  @Input() topicInsight?: TopicInsight;

  loading = false;
  error: string | null = null;
  insight?: TopicInsight;

  constructor(private readonly insightsService: InsightsService) {}

  ngOnInit(): void {
    if (this.topicInsight) {
      this.insight = this.topicInsight;
      return;
    }

    if (this.studentId && this.topicId) {
      this.loadTopic(this.studentId, this.topicId);
    }
  }

  loadTopic(studentId: string, topicId: string): void {
    this.loading = true;
    this.error = null;
    this.insightsService.getTopicInsight(studentId, topicId).subscribe({
      next: (t) => {
        this.insight = t;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.message ?? 'Unable to load topic insight';
        this.loading = false;
      },
    });
  }
}


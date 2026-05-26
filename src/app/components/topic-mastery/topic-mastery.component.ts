import { CommonModule } from '@angular/common';
import { Component, input, OnInit } from '@angular/core';
import { MasteryProgressComponent } from '../mastery-progress/mastery-progress.component';
import { DetailedTopicAnalysisComponent } from '../detailed-topic-analysis/detailed-topic-analysis.component';
import { InsightsService } from '../../services/insights.service';
import type { TopicInsight } from '../../services/insights.types';

@Component({
  selector: 'app-topic-mastery',
  standalone: true,
  imports: [CommonModule, MasteryProgressComponent, DetailedTopicAnalysisComponent],
  templateUrl: './topic-mastery.component.html',
})
export class TopicMasteryComponent implements OnInit {
  // student id passed into the component (defaults to demo-student in storybook/local)
  readonly studentId = input('demo-student');

  insights: TopicInsight[] = [];
  loading = false;
  selectedInsight?: TopicInsight;

  constructor(private readonly insightsService: InsightsService) {}

  ngOnInit(): void {
    this.loadInsights();
  }

  loadInsights(): void {
    const sid = this.studentId();
    if (!sid) return;
    this.loading = true;
    this.insightsService.getAllTopicInsights(sid).subscribe(
      (list) => {
        this.insights = list;
        this.loading = false;
      },
      () => {
        this.loading = false;
      },
    );
  }

  open(ins: TopicInsight): void {
    this.selectedInsight = ins;
  }

  close(): void {
    this.selectedInsight = undefined;
  }
}


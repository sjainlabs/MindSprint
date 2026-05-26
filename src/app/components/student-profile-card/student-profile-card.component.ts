import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { InsightsService } from '../../services/insights.service';
import type { FullInsightsResponse } from '../../services/insights.types';

@Component({
  selector: 'app-student-profile-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-profile-card.component.html',
})
export class StudentProfileCardComponent implements OnInit {
  @Input() studentId?: string;
  @Input() topicId?: string;

  loading = false;
  error: string | null = null;

  // profile fields
  avatar?: string;
  name?: string;
  grade?: string;
  level?: number;
  xp?: number;
  streak?: number;

  constructor(private readonly insights: InsightsService) {}

  ngOnInit(): void {
    if (this.studentId) this.loadProfile();
  }

  loadProfile(): void {
    if (!this.studentId) return;
    this.loading = true;
    this.error = null;
    this.insights.getFullInsights(this.studentId, this.topicId).subscribe({
      next: (res: FullInsightsResponse) => {
        this.name = res.studentName ?? res.studentId;
        this.avatar = res.avatar;
        this.grade = res.grade;
        this.level = (res as any).level ?? undefined;
        this.xp = res.xp;
        this.streak = res.streak;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.message ?? 'Unable to load profile';
        this.loading = false;
      },
    });
  }
}


import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { FullInsightsResponse, LearningApiService } from '../services/learning-api.service';

@Component({
  selector: 'app-simple-insights-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './insights-page.component.html',
  styleUrls: ['./insights-page.component.css'],
})
export class InsightsPageComponent implements OnInit {
  private readonly api = inject(LearningApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly insights = signal<FullInsightsResponse | null>(null);

  async ngOnInit(): Promise<void> {
    const studentId = this.authService.getStoredStudentId();

    if (!studentId) {
      this.errorMessage.set('No active student.');
      this.loading.set(false);
      return;
    }

    try {
      const result = await this.api.getFullInsights(studentId);
      this.insights.set(result);
    } catch {
      this.errorMessage.set('Unable to load insights right now.');
    } finally {
      this.loading.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}

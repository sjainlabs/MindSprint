import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PracticeService, type Worksheet } from '../../services/practice.service';
import { type LearningLevel } from '../../services/diagnostic.service';

@Component({
  selector: 'app-worksheet-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './worksheet-page.html',
  styleUrl: './worksheet-page.css',
})
export class WorksheetPageComponent implements OnInit {
  worksheet: Worksheet | null = null;
  loading = false;
  errorMessage = '';

  constructor(
    private readonly practiceService: PracticeService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const level = this.resolveLevel(this.route.snapshot.queryParamMap.get('level'));
    this.loadWorksheet(level);
  }

  regenerate(level: LearningLevel): void {
    this.loadWorksheet(level);
  }

  private resolveLevel(levelParam: string | null): LearningLevel {
    return levelParam === 'Beginner' || levelParam === 'Intermediate' || levelParam === 'Advanced'
      ? levelParam
      : 'Beginner';
  }

  private loadWorksheet(level: LearningLevel): void {
    this.loading = true;
    this.errorMessage = '';

    this.practiceService.generateWorksheet(level).subscribe({
      next: (worksheet) => {
        this.worksheet = worksheet;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to generate worksheet. Please try again.';
      },
    });
  }
}

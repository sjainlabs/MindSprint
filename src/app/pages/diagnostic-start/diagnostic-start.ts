import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DiagnosticService } from '../../services/diagnostic.service';

@Component({
  selector: 'app-diagnostic-start',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './diagnostic-start.html',
  styleUrl: './diagnostic-start.css',
})
export class DiagnosticStartComponent {
  loading = false;
  errorMessage = '';

  constructor(
    private readonly diagnosticService: DiagnosticService,
    private readonly router: Router,
  ) {}

  startDiagnostic(): void {
    this.loading = true;
    this.errorMessage = '';

    this.diagnosticService.startDiagnostic().subscribe({
      next: (test) => {
        this.diagnosticService.currentTest = test;
        this.diagnosticService.startedAt = new Date();
        this.diagnosticService.lastResult = null;
        this.loading = false;
        void this.router.navigate(['/diagnostic/test']);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to start diagnostic. Please try again.';
      },
    });
  }
}

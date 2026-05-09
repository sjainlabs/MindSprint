import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DiagnosticService, type DiagnosticResult } from '../../services/diagnostic.service';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './results.html',
  styleUrl: './results.css',
})
export class Results implements OnInit {
  result: DiagnosticResult | null = null;

  constructor(
    private readonly diagnosticService: DiagnosticService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.result = this.diagnosticService.lastResult;
    if (!this.result) {
      void this.router.navigate(['/diagnostic']);
    }
  }

  startPractice(): void {
    const level = this.result?.level ?? 'Beginner';
    void this.router.navigate(['/worksheet', level]);
  }
}

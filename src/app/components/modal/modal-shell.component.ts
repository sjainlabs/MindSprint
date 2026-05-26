import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { InsightsService } from '../../services/insights.service';
import type { FullInsightsResponse } from '../../services/insights.types';

@Component({
  selector: 'app-modal-shell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-shell.component.html',
})
export class ModalShellComponent implements OnInit, OnChanges {
  @Input() open = false;
  @Input() title?: string;
  @Input() studentId?: string;
  @Input() topicId?: string;

  @Output() closed = new EventEmitter<void>();

  loading = false;
  error: string | null = null;
  insights?: FullInsightsResponse | null = null;

  constructor(private readonly insightsService: InsightsService) {}

  ngOnInit(): void {
    if (this.open) this.loadIfNeeded();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && changes['open'].currentValue === true) {
      this.loadIfNeeded();
    }
  }

  loadIfNeeded(): void {
    if (!this.studentId) return;
    this.loading = true;
    this.error = null;
    this.insightsService.getFullInsights(this.studentId, this.topicId).subscribe({
      next: (res) => {
        this.insights = res;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.message ?? 'Unable to load insights for modal';
        this.loading = false;
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}


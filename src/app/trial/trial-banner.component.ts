import { Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AccessService, AccessStatus } from '../services/access.service';

/**
 * How much of the free trial a child has used. The student sees it only near the end and after;
 * a parent (compact) sees it for every child on the trial, so the lock is never a surprise.
 */
@Component({
  selector: 'app-trial-banner',
  standalone: true,
  imports: [DatePipe],
  template: `
    @if (status(); as s) {
      @if (s.state === 'ended' || s.state === 'closed') {
        <p class="trial ended" role="status">
          🔒 Free trial used ({{ s.usedHours }} of {{ s.hourLimit }} hours, {{ s.usedSheets }} of {{ s.sheetLimit }} sheets).
          @if (s.state === 'ended' && s.reportsUntil) { Reports stay open until {{ s.reportsUntil | date: 'd MMM y' }}. }
          To keep practising, email <a [href]="'mailto:' + s.contactEmail + '?subject=MindSprint%20free%20trial'">{{ s.contactEmail }}</a>.
        </p>
      } @else if (s.state === 'warning') {
        <p class="trial warning" role="status">
          ⏳ Free trial almost used: {{ s.usedHours }} of {{ s.hourLimit }} hours, {{ s.usedSheets }} of {{ s.sheetLimit }} sheets.
          Email <a [href]="'mailto:' + s.contactEmail + '?subject=MindSprint%20free%20trial'">{{ s.contactEmail }}</a> to keep going.
        </p>
      } @else if (compact() && s.state === 'active') {
        <p class="trial active">Free trial: {{ s.usedHours }} of {{ s.hourLimit }} hours, {{ s.usedSheets }} of {{ s.sheetLimit }} sheets used.</p>
      }
    }
  `,
  styles: [
    `
      .trial { margin: 0; padding: 10px 12px; border-radius: 12px; font-size: 0.9rem; line-height: 1.5; overflow-wrap: anywhere; }
      .trial a { font-weight: 700; color: inherit; }
      .warning { background: #fef9c3; color: #713f12; border: 1px solid #fde68a; }
      .ended { background: #fee2e2; color: #7f1d1d; border: 1px solid #fecaca; }
      .active { padding: 0; background: none; color: #64748b; font-size: 0.85rem; }
    `,
  ],
})
export class TrialBannerComponent implements OnInit {
  private readonly api = inject(AccessService);

  readonly studentId = input.required<string>();
  /** Parent view: also show usage while the trial is going fine */
  readonly compact = input(false);
  readonly status = signal<AccessStatus | null>(null);

  async ngOnInit(): Promise<void> {
    this.status.set(await this.api.status(this.studentId()));
  }
}

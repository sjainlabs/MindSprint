import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { OnboardingFlowService } from '../../services/onboarding-flow.service';

const GRADE_CHOICES = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

/** Big grade buttons (K–12) for when an API says GRADE_REQUIRED. Pre-highlights the onboarding grade. */
@Component({
  selector: 'app-grade-picker',
  standalone: true,
  template: `
    <div class="grade-grid">
      @for (g of choices; track g) {
        <button type="button" class="grade-btn" [class.suggested]="g === suggested()" [disabled]="busy" (click)="picked.emit(g)">
          {{ g }}
          <span class="grade-sub">{{ g === 'K' ? 'Kindergarten' : 'Grade' }}</span>
        </button>
      }
    </div>
  `,
  styles: [
    `
      .grade-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 10px; }
      .grade-btn {
        border: 2px solid #e2e8f0;
        background: #fff;
        border-radius: 14px;
        padding: 12px 6px;
        font-size: 1.5rem;
        font-weight: 800;
        color: #1e1b4b;
        cursor: pointer;
        display: grid;
        gap: 2px;
      }
      .grade-btn.suggested { border-color: #6c63ff; background: #f5f3ff; }
      .grade-sub { font-size: 0.7rem; font-weight: 700; color: #64748b; }
    `,
  ],
})
export class GradePickerComponent implements OnInit {
  private readonly onboarding = inject(OnboardingFlowService);

  @Input() busy = false;
  /** 'K' or '1'–'12'. */
  @Output() picked = new EventEmitter<string>();

  readonly choices = GRADE_CHOICES;
  readonly suggested = signal('');

  ngOnInit(): void {
    const raw = this.onboarding.getState().grade ?? '';
    if (/^k|kinder/i.test(raw)) this.suggested.set('K');
    else {
      const n = raw.match(/\d+/)?.[0];
      if (n && GRADE_CHOICES.includes(n)) this.suggested.set(n);
    }
  }
}

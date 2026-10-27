import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AbacusStatus, MathBrainError, MathBrainService, familyLabel } from '../services/math-brain.service';
import { percent } from '../services/daily-challenge.service';

/** For parents: each abacus operation's level, accuracy and speed, and why it started where it did. */
@Component({
  selector: 'app-math-games-abacus-parent',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="page mb-page">
      <section class="card">
        <h2>👪 Abacus progress</h2>
        <p class="muted">Levels go from 1 to 10. They move up after quick, correct answers and down a step when sums get too hard.</p>
      </section>

      @if (loading()) {
        <section class="card center" aria-busy="true"><div class="spinner"></div></section>
      } @else if (error()) {
        <section class="card center" role="alert">
          <p class="notice error">{{ error() }}</p>
          <button type="button" class="btn primary" (click)="load()">Try again</button>
        </section>
      } @else if (status(); as s) {
        @for (f of s.families; track f.family) {
          <section class="card fam" [class.locked]="!f.unlocked">
            <div class="row-between">
              <h3>{{ label(f.family) }}</h3>
              @if (f.unlocked) {
                <span class="level-pill">Level {{ f.level }}<span class="of"> / 10</span></span>
              } @else {
                <span class="level-pill locked">🔒 Unlocks in Grade {{ f.unlocksAtGrade }}</span>
              }
            </div>
            @if (f.unlocked) {
              <div class="meter" role="img" [attr.aria-label]="'Level ' + f.level + ' of 10'"><span [style.width.%]="f.level * 10"></span></div>
              @if (f.rounds > 0) {
                <dl class="facts">
                  <div><dt>Rounds</dt><dd>{{ f.rounds }}</dd></div>
                  <div><dt>Accuracy</dt><dd>{{ pct(f.accuracy) ?? '–' }}%</dd></div>
                  <div><dt>Average time</dt><dd>{{ f.averageSeconds !== null ? (f.averageSeconds | number: '1.0-1') + 's' : '–' }}</dd></div>
                  <div><dt>Best level</dt><dd>{{ f.bestLevel }}</dd></div>
                </dl>
              } @else {
                <p class="hint">Not played yet.</p>
              }
              @if (f.startingLevelReasons.length) {
                <details class="why">
                  <summary>Why did this start at level {{ f.startingLevel }}?</summary>
                  <ul>
                    @for (r of f.startingLevelReasons; track $index) {
                      <li>{{ sentence(r) }}</li>
                    }
                  </ul>
                </details>
              }
            }
          </section>
        }
      }
    </main>
  `,
  styleUrls: ['../tests/test-pages.css', '../math-brain/math-brain.css'],
  styles: [
    `
      .fam h3 { margin: 0; font-size: 1.1rem; }
      .fam.locked { opacity: 0.75; }
      .level-pill { background: #ede9fe; color: #4c1d95; font-weight: 800; border-radius: 99px; padding: 4px 12px; }
      .level-pill .of { font-weight: 600; opacity: 0.7; }
      .level-pill.locked { background: #f1f5f9; color: #475569; }
      .meter { height: 10px; border-radius: 99px; background: #e2e8f0; overflow: hidden; }
      .meter span { display: block; height: 100%; background: #6c63ff; border-radius: 99px; }
      .facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 0; }
      .facts div { background: #f8fafc; border-radius: 10px; padding: 8px; }
      .facts dt { font-size: 0.75rem; color: #64748b; }
      .facts dd { margin: 0; font-weight: 800; font-size: 1.1rem; color: #0f172a; }
      @media (max-width: 480px) { .facts { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      .why summary { cursor: pointer; font-weight: 700; color: #4338ca; }
      .why ul { margin: 8px 0 0; padding-left: 20px; color: #334155; display: grid; gap: 4px; }
    `,
  ],
})
export class AbacusParentComponent implements OnInit {
  private readonly api = inject(MathBrainService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly status = signal<AbacusStatus | null>(null);
  readonly label = familyLabel;
  readonly pct = percent;

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    const studentId = this.route.snapshot.queryParamMap.get('studentId') ?? this.auth.getStoredStudentId() ?? '';
    this.loading.set(true);
    this.error.set('');
    try {
      this.status.set(await this.api.abacusStatus(studentId));
    } catch (err) {
      this.error.set((err as MathBrainError).message);
    } finally {
      this.loading.set(false);
    }
  }

  /** Reasons should already be sentences; tidy up any that come back as codes like "grade-5-default". */
  sentence(reason: string): string {
    let s = reason.trim();
    if (!/\s/.test(s)) s = s.replace(/[-_]+/g, ' ');
    s = s.charAt(0).toUpperCase() + s.slice(1);
    return /[.!?]$/.test(s) ? s : `${s}.`;
  }
}

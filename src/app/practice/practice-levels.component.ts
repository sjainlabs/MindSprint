import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-practice-levels',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel">
      <h3>Practice Levels</h3>
      <div class="chips">
        <span>Beginner</span>
        <span>Intermediate</span>
        <span>Advanced</span>
        <span>Expert</span>
      </div>
    </section>
  `,
  styles: [
    `
      .panel { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
      .chips { display: flex; gap: 8px; flex-wrap: wrap; }
      span { background: #eef2ff; color: #3730a3; border-radius: 999px; padding: 6px 10px; font-weight: 700; }
      h3 { margin: 0 0 10px; }
    `,
  ],
})
export class PracticeLevelsComponent {}


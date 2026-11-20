import { Component } from '@angular/core';

/** The detail behind the home page: how the AI analysis works and what's inside MindSprint, for the About page. */
@Component({
  selector: 'app-about-content',
  standalone: true,
  template: `
      <section class="card ai">
        <h2>🧠 How the AI analysis works</h2>
        <p class="lead">
          Scores tell you <em>where</em> a child loses marks. MindSprint's analysis looks for <em>why</em>, so the plan fixes
          the cause instead of repeating the same worksheet.
        </p>
        <ol class="steps">
          <li>
            <span class="num" aria-hidden="true">1</span>
            <div>
              <h3>Every two weeks, after 4 hours of practice</h3>
              <p>Every wrong answer since the last analysis is sorted by what went wrong: a lost zero, a slip in the multiplying step, a wrong common denominator, an answer left blank, and so on.</p>
            </div>
          </li>
          <li>
            <span class="num" aria-hidden="true">2</span>
            <div>
              <h3>AI finds the skill underneath</h3>
              <p>It reads the pattern the way a good tutor would. Long division that keeps going wrong is often multiplication; fraction sums that keep going wrong are often finding the common denominator. It also flags work that is simply too hard for the grade.</p>
            </div>
          </li>
          <li>
            <span class="num" aria-hidden="true">3</span>
            <div>
              <h3>You and the teacher decide</h3>
              <p>You get a short report and a suggested focus on your child's learning plan. Accept it, suggest changes, or decline. Nothing changes until a parent or teacher says yes.</p>
            </div>
          </li>
          <li>
            <span class="num" aria-hidden="true">4</span>
            <div>
              <h3>The plan and tests follow</h3>
              <p>Focus topics move to the top of the plan, start with their study guide, and come first in review tests, until your child is strong in each.</p>
            </div>
          </li>
        </ol>
        <p class="small">The analysis runs on Claude, Anthropic's AI. It only reads your child's MindSprint answers and practice time, and its suggestions are reviewed by a person before they apply.</p>
      </section>

      <section class="card facts">
        <h2>Inside MindSprint</h2>
        <ul>
          <li>📚 Over 340 topics following the CBSE syllabus from kindergarten to Grade 12, in small, mastery-based steps</li>
          <li>🧭 A 10-minute skill band check that places your child in each area of maths, even years ahead or behind school</li>
          <li>📅 A Daily Challenge, worksheets, topic tests and a review test every three weeks, so skills stick</li>
          <li>📖 Study guides for every topic: tricks, worked examples and practice to do together</li>
          <li>⭐ Stars and rewards you choose, plus maths games and an abacus</li>
          <li>🎤 Answers can be typed or spoken</li>
          <li>🧠 An AI analysis every two weeks that finds why your child loses marks and suggests a new focus for you to approve</li>
          <li>🔒 Only you, your child, and the teachers you add can see your child's work</li>
        </ul>
      </section>
  `,
  styles: [
    `
      :host { display: grid; gap: 16px; }
      .card { background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
      h2, h3, p { margin: 0; }
      h2 { font-size: 1.3rem; color: #1e1b4b; margin-bottom: 12px; }
      h3 { font-size: 1rem; color: #0f172a; margin-bottom: 2px; }
      .steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
      .steps li { display: flex; gap: 12px; align-items: flex-start; }
      .steps p { color: #475569; line-height: 1.5; }
      .num { flex: none; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: #eef2ff; color: #3730a3; font-weight: 800; }
      .ai { border: 2px solid #c7d2fe; }
      .ai em { font-style: normal; color: #4f46e5; font-weight: 700; }
      .lead { margin: 0 0 14px; color: #334155; line-height: 1.55; }
      .small { margin-top: 14px; font-size: 0.85rem; color: #64748b; line-height: 1.5; }
      .facts ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; color: #334155; line-height: 1.5; }
    `,
  ],
})
export class AboutContentComponent {}

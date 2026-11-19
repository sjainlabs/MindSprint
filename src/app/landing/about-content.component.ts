import { Component } from '@angular/core';

/** What MindSprint is and what it solves, for the About page. */
@Component({
  selector: 'app-about-content',
  standalone: true,
  template: `
      <section class="card">
        <h2>What MindSprint solves</h2>
        <ul class="solves">
          @for (item of solves; track item.question) {
            <li>
              <span class="icon" aria-hidden="true">{{ item.icon }}</span>
              <div>
                <h3>{{ item.question }}</h3>
                <p>{{ item.answer }}</p>
              </div>
            </li>
          }
        </ul>
      </section>

      <section class="card">
        <h2>Getting started in 3 steps</h2>
        <ol class="steps">
          @for (step of steps; track step.title; let i = $index) {
            <li>
              <span class="num" aria-hidden="true">{{ i + 1 }}</span>
              <div>
                <h3>{{ step.title }}</h3>
                <p>{{ step.text }}</p>
              </div>
            </li>
          }
        </ol>
      </section>

      <section class="card facts">
        <h2>Inside MindSprint</h2>
        <ul>
          <li>📚 Over 340 topics following the CBSE syllabus from kindergarten to Grade 12, in Kumon-style small steps</li>
          <li>🧭 A 10-minute skill band check that places your child in each area of maths, even years ahead or behind school</li>
          <li>📅 A Daily Challenge, worksheets, topic tests and a review test every three weeks, so skills stick</li>
          <li>📖 Study guides for every topic: tricks, worked examples and practice to do together</li>
          <li>⭐ Stars and rewards you choose, plus maths games and an abacus</li>
          <li>🎤 Answers can be typed or spoken</li>
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
      .solves, .steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
      .solves li, .steps li { display: flex; gap: 12px; align-items: flex-start; }
      .solves p, .steps p { color: #475569; line-height: 1.5; }
      .icon { flex: none; font-size: 1.6rem; line-height: 1.2; }
      .num { flex: none; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: #eef2ff; color: #3730a3; font-weight: 800; }
      .facts ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; color: #334155; line-height: 1.5; }
    `,
  ],
})
export class AboutContentComponent {
  readonly solves = [
    {
      icon: '🧭',
      question: 'Where is my child really?',
      answer: 'School grade and maths level often differ. A short check finds the level in each area (adding, dividing, fractions, geometry…), so practice is never too easy or too hard.',
    },
    {
      icon: '🗺️',
      question: 'What should we practise today?',
      answer: 'A learning plan picks the next topic, and a few minutes of Daily Challenge each day builds on what they know. No hunting for worksheets.',
    },
    {
      icon: '📈',
      question: 'Is it working?',
      answer: 'Reports show scores by topic, every worksheet and test, time spent, and how far through each grade your child has come.',
    },
    {
      icon: '🤝',
      question: 'Can their teacher or tutor help?',
      answer: 'Add a teacher to your child and they see the same reports and can set tests. You decide who sees what, child by child.',
    },
  ];

  readonly steps = [
    { title: 'Sign in and add your child', text: 'Parents sign in with Google and add each child with their school grade. Each child gets a 6-character login code.' },
    { title: 'Your child finds their skill band', text: 'On their first login, about 20 questions place them in each area of maths. It takes around 10 minutes and has no timer.' },
    { title: 'A little practice every day', text: 'The Daily Challenge, worksheets and tests follow their plan. You watch progress from your Parent Dashboard.' },
  ];
}

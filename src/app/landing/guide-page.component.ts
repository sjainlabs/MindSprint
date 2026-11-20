import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

type Audience = 'parent' | 'student' | 'teacher' | 'analyst' | 'faq';

interface GuideStep {
  title: string;
  text: string;
  /** Optional link into the app for this step */
  link?: { label: string; path: string; query?: Record<string, string> };
}

interface GuideSection {
  id: Audience;
  tab: string;
  title: string;
  intro: string;
  steps: GuideStep[];
}

const SECTIONS: GuideSection[] = [
  {
    id: 'parent',
    tab: '👪 Parents',
    title: 'Getting started as a parent',
    intro: 'You set things up once, and your child practises on their own. Everything below is on your Parent Dashboard.',
    steps: [
      { title: 'Sign in', text: 'On the home page, tap "I\'m a parent" and continue with Google.', link: { label: 'Parent sign in', path: '/auth/parent-login' } },
      { title: 'Add your child', text: 'Tap Add Student and enter their name and school grade. You get a 6-character login code: write it down for them. Lost it? Use ⋯ → 🔑 New login code.' },
      { title: 'Your child logs in', text: 'On their own device, they tap "I\'m a student" and type the code. They stay logged in on that device.' },
      { title: 'Find my skill band', text: 'The first time, your child answers about 20 questions (10 minutes, no timer). It finds their level in each area of maths and starts their plan and Daily Challenge there. They can skip it and do it later.' },
      { title: 'A little every day', text: 'Your child\'s home page has the Daily Challenge (a few minutes), worksheets picked by their learning plan, and tests. A review test comes every three weeks to keep older topics fresh.' },
      { title: 'Watch progress', text: 'Under 📊 Reports for each child: Learning plan, Overview, Worksheet & test history, Active time and the Daily challenge report. Spotted a typo in an answer? Use ✏️ Fix typos in the history.' },
      { title: 'Review the AI suggestions', text: 'Every two weeks, once your child has practised for about 4 hours, an AI analysis looks at why they lose marks and suggests a focus. It appears on their Learning plan as a 📝 Suggested plan update. Accept it, suggest changes, or decline: nothing changes until you or their teacher say yes. You can also set a 🎯 focus yourself at any time.' },
      { title: 'Set tests yourself', text: 'Tap "Open as [your child]", then Tests. Write a Manual Test lets you type your own questions and answers; Build a Custom Test mixes any topics, or a whole grade.' },
      { title: 'Rewards', text: 'Your child earns stars for practice. In ⭐ Rewards → Reward shop you choose what stars can be swapped for, and approve each request.' },
      { title: 'Add a teacher', text: 'Ask the teacher for their code (it starts with TCH-). Then on the child: ⋯ → 👩‍🏫 Teachers → enter the code. Add it to each child the teacher teaches. You can remove a teacher any time.' },
      { title: 'Share with an analyst', text: 'For someone who should only look, like a tutor checking progress: ⋯ → 🔗 Share with analyst makes an 8-character code. It is read-only, lasts 30 days, and you can revoke it.' },
      { title: 'Keep the grade right', text: 'Every three months we ask you to confirm your child\'s school grade. You can change it any time with ⋯ → ✏️ Edit child.' },
    ],
  },
  {
    id: 'student',
    tab: '🎒 Students',
    title: 'For students',
    intro: 'Hi! Here is how MindSprint works for you.',
    steps: [
      { title: 'Log in', text: 'Tap "I\'m a student" and type the 6-character code from your parent.', link: { label: 'Enter my code', path: '/auth/access-code' } },
      { title: 'Find your skill band', text: 'Tell us which parts of maths feel easy, then answer some questions. They get harder when you\'re right and easier when you\'re not. Getting some wrong is normal!' },
      { title: 'Do your Daily Challenge', text: 'A few questions every day. It remembers what you know and brings old topics back so you don\'t forget them.' },
      { title: 'Practise and test yourself', text: 'Practice worksheets follow your plan. Tests let you show what you\'ve learned, and tests from your parent or teacher appear there too.' },
      { title: 'Type or speak', text: 'Type your answer, or tap 🎤 and say it, like "three by four" for 3/4. Check the box before you press Next.' },
      { title: 'Stuck?', text: 'Open 📚 Study guides for tricks and worked examples on every topic.', link: { label: 'Study guides', path: '/study-guides' } },
      { title: 'Earn stars', text: 'Practice earns ⭐ stars. Spend them in the reward shop on rewards your parent has set up.' },
    ],
  },
  {
    id: 'teacher',
    tab: '👩‍🏫 Teachers',
    title: 'For teachers and tutors',
    intro: 'Parents share each child with you. You see their progress and can set work, without managing their account.',
    steps: [
      { title: 'Sign in', text: 'On the home page, tap "Teacher sign in" and continue with Google.', link: { label: 'Teacher sign in', path: '/auth/parent-login', query: { role: 'teacher' } } },
      { title: 'Share your code', text: 'Your Teacher Dashboard shows your code, like TCH-4KQ9X2. Copy it and send it to parents.' },
      { title: 'Parents add you to each child', text: 'The parent enters your code on each child you teach (⋯ → 👩‍🏫 Teachers). Brothers and sisters are added one by one. The children then appear on your dashboard, from any number of families.' },
      { title: 'See their progress', text: 'For each student: learning plan, overview, worksheet & test history, active time and the Daily challenge report.' },
      { title: 'Review the AI suggestions', text: 'Every two weeks the AI analysis may suggest a new focus for a student. Open their Learning plan to read the report and accept it, suggest changes, or decline. The parent sees the same suggestion.' },
      { title: 'Set tests', text: 'Use ✍️ Write a test to type your own questions and answers. The student sees it on their Tests page with your name on it.' },
      { title: 'Teach with the study guides', text: 'Every topic has a study guide with key ideas, tricks, worked examples and practice questions to use in lessons.', link: { label: 'Study guides', path: '/study-guides' } },
      { title: 'What stays with the parent', text: 'You can\'t change a student\'s profile, grade, login code or pace, or fix answers. Parents can remove you, and you can take a student off your list.' },
    ],
  },
  {
    id: 'analyst',
    tab: '🔎 Analysts',
    title: 'For analysts',
    intro: 'A parent can share one child\'s progress with you, read-only, without you needing an account.',
    steps: [
      { title: 'Get a code from the parent', text: 'The parent makes an 8-character analyst code for their child.' },
      { title: 'Enter it', text: 'On the home page, tap "Analyst code" and type it in.', link: { label: 'Enter an analyst code', path: '/auth/analyst' } },
      { title: 'What you can see', text: 'The child\'s learning plan and reports: scores, topic tests and worksheet & test history. You can\'t practise, take tests or change anything.' },
      { title: 'How long it lasts', text: 'A code works for 30 days. The parent can make a new one or revoke it at any time.' },
    ],
  },
  {
    id: 'faq',
    tab: '❓ Questions',
    title: 'Common questions',
    intro: '',
    steps: [
      { title: 'Which syllabus does MindSprint follow?', text: 'The CBSE maths syllabus from kindergarten to Grade 12, taught in small, mastery-based steps. Practice follows your child\'s skill band, which can be above or below their school grade.' },
      { title: 'Who can see my child\'s work?', text: 'Only you, your child, the teachers you add to that child, and anyone you give an analyst code. Each needs their own sign-in or code.' },
      { title: 'My child was asked to enter their code again', text: 'That happens after some updates, or on a new device. Their work is all saved. If you\'ve lost the code, make a new one with ⋯ → 🔑 New login code.' },
      { title: 'Where does the 🎤 mic work?', text: 'In Chrome and Edge, and in Safari on iPhone and iPad. The browser turns the speech into text using its own speech service. If the mic is blocked, allow it in the browser\'s site settings.' },
      { title: 'How long should my child practise?', text: 'A few minutes of Daily Challenge every day beats a long session once a week. Active time in Reports shows how much they do.' },
      { title: 'My child is ahead of their class. Is that OK?', text: 'Yes. The skill band check places them where they really are. On the learning plan you can choose to move ahead or go deeper near their school grade.' },
    ],
  },
];

/** The How it works tab: how to use MindSprint, one tab per kind of user (?for=parent|student|teacher|analyst|faq). */
@Component({
  selector: 'app-guide-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="page">
      <section class="card head">
        <h1>📖 How MindSprint works</h1>
        <p>Pick who you are for a step-by-step guide.</p>
        <div class="tabs" role="tablist" aria-label="Guide for">
          @for (s of sections; track s.id) {
            <button type="button" role="tab" [class.active]="s.id === current().id" [attr.aria-selected]="s.id === current().id" (click)="show(s.id)">{{ s.tab }}</button>
          }
        </div>
      </section>

      <section class="card" role="tabpanel" [attr.aria-label]="current().title">
        <h2>{{ current().title }}</h2>
        @if (current().intro) { <p class="intro">{{ current().intro }}</p> }
        @if (current().id === 'faq') {
          <div class="faq">
            @for (step of current().steps; track step.title) {
              <details>
                <summary>{{ step.title }}</summary>
                <p>{{ step.text }}</p>
              </details>
            }
          </div>
        } @else {
          <ol class="steps">
            @for (step of current().steps; track step.title; let i = $index) {
              <li>
                <span class="num" aria-hidden="true">{{ i + 1 }}</span>
                <div>
                  <h3>{{ step.title }}</h3>
                  <p>{{ step.text }}</p>
                  @if (step.link; as l) {
                    <a class="step-link" [routerLink]="l.path" [queryParams]="l.query ?? {}">{{ l.label }} →</a>
                  }
                </div>
              </li>
            }
          </ol>
        }
      </section>

      <a routerLink="/" class="home-link">← Back to the home page</a>
    </main>
  `,
  styles: [
    `
      .page { max-width: 760px; margin: 0 auto; padding: 16px; display: grid; gap: 16px; }
      .card { background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
      h1, h2, h3, p { margin: 0; }
      .head { display: grid; gap: 10px; }
      h1 { font-size: 1.5rem; color: #1e1b4b; }
      h2 { font-size: 1.25rem; color: #1e1b4b; }
      h3 { font-size: 1rem; color: #0f172a; margin-bottom: 2px; }
      p { color: #475569; line-height: 1.55; }
      .intro { margin: 6px 0 16px; color: #334155; }

      .tabs { display: flex; gap: 6px; flex-wrap: wrap; background: #f1f5f9; border-radius: 14px; padding: 4px; }
      .tabs button { flex: 1 1 auto; border: 0; background: none; padding: 10px 12px; border-radius: 11px; font: inherit; font-weight: 800; color: #475569; cursor: pointer; min-height: 44px; white-space: nowrap; }
      .tabs button.active { background: #fff; color: #1e1b4b; box-shadow: 0 1px 4px rgba(15, 23, 42, 0.15); }
      .tabs button:focus-visible, a:focus-visible, summary:focus-visible { outline: 3px solid #6366f1; outline-offset: 2px; }

      .steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px; }
      .steps li { display: flex; gap: 12px; align-items: flex-start; }
      .num { flex: none; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: #eef2ff; color: #3730a3; font-weight: 800; }
      .step-link { display: inline-block; margin-top: 6px; color: #1d4ed8; font-weight: 700; text-decoration: none; }
      .step-link:hover { text-decoration: underline; }

      .faq { display: grid; gap: 8px; }
      details { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; }
      summary { cursor: pointer; font-weight: 700; color: #0f172a; }
      details p { margin-top: 8px; }
      .home-link { justify-self: center; color: #475569; font-weight: 600; text-decoration: none; }
    `,
  ],
})
export class GuidePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly sections = SECTIONS;
  private readonly selected = toSignal(this.route.queryParamMap.pipe(map((q) => q.get('for'))), { initialValue: null });
  readonly current = computed(() => SECTIONS.find((s) => s.id === this.selected()) ?? SECTIONS[0]);

  show(id: Audience): void {
    void this.router.navigate([], { queryParams: { for: id }, replaceUrl: true });
  }
}

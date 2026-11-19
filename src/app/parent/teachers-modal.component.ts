import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { LinkedTeacher, TeacherService } from '../services/teacher.service';

/**
 * A parent gives teachers access to one child: they type the teacher's code (TCH-XXXXXX) and can
 * remove a teacher any time. Each child is added on its own, so brothers and sisters need it twice.
 */
@Component({
  selector: 'app-teachers-modal',
  standalone: true,
  template: `
    <div class="backdrop" (click)="closed.emit()">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="teachers-title" (click)="$event.stopPropagation()">
        <h2 id="teachers-title">👩‍🏫 Teachers</h2>
        <p class="who">{{ studentName() }}</p>

        <p>A teacher you add can see {{ studentName() }}'s reports, write tests for {{ studentName() }}, and use the study guides.
          They can't change {{ studentName() }}'s profile or login code.</p>

        @if (loading()) {
          <p class="muted" aria-busy="true">Loading…</p>
        } @else if (loadError()) {
          <p class="error" role="alert">{{ loadError() }}</p>
          <button type="button" class="primary" (click)="load()">Try again</button>
        } @else {
          @if (teachers().length) {
            <ul class="teachers">
              @for (t of teachers(); track t.teacherUid) {
                <li>
                  <div class="teacher">
                    <strong>{{ t.name }}</strong>
                    @if (t.email) { <span class="muted">{{ t.email }}</span> }
                  </div>
                  @if (removing() === t.teacherUid) {
                    <span class="confirm">
                      <button type="button" class="danger-btn" [disabled]="busy()" (click)="remove(t)">Remove</button>
                      <button type="button" class="ghost" [disabled]="busy()" (click)="removing.set(null)">Keep</button>
                    </span>
                  } @else {
                    <button type="button" class="danger-text" [attr.aria-label]="'Remove ' + t.name" (click)="removing.set(t.teacherUid)">Remove</button>
                  }
                </li>
              }
            </ul>
          } @else {
            <p class="muted">No teachers yet.</p>
          }

          <form class="add" (submit)="$event.preventDefault(); add()">
            <label for="teacher-code">Teacher code</label>
            <div class="add-row">
              <input
                id="teacher-code"
                autocomplete="off"
                autocapitalize="characters"
                spellcheck="false"
                placeholder="TCH-XXXXXX"
                [value]="code()"
                (input)="code.set($any($event.target).value)"
              />
              <button type="submit" class="primary" [disabled]="busy() || !code().trim()">{{ busy() ? 'Adding…' : 'Add' }}</button>
            </div>
            <p class="muted">Ask the teacher for their code. They'll find it on their Teacher Dashboard.</p>
          </form>
        }

        @if (actionError()) {
          <p class="error" role="alert">{{ actionError() }}</p>
        }
        @if (added()) {
          <p class="ok" role="status">✓ {{ added() }} can now see {{ studentName() }}.</p>
        }

        <button type="button" class="ghost done" (click)="closed.emit()">Done</button>
      </section>
    </div>
  `,
  styles: [
    `
      .backdrop { position: fixed; inset: 0; z-index: 50; background: rgba(15, 23, 42, 0.5); display: grid; place-items: center; padding: 16px; overflow-y: auto; }
      .modal { width: min(460px, 100%); box-sizing: border-box; background: #fff; border-radius: 16px; padding: 16px; display: grid; gap: 10px; }
      h2, p { margin: 0; }
      p { color: #334155; }
      .who { font-weight: 700; color: #475569; margin-top: -6px; }
      .muted { color: #64748b; font-size: 0.9rem; }
      .teachers { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
      .teachers li { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; border-radius: 12px; background: #f8fafc; }
      .teacher { display: grid; min-width: 0; overflow-wrap: anywhere; }
      .confirm { display: flex; gap: 6px; }
      .add { display: grid; gap: 6px; }
      .add label { font-weight: 700; font-size: 0.9rem; color: #334155; }
      .add-row { display: flex; gap: 8px; }
      .add-row input { flex: 1; min-width: 0; border: 2px solid #cbd5e1; border-radius: 12px; padding: 10px 12px; font-size: 1.05rem; font-family: ui-monospace, Menlo, monospace; letter-spacing: 0.06em; text-transform: uppercase; }
      .add-row input:focus { outline: none; border-color: #2563eb; }
      button { border: 0; border-radius: 12px; padding: 12px; font-weight: 700; background: #e2e8f0; color: #0f172a; cursor: pointer; min-height: 44px; }
      button:disabled { opacity: 0.6; cursor: not-allowed; }
      button:focus-visible { outline: 3px solid #6366f1; outline-offset: 2px; }
      .primary { background: #2563eb; color: #fff; }
      .ghost { background: #f1f5f9; }
      .danger-text { background: #fef2f2; color: #b91c1c; flex: none; }
      .danger-btn { background: #dc2626; color: #fff; }
      .error { color: #b91c1c; }
      .ok { color: #166534; font-weight: 700; }
      .done { margin-top: 4px; }
    `,
  ],
})
export class TeachersModalComponent implements OnInit {
  private readonly api = inject(TeacherService);

  readonly studentId = input.required<string>();
  readonly studentName = input('');
  readonly closed = output<void>();

  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly actionError = signal('');
  readonly busy = signal(false);
  readonly teachers = signal<LinkedTeacher[]>([]);
  readonly code = signal('');
  readonly removing = signal<string | null>(null);
  /** The name of the teacher just added, for the confirmation line */
  readonly added = signal('');

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      this.teachers.set(await this.api.teachersFor(this.studentId()));
    } catch (err) {
      this.loadError.set(message(err, "Couldn't load the teachers."));
    } finally {
      this.loading.set(false);
    }
  }

  async add(): Promise<void> {
    if (this.busy() || !this.code().trim()) return;
    this.busy.set(true);
    this.actionError.set('');
    this.added.set('');
    try {
      const teacher = await this.api.add(this.studentId(), this.code().trim());
      this.teachers.update((list) => (list.some((t) => t.teacherUid === teacher.teacherUid) ? list : [...list, teacher]));
      this.added.set(teacher.name);
      this.code.set('');
    } catch (err) {
      this.actionError.set(message(err, "Couldn't add that teacher."));
    } finally {
      this.busy.set(false);
    }
  }

  async remove(teacher: LinkedTeacher): Promise<void> {
    this.busy.set(true);
    this.actionError.set('');
    this.added.set('');
    try {
      await this.api.remove(this.studentId(), teacher.teacherUid);
      this.teachers.update((list) => list.filter((t) => t.teacherUid !== teacher.teacherUid));
      this.removing.set(null);
    } catch (err) {
      this.actionError.set(message(err, "Couldn't remove that teacher."));
    } finally {
      this.busy.set(false);
    }
  }
}

function message(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MathTextComponent } from '../components/math-text/math-text.component';
import {
  MathBrainError,
  MathBrainService,
  ReferenceList,
  ReferenceType,
  TimesTable,
} from '../services/math-brain.service';

type Section = 'tables' | ReferenceType;

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: 'tables', label: 'Tables' },
  { id: 'squares', label: 'Squares' },
  { id: 'cubes', label: 'Cubes' },
  { id: 'square-roots', label: 'Square roots' },
  { id: 'cube-roots', label: 'Cube roots' },
];
const UP_TO = [10, 12, 20];

@Component({
  selector: 'app-math-brain-facts',
  standalone: true,
  imports: [CommonModule, MathTextComponent],
  templateUrl: './facts.component.html',
  styleUrls: ['../tests/test-pages.css', './math-brain.css', './facts.component.css'],
})
export class MathBrainFactsComponent implements OnInit {
  private readonly api = inject(MathBrainService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly sections = SECTIONS;
  readonly upToChoices = UP_TO;

  readonly section = signal<Section>('tables');
  readonly upTo = signal(10);
  readonly selectedTable = signal<number | null>(null);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly tables = signal<TimesTable[]>([]);
  readonly reference = signal<ReferenceList | null>(null);

  readonly table = computed(() => this.tables().find((t) => t.table === this.selectedTable()) ?? null);

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const section = q.get('section') as Section | null;
    if (section && SECTIONS.some((s) => s.id === section)) this.section.set(section);
    const upTo = Number(q.get('upTo'));
    if (UP_TO.includes(upTo)) this.upTo.set(upTo);
    const table = Number(q.get('table'));
    if (table >= 2 && table <= 20) this.selectedTable.set(table);
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const s = this.section();
      if (s === 'tables') this.tables.set(await this.api.tables(this.upTo()));
      else this.reference.set(await this.api.reference(s));
    } catch (err) {
      this.error.set((err as MathBrainError).message);
    } finally {
      this.loading.set(false);
    }
  }

  pickSection(s: Section): void {
    if (s === this.section()) return;
    this.section.set(s);
    this.syncUrl();
    this.load();
  }

  pickUpTo(n: number): void {
    if (n === this.upTo()) return;
    this.upTo.set(n);
    this.syncUrl();
    this.load();
  }

  pickTable(n: number | null): void {
    this.selectedTable.set(n);
    this.syncUrl();
    if (n !== null) setTimeout(() => document.getElementById('table-detail')?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  }

  practise(): void {
    const s = this.section();
    const t = this.selectedTable();
    const queryParams: Record<string, string | number> = { deck: s };
    if (s === 'tables') Object.assign(queryParams, { from: t ?? 2, to: t ?? 20, upTo: this.upTo() });
    this.router.navigate(['/math-brain/cards'], { queryParams });
  }

  private syncUrl(): void {
    const s = this.section();
    this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl: true,
      queryParams: { section: s, upTo: s === 'tables' ? this.upTo() : null, table: s === 'tables' ? this.selectedTable() : null },
    });
  }
}

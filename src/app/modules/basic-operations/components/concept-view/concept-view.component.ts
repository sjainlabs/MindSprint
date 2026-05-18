import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  type OperationType,
  type OperationConcept,
  OPERATION_ICON_MAP,
} from '../../models/operation-concept.model';
import { OperationsService } from '../../operations.service';

const VALID_OPERATIONS: OperationType[] = ['add', 'sub', 'mul', 'div', 'fraction', 'decimal'];

@Component({
  selector: 'app-concept-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './concept-view.component.html',
  styleUrl: './concept-view.component.scss',
})
export class ConceptViewComponent implements OnInit {
  readonly loading = signal(true);
  readonly error = signal('');
  readonly concept = signal<OperationConcept | null>(null);
  readonly operation = signal<OperationType>('add');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly operationsService: OperationsService,
  ) {}

  ngOnInit(): void {
    const operationParam = this.route.snapshot.paramMap.get('operation');
    if (!operationParam || !VALID_OPERATIONS.includes(operationParam as OperationType)) {
      this.error.set('Unsupported operation.');
      this.loading.set(false);
      return;
    }

    this.operation.set(operationParam as OperationType);
    this.operationsService.getConcept(this.operation()).subscribe({
      next: (concept) => {
        this.concept.set(concept);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load concept right now.');
        this.loading.set(false);
      },
    });
  }

  iconFor(operation: OperationType): string {
    return OPERATION_ICON_MAP[operation];
  }
}

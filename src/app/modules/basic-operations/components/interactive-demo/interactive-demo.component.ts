import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { type OperationType } from '../../models/operation-concept.model';

@Component({
  selector: 'app-interactive-demo',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './interactive-demo.component.html',
  styleUrl: './interactive-demo.component.scss',
})
export class InteractiveDemoComponent implements OnInit {
  readonly operation = signal<OperationType>('add');
  readonly count = signal(2);
  readonly groupCount = signal(2);
  readonly groupSize = signal(3);
  readonly parts = signal(8);
  readonly shadedParts = signal(3);
  readonly tenths = signal(4);

  constructor(private readonly route: ActivatedRoute) {}

  ngOnInit(): void {
    const value = this.route.snapshot.paramMap.get('operation') as OperationType | null;
    if (value) {
      this.operation.set(value);
    }
  }

  increment(): void {
    this.count.update((value) => Math.min(20, value + 1));
  }

  decrement(): void {
    this.count.update((value) => Math.max(0, value - 1));
  }

  incrementGroupCount(): void {
    this.groupCount.update((value) => Math.min(10, value + 1));
  }

  decrementGroupCount(): void {
    this.groupCount.update((value) => Math.max(1, value - 1));
  }

  incrementGroupSize(): void {
    this.groupSize.update((value) => Math.min(10, value + 1));
  }

  decrementGroupSize(): void {
    this.groupSize.update((value) => Math.max(1, value - 1));
  }

  incrementShaded(): void {
    this.shadedParts.update((value) => Math.min(this.parts(), value + 1));
  }

  decrementShaded(): void {
    this.shadedParts.update((value) => Math.max(0, value - 1));
  }

  incrementTenths(): void {
    this.tenths.update((value) => Math.min(10, value + 1));
  }

  decrementTenths(): void {
    this.tenths.update((value) => Math.max(0, value - 1));
  }

  blocksArray(): number[] {
    return Array.from({ length: this.count() }, (_, index) => index);
  }

  multiplicationCells(): number[] {
    return Array.from({ length: this.groupCount() * this.groupSize() }, (_, index) => index);
  }

  fractionCells(): number[] {
    return Array.from({ length: this.parts() }, (_, index) => index);
  }

  decimalCells(): number[] {
    return Array.from({ length: 10 }, (_, index) => index);
  }
}

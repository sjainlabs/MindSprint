import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { EnhancedWorksheetQuestionV2 } from '../../services/learning-api.service';

/**
 * Drag and Drop Question Component
 * Allows students to drag items into drop zones
 * Supports ordering, categorization, and matching
 */
@Component({
  selector: 'app-drag-drop-question',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  template: `
    <div class="drag-drop-container">
      <h3>{{ question.prompt }}</h3>
      <p class="instruction">Drag items to the correct zone(s)</p>

      <div class="drag-drop-content">
        <!-- Available Items (Left) -->
        <div class="items-section">
          <h4>Available Items</h4>
          <div
            cdkDropList
            #sourceList="cdkDropList"
            cdkDropListSortingDisabled
            [cdkDropListData]="availableItems()"
            [cdkDropListDisabled]="isReadOnly"
            class="items-list"
            [cdkDropListConnectedTo]="getConnectedDropLists()"

          >
            <div
              *ngFor="let item of availableItems()"
              cdkDrag
              class="drag-item"
              [class.dragging]="item.isDragging"
              [cdkDragDisabled]="isReadOnly"
            >
              {{ item.label }}
            </div>
          </div>
        </div>

        <!-- Drop Zones (Right) -->
        <div class="zones-section">
          <div
            *ngFor="let zone of dropZones(); let i = index"
            cdkDropList
            [cdkDropListData]="zone.items"
            (cdkDropListDropped)="onDrop($event, i)"
            [cdkDropListDisabled]="isReadOnly"
            class="drop-zone"
          >
            <h4>{{ zone.label }}</h4>
            <div class="zone-items">
              <div
                *ngFor="let item of zone.items"
                cdkDrag
                class="zone-item"
                [cdkDragDisabled]="isReadOnly"
              >
                {{ item.label }}
              </div>
            </div>
            <p *ngIf="zone.items.length === 0" class="zone-empty">
              Drop items here
            </p>
          </div>
        </div>
      </div>

      <button class="submit-btn" (click)="submit()" [disabled]="isReadOnly || !isComplete()">
        ✓ Submit Answer
      </button>

      <p class="error-message" *ngIf="hasError()">
        {{ errorMessage() }}
      </p>
    </div>
  `,
  styles: [`
    .drag-drop-container {
      padding: 16px;
      background: #f8f9ff;
      border-radius: 12px;
      display: grid;
      gap: 12px;
    }

    h3 {
      margin: 0;
      font-size: 1.05rem;
      color: #1f2937;
    }

    .instruction {
      margin: 0;
      font-size: 0.85rem;
      color: #64748b;
      font-style: italic;
    }

    .drag-drop-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    h4 {
      margin: 0 0 8px;
      font-size: 0.95rem;
      color: var(--primary, #6C63FF);
    }

    .items-list, .zone-items {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-height: 200px;
      padding: 12px;
      background: white;
      border: 2px dashed rgba(108, 99, 255, 0.2);
      border-radius: 10px;
      transition: all 0.2s;
    }

    .items-list.cdk-drop-list-dragging {
      background: rgba(108, 99, 255, 0.05);
      border-color: var(--primary, #6C63FF);
    }

    .drag-item {
      padding: 12px;
      background: linear-gradient(135deg, var(--primary, #6C63FF), #8f84ff);
      color: white;
      border-radius: 8px;
      cursor: grab;
      font-weight: 600;
      transition: all 0.15s;
      box-shadow: 0 2px 8px rgba(108, 99, 255, 0.2);
    }

    .drag-item:hover {
      box-shadow: 0 4px 12px rgba(108, 99, 255, 0.3);
    }

    .drag-item.cdk-drag-dragging {
      opacity: 0.5;
      transform: rotate(2deg);
    }

    .zones-section {
      display: grid;
      gap: 12px;
    }

    .drop-zone {
      display: grid;
      gap: 8px;
      padding: 12px;
      background: rgba(76, 175, 80, 0.05);
      border: 2px solid rgba(76, 175, 80, 0.2);
      border-radius: 10px;
      min-height: 150px;
      transition: all 0.2s;
    }

    .drop-zone.cdk-drop-list-dragging-over {
      background: rgba(76, 175, 80, 0.1);
      border-color: var(--success, #4CAF50);
    }

    .zone-items {
      min-height: 100px;
      padding: 8px;
      background: white;
      border-radius: 6px;
      margin-top: 4px;
    }

    .zone-item {
      padding: 8px 12px;
      background: var(--success, #4CAF50);
      color: white;
      border-radius: 6px;
      cursor: grab;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .zone-item.cdk-drag-dragging {
      opacity: 0.7;
    }

    .zone-empty {
      margin: 0;
      text-align: center;
      color: #adb5bd;
      font-style: italic;
      font-size: 0.85rem;
    }

    .submit-btn {
      padding: 10px 16px;
      background: linear-gradient(135deg, var(--primary, #6C63FF), #8f84ff);
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }

    .submit-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(108, 99, 255, 0.25);
    }

    .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .error-message {
      color: var(--error, #E53935);
      font-size: 0.85rem;
      margin: 0;
      padding: 8px;
      background: rgba(229, 57, 53, 0.08);
      border-radius: 6px;
    }

    @media (max-width: 768px) {
      .drag-drop-content {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DragDropQuestionComponent {
  @Input() question!: EnhancedWorksheetQuestionV2;
  @Input() isReadOnly = false;
  @Output() answerChange = new EventEmitter<Record<string, string[]>>();

  dropZones = signal<Array<{ label: string; items: any[] }>>([]);
  availableItems = signal<any[]>([]);
  hasError = signal(false);
  errorMessage = signal('');

  ngOnInit(): void {
    this.initializeDragDrop();
  }

  initializeDragDrop(): void {
    const draggableItems = this.question.metadata?.['draggableItems'] || [];
    const dropZones = this.question.metadata?.['dropZones'] || [];

    this.availableItems.set(
      draggableItems.map((item: string) => ({ label: item, isDragging: false }))    );

    this.dropZones.set(
      dropZones.map((zone: string) => ({ label: zone, items: [] }))
    );
  }

  onDrop(event: CdkDragDrop<any>, zoneIndex: number): void {
    if (event.previousContainer === event.container) return;

    const item = event.previousContainer.data[event.previousIndex];
    const currentZones = [...this.dropZones()];
    currentZones[zoneIndex].items.push(item);
    this.dropZones.set(currentZones);
  }

  isComplete(): boolean {
    return this.availableItems().length === 0;
  }

  submit(): void {
    const answer: Record<string, string[]> = {};
    this.dropZones().forEach((zone, i) => {
      answer[zone.label] = zone.items.map(item => item.label);
    });
    this.answerChange.emit(answer);
  }
  getConnectedDropLists(): string[] {
    return this.dropZones().map((_, i) => `zone-${i}`);
  }

}


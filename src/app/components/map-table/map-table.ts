import { CommonModule } from '@angular/common';
import { Component, Input, computed } from '@angular/core';
import { type MapTablePayload } from '../../services/game.service';

@Component({
  selector: 'map-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-table.html',
  styleUrl: './map-table.css',
})
export class MapTableComponent {
  @Input() payload: MapTablePayload | null | undefined;

  readonly hasData = computed(() => {
    const payload = this.payload;
    return !!payload && payload.headers.length > 0 && payload.rows.length > 0;
  });
}

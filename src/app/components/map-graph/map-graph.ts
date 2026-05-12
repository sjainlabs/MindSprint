import { CommonModule } from '@angular/common';
import { Component, Input, computed } from '@angular/core';
import { type MapGraphPayload } from '../../services/game.service';

@Component({
  selector: 'map-graph',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-graph.html',
  styleUrl: './map-graph.css',
})
export class MapGraphComponent {
  @Input() payload: MapGraphPayload | null | undefined;

  readonly hasData = computed(() => {
    const payload = this.payload;
    return !!payload && payload.labels.length > 0 && payload.values.length > 0;
  });

  readonly normalizedBars = computed(() => {
    const payload = this.payload;
    if (!payload || payload.values.length === 0) return [];
    const maxValue = Math.max(...payload.values, 1);
    return payload.values.map((value, index) => ({
      label: payload.labels[index] ?? `Item ${index + 1}`,
      value,
      height: Math.max(8, Math.round((value / maxValue) * 100)),
      icon: payload.icons?.[index] ?? '⭐',
    }));
  });

  readonly maxValue = computed(() => {
    const payload = this.payload;
    if (!payload || payload.values.length === 0) return 1;
    return Math.max(...payload.values, 1);
  });

  readonly columnStyle = computed(() => {
    const count = Math.max(this.normalizedBars().length, 1);
    return `repeat(${count}, minmax(0, 1fr))`;
  });

  readonly lineDots = computed(() => {
    const bars = this.normalizedBars();
    const max = this.maxValue();
    const denominator = Math.max(bars.length - 1, 1);
    return bars.map((bar, index) => ({
      ...bar,
      x: bars.length <= 1 ? 50 : (index / denominator) * 100,
      y: 90 - (bar.value / max) * 80,
    }));
  });

  readonly linePoints = computed(() => {
    return this.lineDots()
      .map((dot) => `${dot.x},${dot.y}`)
      .join(' ');
  });

  getPictureIcons(count: number): number[] {
    return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, i) => i);
  }
}

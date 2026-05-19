import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ParentAccessService } from '../../services/parent-access.service';

@Component({
  selector: 'app-parent-materials',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './parent-materials.component.html',
  styleUrl: './parent-materials.component.css',
})
export class ParentMaterialsComponent {
  private readonly router = inject(Router);
  private readonly parentAccessService = inject(ParentAccessService);

  readonly validatedStudent = this.parentAccessService.validatedStudent;
  readonly unlockedMaterials = this.parentAccessService.unlockedMaterials;

  async backToDashboard(): Promise<void> {
    await this.router.navigate(['/parent/dashboard']);
  }
}

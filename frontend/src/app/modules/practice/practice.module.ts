import { type Routes } from '@angular/router';
import { WorksheetPageComponent } from '../../components/worksheet-page/worksheet-page';

export const practiceRoutes: Routes = [{ path: ':level', component: WorksheetPageComponent }];

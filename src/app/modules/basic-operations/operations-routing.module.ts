import { type Routes } from '@angular/router';

export const operationsRoutes: Routes = [
  {
    path: ':operation',
    children: [
      { path: '', redirectTo: 'concept', pathMatch: 'full' },
      {
        path: 'concept',
        loadComponent: () =>
          import('./components/concept-view/concept-view.component').then(
            (module) => module.ConceptViewComponent,
          ),
      },
      {
        path: 'demo',
        loadComponent: () =>
          import('./components/interactive-demo/interactive-demo.component').then(
            (module) => module.InteractiveDemoComponent,
          ),
      },
      {
        path: 'practice',
        loadComponent: () =>
          import('./components/practice-view/practice-view.component').then(
            (module) => module.PracticeViewComponent,
          ),
      },
      {
        path: 'mastery-check',
        loadComponent: () =>
          import('./components/mastery-check/mastery-check.component').then(
            (module) => module.MasteryCheckComponent,
          ),
      },
    ],
  },
];

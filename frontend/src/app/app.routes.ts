import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'policies' },
  {
    path: 'policies',
    title: 'Policies',
    loadComponent: () =>
      import('./features/policies/policies-page.component').then((m) => m.PoliciesPageComponent),
  },
  { path: '**', redirectTo: 'policies' },
];

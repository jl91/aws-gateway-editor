import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'editor',
    loadComponent: () => import('./pages/editor/editor.component').then(m => m.EditorComponent)
  },
  {
    path: 'new-gateway',
    loadComponent: () => import('./pages/new-gateway/new-gateway.component').then(m => m.NewGatewayComponent)
  },
  {
    path: '**',
    redirectTo: '/home'
  }
];
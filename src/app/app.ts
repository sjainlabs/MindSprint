import { CommonModule, Location } from '@angular/common';
import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('mindsprint-app');
  protected readonly currentUrl = signal('/');

  constructor(
    private auth: AuthService,
    private router: Router,
    private location: Location,
  ) {
    this.currentUrl.set(this.router.url || '/');

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects || '/');
      }
    });

    console.log('[App] App component initialized');
    this.auth.onAuthStateChanged((user) => {
      console.log('[App] onAuthStateChanged callback - user:', user?.email ?? 'no user');
      if (!user) {
        console.log('[App] No user, skipping auto-navigation');
        return;
      }

      const current = this.router.url;
      console.log('[App] Current URL:', current);

      // Only redirect if user is explicitly on parent-login routes.
      // Do not force redirect from home page so student flows can use '/'.
      if (current === '/login/parent' || current === '/parent-login' || current === '/auth/parent-login') {
        console.log('[App] User on parent login page, redirecting to parent/dashboard');
        this.router.navigate(['/parent/dashboard']);
      }
    });
  }

  protected showSubpageNav(): boolean {
    return this.currentUrl() !== '/';
  }

  protected goBack(): void {
    this.location.back();
  }

}

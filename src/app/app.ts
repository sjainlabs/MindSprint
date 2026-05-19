import { Component, signal } from '@angular/core';
import {Router, RouterOutlet} from '@angular/router';
import {AuthService} from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('mindsprint-app');

  constructor(private auth: AuthService, private router: Router) {
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
      if (current === '/login/parent' || current === '/parent-login') {
        console.log('[App] User on parent login page, redirecting to parent/dashboard');
        this.router.navigate(['/parent/dashboard']);
      }
    });
  }

}

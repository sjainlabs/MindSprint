import { ApplicationConfig, APP_INITIALIZER, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withHashLocation } from '@angular/router';

import { routes } from './app.routes';
import { AuthService } from './services/auth.service';

// APP_INITIALIZER to handle Firebase redirect on app startup
const initializeAuthRedirect = (authService: AuthService) => () => authService.handleRedirectLogin();

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withHashLocation()),
    provideHttpClient(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuthRedirect,
      deps: [AuthService],
      multi: true,
    },
  ]
};

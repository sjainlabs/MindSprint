import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// The app routes on the hash (#/…), but a parent shares `<origin>/analyst?code=…`: move that onto the hash.
if (!location.hash && /\/analyst\/?$/.test(location.pathname)) {
  const base = location.pathname.replace(/analyst\/?$/, '');
  history.replaceState(null, '', `${base}#/analyst${location.search}`);
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

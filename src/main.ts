import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// The app routes on the hash (#/…), but older share links were `<origin>/analyst?code=…`: move that onto the hash
// (on GitHub Pages, public/404.html does this, since the path itself is not a file there).
if (!location.hash && /\/analyst\/?$/.test(location.pathname)) {
  const base = location.pathname.replace(/analyst\/?$/, '');
  history.replaceState(null, '', `${base}#/analyst${location.search}`);
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

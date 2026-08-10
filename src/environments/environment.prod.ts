export const environment = {
  apiUrl: ' https://mindsprint-backend-gcr0.onrender.com/api',
  googleOAuthClientId:
    (globalThis as { __MINDSPRINT_GOOGLE_OAUTH_CLIENT_ID__?: string })
      .__MINDSPRINT_GOOGLE_OAUTH_CLIENT_ID__ ?? '',
  firebaseConfig: {
    apiKey: 'AIzaSyAOnUZYbQXtHWnS3xMrc9k5K1w8peuAzAg',
    authDomain: 'mindsprint-b2805.firebaseapp.com',
    projectId: 'mindsprint-b2805',
    storageBucket: 'mindsprint-b2805.firebasestorage.app',
    messagingSenderId: '1001341361856',
    appId: '1:1001341361856:web:154b690b9bf84e24cb5725',
    measurementId: 'G-R6Y74L3M63',
  },
};

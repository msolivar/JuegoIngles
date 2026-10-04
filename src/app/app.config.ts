import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getDatabase, provideDatabase } from '@angular/fire/database';

const firebaseConfig = {
  apiKey: "AIzaSyAAyE_4XiinYJcT327qs9uMUHdCacYnyLM",
  authDomain: "app-frontend-inglesverbos.firebaseapp.com",
  projectId: "app-frontend-inglesverbos",
  storageBucket: "app-frontend-inglesverbos.firebasestorage.app",
  messagingSenderId: "648750830506",
  appId: "1:648750830506:web:5a4b3595d3d081084151d3",
  measurementId: "G-06NNPRVJB1"
};

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideFirebaseApp(() =>
      initializeApp(firebaseConfig)
    ),
    provideDatabase(() =>
      getDatabase()
    )
  ]
};

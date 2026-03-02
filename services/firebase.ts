// This file configures and initializes Firebase.
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD4BHq1l8mu7jYcxql5r9SCojzNTnt7bmE",
  authDomain: "teamlog-16bdc.firebaseapp.com",
  projectId: "teamlog-16bdc",
  storageBucket: "teamlog-16bdc.firebasestorage.app",
  messagingSenderId: "366222989668",
  appId: "1:366222989668:web:5a2a07a59c2a4a305a0271",
  measurementId: "G-DY97VVGKP9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export modular auth and firestore instances
export const auth = getAuth(app);
export const firestore = getFirestore(app);
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDuO1s1CeJyYz7OZZiFbcjoGeaxSChK7lA",
  authDomain: "al-khwarizmi-101.firebaseapp.com",
  projectId: "al-khwarizmi-101",
  storageBucket: "al-khwarizmi-101.firebasestorage.app",
  messagingSenderId: "1019788624534",
  appId: "1:1019788624534:web:f8aa7497b2c790d679f8b7",
  measurementId: "G-P62EKG451Y"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const TEACHER_EMAIL = "ltfbenzeguir@gmail.com";

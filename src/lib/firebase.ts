import { getApp, getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from './firebase-config';

export const firebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FirebaseAuth from 'firebase/auth';
import { initializeAuth, getAuth, type Persistence } from 'firebase/auth';
import { firebaseApp } from './firebase';

// The native SDK exports this helper through its React Native condition.
const { getReactNativePersistence } = FirebaseAuth as typeof FirebaseAuth & {
  getReactNativePersistence(storage: typeof AsyncStorage): Persistence;
};

let nativeAuth;
try {
  nativeAuth = initializeAuth(firebaseApp, {
    persistence: getReactNativePersistence(AsyncStorage) as Persistence,
  });
} catch (error) {
  if ((error as { code?: string }).code !== 'auth/already-initialized')
    throw error;
  nativeAuth = getAuth(firebaseApp);
}
export const auth = nativeAuth;

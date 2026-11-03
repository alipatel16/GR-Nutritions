import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase-auth';
export async function signInGoogle() {
  await signInWithPopup(auth, new GoogleAuthProvider());
}

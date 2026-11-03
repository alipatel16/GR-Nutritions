import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { onIdTokenChanged, signOut, type User } from 'firebase/auth';
import { storeRequest } from '@/lib/store-api';
import { supabaseConfigured } from '@/lib/supabase';
import { z } from 'zod';
import { auth } from '@/lib/firebase-auth';

type AuthState = {
  user: User | null;
  ready: boolean;
  isAdmin: boolean;
  error: string | null;
  logout(): Promise<void>;
};
const Context = createContext<AuthState>({
  user: null,
  ready: false,
  isAdmin: false,
  error: null,
  logout: async () => {},
});
export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<Omit<AuthState, 'logout'>>({
    user: null,
    ready: false,
    isAdmin: false,
    error: null,
  });
  useEffect(
    () =>
      onIdTokenChanged(
        auth,
        async (user) => {
          try {
            let isAdmin = false;
            let backendError: string | null = null;
            if (user && supabaseConfigured) {
              try {
                isAdmin = z.object({ isAdmin: z.boolean() }).parse(await storeRequest('role.get')).isAdmin;
              } catch { backendError = 'Store permissions could not load. Sign in again to retry.'; }
            }
            if (auth.currentUser?.uid !== user?.uid) return;
            setState({
              user,
              ready: true,
              isAdmin,
              error: backendError,
            });
          } catch {
            setState({
              user: null,
              ready: true,
              isAdmin: false,
              error: 'Please sign in again to restore your account.',
            });
          }
        },
        () =>
          setState({
            user: null,
            ready: true,
            isAdmin: false,
            error: 'Could not connect to sign-in. Please retry.',
          }),
      ),
    [],
  );
  return (
    <Context.Provider value={{ ...state, logout: () => signOut(auth) }}>
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);

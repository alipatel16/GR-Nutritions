import { Platform } from 'react-native';
import { AuthRequest, makeRedirectUri, ResponseType } from 'expo-auth-session';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase-auth';
export async function signInGoogle() {
  const clientId =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      : process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  if (!clientId)
    throw new Error(
      'Google login on this device needs the iOS/Android OAuth client configured. Email sign-in is available now.',
    );
  const request = new AuthRequest({
    clientId,
    redirectUri: makeRedirectUri({
      scheme: 'grnutritions',
      path: 'auth/callback',
    }),
    responseType: ResponseType.IdToken,
    scopes: ['openid', 'profile', 'email'],
    usePKCE: false,
  });
  const result = await request.promptAsync({
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  });
  if (result.type !== 'success')
    throw new Error('Google sign-in was cancelled.');
  if (!result.params.id_token)
    throw new Error('Google did not return a sign-in token.');
  await signInWithCredential(
    auth,
    GoogleAuthProvider.credential(result.params.id_token),
  );
}

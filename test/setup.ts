jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

export {};
// Unit screens never contact hosted services. SQL/Edge security is tested separately.
jest.mock('@/lib/firebase', () => ({
  firebaseApp: {},
}));
jest.mock('@/lib/firebase-auth', () => ({ auth: {} }));
jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: jest.fn(() => ({
    user: null,
    ready: true,
    isAdmin: false,
    error: null,
    logout: jest.fn(),
  })),
}));

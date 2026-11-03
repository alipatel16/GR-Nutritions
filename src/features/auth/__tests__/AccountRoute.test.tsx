import { fireEvent, render, screen } from "@testing-library/react-native";
import AccountRoute from "../../../../app/(store)/account";
import { sendEmailVerification, signInWithEmailAndPassword } from "firebase/auth";
import { useAuth } from "../AuthProvider";
jest.mock("../../addresses/AddressBook", () => ({ AddressBook: () => null }));
jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  sendEmailVerification: jest.fn(),
}));
jest.mock("../google-signin", () => ({ signInGoogle: jest.fn() }));
jest.mock("expo-router", () => ({
  Link: jest.requireActual("react-native").Text,
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
it("validates sign-in fields inline before contacting the provider", async () => {
  await render(<AccountRoute />);
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  expect(
    screen.getByLabelText("Email address").props.accessibilityHint,
  ).toMatch(/valid email/i);
  expect(screen.getByLabelText("Password").props.accessibilityHint).toMatch(
    /password/i,
  );
  expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
});
it("shows a safe message for provider configuration errors", async () => {
  jest.mocked(signInWithEmailAndPassword).mockRejectedValueOnce({
    code: "auth/unauthorized-domain",
    message: "Firebase settings instructions",
  });
  await render(<AccountRoute />);
  await fireEvent.changeText(
    screen.getByLabelText("Email address"),
    "shopper@example.com",
  );
  await fireEvent.changeText(screen.getByLabelText("Password"), "password");
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  expect(
    await screen.findByText(
      "We could not complete this request. Please try again in a moment.",
    ),
  ).toBeOnTheScreen();
  expect(screen.queryByText(/Firebase|Authorized domains/)).toBeNull();
});
it("lets an unverified customer resend and refresh email verification for COD", async () => {
  const user = { uid: 'buyer', email: 'buyer@example.com', emailVerified: false,
    reload: jest.fn(async () => { user.emailVerified = true; }), getIdToken: jest.fn(async () => 'refreshed') };
  jest.mocked(useAuth).mockReturnValueOnce({ user, ready: true, isAdmin: false, logout: jest.fn(), error: null } as unknown as ReturnType<typeof useAuth>);
  // Keep the same signed-in user across renders.
  jest.mocked(useAuth).mockImplementation(() => ({ user, ready: true, isAdmin: false, logout: jest.fn(), error: null }) as unknown as ReturnType<typeof useAuth>);
  await render(<AccountRoute />);
  await fireEvent.press(screen.getByRole('button', { name: 'Resend verification email' }));
  expect(sendEmailVerification).toHaveBeenCalledWith(user);
  await fireEvent.press(screen.getByRole('button', { name: 'I have verified my email' }));
  expect(user.reload).toHaveBeenCalled();
  expect(user.getIdToken).toHaveBeenCalledWith(true);
  expect(await screen.findByText('Your email is verified. Cash on Delivery is available.')).toBeOnTheScreen();
  jest.mocked(useAuth).mockImplementation(() => ({user:null,ready:true,isAdmin:false,logout:jest.fn(),error:null}));
});

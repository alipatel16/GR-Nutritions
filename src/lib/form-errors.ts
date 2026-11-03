export type FieldErrors = Record<string, string>;
export type FormIssue = { path: PropertyKey[]; code?: string };

export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect. Please try again.";
    case "auth/email-already-in-use":
      return "An account already exists for this email. Please sign in.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Choose a password with at least 6 characters.";
    case "auth/network-request-failed":
      return "Could not connect. Check your connection and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled. You can try again when you’re ready.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow pop-ups and try again.";
    default:
      return "We could not complete this request. Please try again in a moment.";
  }
}

export function authFieldErrors(
  email: string,
  password: string,
  mode: "signin" | "register" | "reset",
): FieldErrors {
  const errors: FieldErrors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    errors.email = "Enter a valid email address.";
  if (mode !== "reset" && !password) errors.password = "Enter your password.";
  else if (mode === "register" && password.length < 6)
    errors.password = "Choose a password with at least 6 characters.";
  return errors;
}

const addressMessages: FieldErrors = {
  label: "Enter an address label, up to 40 characters.",
  fullName: "Enter your full name, between 2 and 100 characters.",
  phone: "Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9.",
  line1:
    "Enter your house, building and street address, between 5 and 200 characters.",
  line2: "Keep the area or landmark within 200 characters.",
  city: "Enter your city, between 2 and 100 characters.",
  state: "Enter a valid state or union territory, for example Maharashtra.",
  pincode: "Enter a valid 6-digit pincode.",
};
export function addressFieldErrors(issues: readonly FormIssue[]): FieldErrors {
  return Object.fromEntries(
    issues.map((issue) => {
      const field = String(issue.path[0]);
      return [field, addressMessages[field] ?? "Please check this field."];
    }),
  );
}

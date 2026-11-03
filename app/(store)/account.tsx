import { useState } from "react";
import { Link, useLocalSearchParams, useRouter, type Href } from "expo-router";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { ShieldCheck, Mail } from "lucide-react-native";
import { auth } from "@/lib/firebase-auth";
import { useAuth } from "@/features/auth/AuthProvider";
import { signInGoogle } from "@/features/auth/google-signin";
import { safeReturnPath } from "@/features/auth/auth-domain";
import { AddressBook } from "@/features/addresses/AddressBook";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { PageShell } from "@/components/layout/PageShell";
import {
  authErrorMessage,
  authFieldErrors,
  type FieldErrors,
} from "@/lib/form-errors";
import { colors } from "@/theme/tokens";

export default function AccountRoute() {
  const { user, ready, isAdmin, logout } = useAuth();
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  async function run(action: () => Promise<unknown>, success?: string) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setSuccessMessage(false);
    try {
      await action();
      if (success) {
        setMessage(success);
        setSuccessMessage(true);
      } else if (safeReturnPath(next) === "/checkout")
        router.replace("/checkout");
    } catch (e) {
      setMessage(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function validate(mode: "signin" | "register" | "reset") {
    const errors = authFieldErrors(email, password, mode);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setMessage("Please review the highlighted fields.");
      setSuccessMessage(false);
      return false;
    }
    return true;
  }
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.obsidian }}>
      <PageShell style={{ paddingTop: 35, paddingBottom: 90 }}>
        {!ready ? (
          <ActivityIndicator color={colors.violet} />
        ) : user ? (
          <View style={{ gap: 28 }}>
            <View style={styles.heading}>
              <View>
                <AppText tone="accent" variant="caption">
                  YOUR GR ACCOUNT
                </AppText>
                <AppText accessibilityRole="header" variant="display">
                  GOOD TO SEE YOU.
                </AppText>
                <AppText tone="muted">{user.email}</AppText>
              </View>
              <Button variant="ghost" onPress={() => run(logout)}>
                Sign out
              </Button>
            </View>
            {!user.emailVerified && (
              <View style={{ gap: 12 }}>
                <AppText variant="heading">Verify your email for Cash on Delivery</AppText>
                <AppText tone="muted">Open the verification link sent to your email, then refresh your account here.</AppText>
                <Button variant="ghost" disabled={busy} onPress={() => run(() => sendEmailVerification(user), "A verification email is on its way. Please check your inbox and spam folder.")}>
                  Resend verification email
                </Button>
                <Button disabled={busy} onPress={() => run(async () => {
                  await user.reload();
                  await user.getIdToken(true);
                  if (!user.emailVerified) throw new Error('Email is not verified');
                }, "Your email is verified. Cash on Delivery is available.")}>
                  I have verified my email
                </Button>
              </View>
            )}
            {next === "/checkout" && (
              <Button onPress={() => router.push("/checkout")}>
                Continue to checkout
              </Button>
            )}
            <AddressBook uid={user.uid} />
            <Link href={"/orders" as Href} style={styles.link}>
              My orders →
            </Link>
            {isAdmin && (
              <Link href={"/admin" as Href} style={styles.link}>
                Open store administration →
              </Link>
            )}
          </View>
        ) : (
          <View style={styles.authLayout}>
            <View style={styles.intro}>
              <ShieldCheck size={42} color={colors.violet} />
              <AppText tone="accent" variant="caption">
                YOUR ROUTINE, ALL TOGETHER
              </AppText>
              <AppText accessibilityRole="header" variant="display">
                WELCOME{"\n"}TO YOUR NEXT LEVEL.
              </AppText>
              <AppText tone="muted" variant="bodyLarge">
                Save your delivery addresses, follow your orders, and keep your
                nutrition routine moving.
              </AppText>
              <View style={styles.promise}>
                <Mail size={21} color={colors.violet} />
                <AppText variant="caption">
                  Browse freely. Sign in securely when you’re ready to order.
                </AppText>
              </View>
            </View>
            <View style={styles.card}>
              <AppText variant="heading">
                {register ? "CREATE YOUR ACCOUNT" : "SIGN IN TO GR"}
              </AppText>
              <AppText tone="muted" variant="caption">
                {next === "/checkout"
                  ? "Sign in to choose your delivery address and continue."
                  : "Your saved addresses and orders are waiting."}
              </AppText>
              <Button
                variant="ghost"
                disabled={busy}
                onPress={() => run(signInGoogle)}
              >
                Continue with Google
              </Button>
              <AppText
                style={{ textAlign: "center" }}
                tone="muted"
                variant="caption"
              >
                or use your email
              </AppText>
              <FormField
                label="Email address"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                error={fieldErrors.email}
                editable={!busy}
                onChangeText={(value) => {
                  setEmail(value);
                  setFieldErrors((errors) => ({ ...errors, email: "" }));
                }}
              />
              <FormField
                label="Password"
                secureTextEntry
                autoComplete={register ? "new-password" : "current-password"}
                value={password}
                error={fieldErrors.password}
                hint={register ? "Use at least 6 characters." : undefined}
                editable={!busy}
                onChangeText={(value) => {
                  setPassword(value);
                  setFieldErrors((errors) => ({ ...errors, password: "" }));
                }}
              />
              <Button
                loading={busy}
                onPress={() => {
                  if (!validate(register ? "register" : "signin")) return;
                  void run(async () => {
                    if (register) {
                      const r = await createUserWithEmailAndPassword(
                        auth,
                        email.trim(),
                        password,
                      );
                      await sendEmailVerification(r.user);
                    } else
                      await signInWithEmailAndPassword(
                        auth,
                        email.trim(),
                        password,
                      );
                  });
                }}
              >
                {register ? "Create account" : "Sign in"}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onPress={() => {
                  setRegister(!register);
                  setMessage("");
                  setFieldErrors({});
                }}
              >
                {register
                  ? "Already have an account? Sign in"
                  : "New to GR? Create an account"}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onPress={() => {
                  if (!validate("reset")) return;
                  void run(
                    () => sendPasswordResetEmail(auth, email.trim()),
                    "If an account exists, a password reset email is on its way.",
                  );
                }}
              >
                Forgot your password?
              </Button>
            </View>
          </View>
        )}
        {message ? (
          <AppText
            accessibilityRole={successMessage ? undefined : "alert"}
            accessibilityLiveRegion="polite"
            style={{
              marginTop: 20,
              ...(successMessage ? { color: colors.success } : {}),
            }}
            tone={successMessage ? "primary" : "danger"}
          >
            {message}
          </AppText>
        ) : null}
      </PageShell>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
  },
  authLayout: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 50,
    justifyContent: "space-between",
  },
  intro: { flex: 1, minWidth: 260, gap: 22, paddingTop: 25, maxWidth: 560 },
  card: {
    flex: 1,
    minWidth: 260,
    maxWidth: 480,
    backgroundColor: "#FFF",
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 26,
    gap: 16,
  },
  promise: {
    backgroundColor: "#E9EDDE",
    padding: 18,
    borderRadius: 9,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  link: { color: colors.violet, paddingVertical: 12, fontSize: 15 },
});

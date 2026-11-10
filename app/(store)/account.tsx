import { useState } from "react";
import { Link, useLocalSearchParams, useRouter, type Href } from "expo-router";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { BadgeCheck, Mail, MapPin, Package, Settings, ShieldCheck, ShoppingBag, Sparkles, Wallet } from "lucide-react-native";
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
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { ChromeScrollView } from '@/components/navigation/ScrollChrome';
import { useBreakpoint } from "@/theme/use-breakpoint";

export default function AccountRoute() {
  const { user, ready, isAdmin, logout } = useAuth();
  const phone = useBreakpoint() === "mobile";
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
  const displayName = user?.displayName?.trim() || user?.email?.split("@")[0] || "GR member";
  const initial = displayName.charAt(0).toUpperCase();
  const messageView = message ? (
    <AppText
      accessibilityRole={successMessage ? undefined : "alert"}
      accessibilityLiveRegion="polite"
      style={[styles.message, successMessage ? styles.messageSuccess : styles.messageError]}
      tone={successMessage ? "primary" : "danger"}
    >
      {message}
    </AppText>
  ) : null;
  return (
    <ChromeScrollView style={{ flex: 1, backgroundColor: colors.obsidian }}>
      {!ready ? (
        <ActivityIndicator color={colors.violet} style={{ marginTop: 48 }} />
      ) : user ? (
        <>
          <View style={[styles.profileBand, phone && styles.mobileProfileBand]}>
            <PageShell>
              <View style={styles.profileRow}>
                <View style={[styles.avatar, phone && styles.mobileAvatar]}>
                  <AppText style={styles.avatarText}>{initial}</AppText>
                </View>
                <View style={styles.profileCopy}>
                  <AppText style={styles.eyebrow}>YOUR GR ACCOUNT</AppText>
                  <AppText accessibilityRole="header" style={[styles.profileName, phone && styles.mobileProfileName]}>
                    GOOD TO SEE YOU.
                  </AppText>
                  <AppText style={styles.profileEmail}>{user.email}</AppText>
                  <View style={[styles.verify, user.emailVerified ? styles.verified : styles.unverified]}>
                    {user.emailVerified ? <BadgeCheck color={colors.mint} size={13} /> : <Mail color="#FFD27A" size={13} />}
                    <AppText style={[styles.verifyText, { color: user.emailVerified ? colors.mint : "#FFD27A" }]}>
                      {user.emailVerified ? "Email verified" : "Email not verified"}
                    </AppText>
                  </View>
                </View>
                <Button variant="inverse" onPress={() => run(logout)} style={styles.signOut}>
                  Sign out
                </Button>
              </View>
            </PageShell>
          </View>
          <PageShell style={styles.shell}>
            <View style={styles.stack}>
              {next === "/checkout" && (
                <Button onPress={() => router.push("/checkout")}>
                  Continue to checkout
                </Button>
              )}
              {!user.emailVerified && (
                <View style={styles.verifyCard}>
                  <View style={styles.verifyIcon}><Mail color="#8A5A00" size={20} /></View>
                  <View style={styles.verifyBody}>
                    <AppText style={styles.cardTitle}>Verify your email for Cash on Delivery</AppText>
                    <AppText tone="muted">Open the verification link sent to your email, then refresh your account here.</AppText>
                    <View style={styles.verifyActions}>
                      <Button disabled={busy} onPress={() => run(async () => {
                        await user.reload();
                        await user.getIdToken(true);
                        if (!user.emailVerified) throw new Error('Email is not verified');
                      }, "Your email is verified. Cash on Delivery is available.")}>
                        I have verified my email
                      </Button>
                      <Button variant="ghost" disabled={busy} onPress={() => run(() => sendEmailVerification(user), "A verification email is on its way. Please check your inbox and spam folder.")}>
                        Resend verification email
                      </Button>
                    </View>
                  </View>
                </View>
              )}
              {messageView}
              <View style={styles.tiles}>
                {([
                  ["/orders", "My orders", "Track deliveries and past orders", Package],
                  ["/shop", "Shop", "Browse the full catalogue", ShoppingBag],
                  ["/advisor", "GR Coach", "Find products for your goal", Sparkles],
                  ...(isAdmin ? [["/admin", "Store administration", "Products, orders and settings", Settings] as const] : []),
                ] as const).map(([href, title, note, Icon]) => (
                  <Link key={href} href={href as Href} asChild>
                    <Pressable style={styles.tile}>
                      <View style={styles.tileIcon}><Icon color={colors.mint} size={20} /></View>
                      <View style={styles.tileCopy}>
                        <AppText style={styles.tileTitle}>{title}</AppText>
                        <AppText tone="muted" variant="caption">{note}</AppText>
                      </View>
                    </Pressable>
                  </Link>
                ))}
              </View>
              <View style={styles.section}>
                <AddressBook uid={user.uid} />
              </View>
            </View>
          </PageShell>
        </>
      ) : (
        <PageShell style={styles.shell}>
          <View style={[styles.authLayout, phone && styles.mobileAuthLayout]}>
            <View style={[styles.intro, phone && styles.mobileStackItem]}>
              <View style={styles.shield}><ShieldCheck size={26} color={colors.mint} /></View>
              <AppText tone="accent" variant="caption">
                YOUR ROUTINE, ALL TOGETHER
              </AppText>
              <AppText accessibilityRole="header" style={[styles.welcome, phone && styles.mobileWelcome]}>
                WELCOME{"\n"}TO YOUR NEXT LEVEL.
              </AppText>
              <AppText tone="muted">
                Save your delivery addresses, follow your orders, and keep your
                nutrition routine moving.
              </AppText>
              <View style={styles.benefits}>
                {([
                  [MapPin, "Saved delivery addresses"],
                  [Package, "Order tracking in one place"],
                  [Wallet, "Cash on delivery once verified"],
                ] as const).map(([Icon, label]) => (
                  <View key={label} style={styles.benefit}>
                    <Icon color={colors.mintInk} size={16} />
                    <AppText variant="caption" style={styles.benefitText}>{label}</AppText>
                  </View>
                ))}
              </View>
              <View style={styles.promise}>
                <Mail size={18} color={colors.mintInk} />
                <AppText variant="caption">
                  Browse freely. Sign in securely when you’re ready to order.
                </AppText>
              </View>
            </View>
            <View style={[styles.card, phone && styles.mobileStackItem, phone && styles.mobileCard]}>
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
          {messageView}
        </PageShell>
      )}
    </ChromeScrollView>
  );
}
const styles = StyleSheet.create({
  shell: { paddingBottom: 90, paddingTop: spacing[6] },
  stack: { gap: spacing[5] },
  profileBand: { backgroundColor: colors.graphite, paddingVertical: spacing[8] },
  profileRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing[4] },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.mint,
    borderRadius: radii.pill,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  avatarText: { color: colors.onMint, fontFamily: typography.bodyBold, fontSize: 26 },
  profileCopy: { flex: 1, gap: 2, minWidth: 200 },
  eyebrow: { color: colors.mint, fontFamily: typography.bodyBold, fontSize: 11, letterSpacing: 1.8 },
  profileName: { color: colors.onDark, fontFamily: typography.displayHeavy, fontSize: 34, lineHeight: 38 },
  profileEmail: { color: colors.graphiteMuted, fontSize: 14 },
  verify: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    marginTop: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
  },
  verified: { borderColor: "#1F5A49" },
  unverified: { borderColor: "#6B5520" },
  verifyText: { fontFamily: typography.bodySemibold, fontSize: 12 },
  signOut: { minHeight: 44 },
  verifyCard: {
    backgroundColor: "#FFF8E6",
    borderColor: "#F1DDA6",
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing[4],
    padding: spacing[5],
  },
  verifyIcon: {
    alignItems: "center",
    backgroundColor: "#FFEBB5",
    borderRadius: radii.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  verifyBody: { flex: 1, gap: spacing[2], minWidth: 0 },
  verifyActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2], marginTop: spacing[2] },
  cardTitle: { color: colors.ink, fontFamily: typography.bodyBold, fontSize: 17 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing[3] },
  tile: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: 260,
    flexDirection: "row",
    flexGrow: 1,
    gap: spacing[3],
    padding: spacing[4],
  },
  tileIcon: {
    alignItems: "center",
    backgroundColor: colors.graphite,
    borderRadius: radii.sm,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  tileCopy: { flex: 1, gap: 2, minWidth: 0 },
  tileTitle: { color: colors.ink, fontFamily: typography.bodyBold, fontSize: 15 },
  section: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing[5],
  },
  // Phones show the sign-in card first; the welcome copy follows below it.
  mobileAuthLayout: { flexDirection: "column-reverse", gap: spacing[6] },
  mobileStackItem: { flexBasis: "auto", flexGrow: 0, flexShrink: 0, maxWidth: "100%", minWidth: 0, width: "100%" },
  mobileCard: { borderRadius: 14, padding: 18 },
  mobileWelcome: { fontSize: 30, lineHeight: 32 },
  mobileProfileName: { fontSize: 26, lineHeight: 30 },
  mobileAvatar: { height: 52, width: 52 },
  mobileProfileBand: { paddingVertical: spacing[6] },
  authLayout: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
    justifyContent: "space-between",
  },
  intro: { flex: 1, gap: spacing[3], maxWidth: 520, minWidth: 260 },
  shield: {
    alignItems: "center",
    backgroundColor: colors.graphite,
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  welcome: { color: colors.ink, fontFamily: typography.displayHeavy, fontSize: 40, lineHeight: 42 },
  benefits: { gap: spacing[2], marginTop: spacing[1] },
  benefit: { alignItems: "center", flexDirection: "row", gap: spacing[2] },
  benefitText: { color: colors.inkMuted, fontSize: 13.5 },
  card: {
    flex: 1,
    minWidth: 260,
    maxWidth: 460,
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderTopColor: colors.mint,
    borderTopWidth: 4,
    borderWidth: 1,
    borderRadius: 18,
    padding: 24,
    gap: 14,
    ...shadows.raised,
  },
  promise: {
    backgroundColor: colors.mintSoft,
    padding: 14,
    borderRadius: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginTop: spacing[2],
  },
  message: { borderRadius: radii.sm, marginTop: spacing[4], padding: spacing[3] },
  messageSuccess: { backgroundColor: colors.successSoft, color: colors.success },
  messageError: { backgroundColor: colors.dangerSoft },
});

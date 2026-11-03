import {
  authErrorMessage,
  authFieldErrors,
  addressFieldErrors,
} from "../form-errors";
import { addressSchema } from "@/features/addresses/address-schema";
it("never reveals unknown provider messages or configuration instructions", () => {
  expect(
    authErrorMessage(new Error("Firebase secret configuration")),
  ).not.toMatch(/Firebase|secret|configuration/);
  expect(authErrorMessage({ code: "auth/unauthorized-domain" })).not.toMatch(
    /Firebase|domain|Settings/,
  );
  expect(authErrorMessage({ code: "auth/invalid-credential" })).toMatch(
    /email or password/i,
  );
});
it("validates reset email independently from the password", () => {
  expect(authFieldErrors("wrong", "", "reset")).toHaveProperty("email");
  expect(authFieldErrors("shopper@example.com", "", "reset")).toEqual({});
  expect(
    authFieldErrors("shopper@example.com", "123", "register"),
  ).toHaveProperty("password");
});
it("converts schema issues into shopper field feedback without internal paths", () => {
  const result = addressSchema.safeParse({});
  if (result.success) throw new Error("Expected invalid input");
  const errors = addressFieldErrors(result.error.issues);
  expect(errors.fullName).toMatch(/full name/i);
  expect(errors.line1).toMatch(/street address/i);
  expect(Object.values(errors).join(" ")).not.toMatch(
    /Invalid input|expected|undefined/,
  );
});

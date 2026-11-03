import { render, screen } from "@testing-library/react-native";
import { FormField } from "../FormField";
it("announces inline feedback and links it to its field", async () => {
  await render(
    <FormField
      label="Mobile number"
      error="Enter 10 digits."
      hint="Used for delivery updates."
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Enter 10 digits.");
  expect(
    screen.getByLabelText("Mobile number").props.accessibilityHint,
  ).toContain("Enter 10 digits.");
  expect(screen.getByText("Used for delivery updates.")).toBeOnTheScreen();
});

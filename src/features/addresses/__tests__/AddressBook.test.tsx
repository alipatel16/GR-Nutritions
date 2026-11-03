import { fireEvent, render, screen } from "@testing-library/react-native";
import { AddressBook } from "../AddressBook";
import { addressRepository } from "../address-repository";
jest.mock("../address-repository", () => ({
  addressRepository: {
    list: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    setDefault: jest.fn(),
  },
}));
beforeEach(() => {
  jest.mocked(addressRepository.list).mockResolvedValue([]);
});
it("shows friendly inline feedback for invalid addresses", async () => {
  await render(<AddressBook uid="shopper" />);
  await fireEvent.press(screen.getByRole("button", { name: /Add new/ }));
  await fireEvent.press(screen.getByRole("button", { name: "Save address" }));
  expect(screen.getByLabelText("Full name").props.accessibilityHint).toMatch(
    /full name/i,
  );
  expect(
    screen.getByText("Please review the highlighted address fields."),
  ).toBeOnTheScreen();
  expect(screen.queryByText(/Too small|Invalid input/)).toBeNull();
});
it("offers a retry on address loading failure without a misleading empty state", async () => {
  jest
    .mocked(addressRepository.list)
    .mockRejectedValueOnce(new Error("private database data"));
  await render(<AddressBook uid="shopper" />);
  expect(
    await screen.findByRole("button", { name: "Try again" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByText("Add your first address to make checkout easier."),
  ).toBeNull();
  expect(screen.queryByText("private database data")).toBeNull();
});

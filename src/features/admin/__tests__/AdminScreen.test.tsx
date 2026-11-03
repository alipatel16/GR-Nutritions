import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { useAuth } from "@/features/auth/AuthProvider";
import { adminRepository } from "../admin-repository";
import { AdminScreen } from "../AdminScreen";
import { colors } from "@/theme/tokens";
import { makeProduct } from "../../../../test/factories/product";
import * as ImagePicker from 'expo-image-picker';
jest.mock("../admin-repository", () => ({
  adminRepository: {
    products: jest.fn(),
    orders: jest.fn(),
    save: jest.fn(),
    upload: jest.fn(),
    advance: jest.fn(),
  },
}));
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }));
const product = makeProduct({ status: "draft" });
beforeEach(() => {
  jest
    .mocked(useAuth)
    .mockReturnValue({
      ready: true,
      user: { uid: "admin-test", email: "admin@example.com" },
      isAdmin: true,
    } as ReturnType<typeof useAuth>);
  jest.mocked(adminRepository.products).mockResolvedValue([product]);
  jest.mocked(adminRepository.orders).mockResolvedValue([]);
  jest.mocked(adminRepository.save).mockResolvedValue(product);
});
it("allows a signed-in admin to save and displays success with a success color", async () => {
  await render(<AdminScreen />);
  await fireEvent.press(await screen.findByText(product.name));
  await fireEvent.press(screen.getByRole("button", { name: "Save product" }));
  const success = await screen.findByText("Product saved.");
  expect(success).toHaveStyle({ color: colors.success });
});
it("does not reveal raw backend errors from product save", async () => {
  jest
    .mocked(adminRepository.save)
    .mockRejectedValueOnce(new Error("SQL Firebase internal secret"));
  await render(<AdminScreen />);
  await fireEvent.press(await screen.findByText(product.name));
  await fireEvent.press(screen.getByRole("button", { name: "Save product" }));
  await waitFor(() =>
    expect(screen.queryByText("SQL Firebase internal secret")).toBeNull(),
  );
  expect(
    await screen.findByText("Product could not be saved. Please try again."),
  ).toBeOnTheScreen();
});
it('handles image-picker permission errors without leaking native errors', async () => {
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockRejectedValueOnce(new Error('Native permission error'));
  await render(<AdminScreen />);
  await fireEvent.press(await screen.findByText(product.name));
  await fireEvent.press(screen.getByRole('button',{name:'Images'}));
  await fireEvent.press(screen.getByRole('button',{name:'Upload product image'}));
  expect(await screen.findByText('Image could not be uploaded. Please try again.')).toBeOnTheScreen();
});

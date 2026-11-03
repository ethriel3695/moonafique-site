import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within, waitFor } from "storybook/test";
import { Cart } from "@/components/cart";
import { ProductBuyForm } from "@/components/product-buy-form";
import { CartProvider } from "@/lib/cart-context";
import { Toaster } from "@/components/ui/toaster";
const product = {
  id: "story_cart_photo_missing",
  name: "Collectible without a photo",
  images: [],
  price: {
    id: "price_story_missing_photo",
    amount: 15,
    display_amount: "$15.00",
  },
  metadata: { stock: 8, status: "available" as const },
};
function CartReview() {
  return (
    <CartProvider storageKey="storybook-cart-regression">
      <div className="mx-auto grid max-w-lg gap-8 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl">Cart review</h1>
          <Cart
            createCheckout={async () => {
              throw new Error(
                "Checkout is temporarily unavailable. Please try again.",
              );
            }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Local fixture. Checkout fails deliberately to demonstrate recovery; no
          payment service is contacted.
        </p>
        <ProductBuyForm product={product} />
        <Toaster />
      </div>
    </CartProvider>
  );
}
const meta = {
  title: "First release/Cart",
  component: CartReview,
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
  beforeEach: () => {
    localStorage.removeItem("storybook-cart-regression");
  },
} satisfies Meta<typeof CartReview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Open cart" }),
    );
    await expect(within(document.body).getByRole("dialog")).toHaveTextContent(
      "Your cart is empty.",
    );
  },
};
export const QuantityAndCheckoutRecovery: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", {
        name: `Increase quantity for ${product.name}`,
      }),
    );
    await userEvent.click(
      canvas.getByRole("button", {
        name: `Increase quantity for ${product.name}`,
      }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Add to cart" }));
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Open cart, 3 items" }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Open cart, 3 items" }),
    );
    const dialog = within(within(document.body).getByRole("dialog"));
    await expect(
      dialog.getByLabelText(`Quantity for ${product.name}`),
    ).toHaveTextContent("3");
    await expect(dialog.getByText("$45.00")).toBeInTheDocument();
    await userEvent.click(
      dialog.getByRole("button", { name: "Continue to checkout" }),
    );
    await expect(dialog.getByRole("alert")).toHaveTextContent(
      "Your cart has been kept.",
    );
    await expect(
      dialog.getByRole("button", { name: "Continue to checkout" }),
    ).toBeEnabled();
    await userEvent.click(
      dialog.getByRole("button", { name: `Remove ${product.name} from cart` }),
    );
    await expect(dialog.getByText("Your cart is empty.")).toBeInTheDocument();
  },
};
export const InvalidQuantity: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.clear(canvas.getByRole("spinbutton"));
    await userEvent.type(canvas.getByRole("spinbutton"), "1.5");
    await userEvent.click(canvas.getByRole("button", { name: "Add to cart" }));
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Choose a whole quantity",
    );
    await expect(
      canvas.getByRole("button", { name: "Open cart" }),
    ).toBeInTheDocument();
  },
};

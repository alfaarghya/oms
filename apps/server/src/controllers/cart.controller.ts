import prisma from "@oms/db/prisma";
import { Request, Response } from "express";
import { Status, StatusMessages } from "../statusCode/response";
import { errorMessage } from "../utils/ApiError";

import { Cart_reqBody } from "@oms/types/cart.validator";
import { protected_reqBody } from "@oms/types/user.validator";

// ! Get all carts
// @SouZe-San
// @description: Get cart and cart products of a user
// @route: GET /api/customer/cart
export const getCart = async (req: Request, res: Response) => {
  try {
    // Validate the request body
    const req_validation = await protected_reqBody.safeParseAsync(req.body);
    if (!req_validation.success) {
      res.status(Status.InvalidInput).json({
        StatusMessages: StatusMessages[Status.InvalidInput],
        message: `${req_validation.error.errors.map((err) => err.message).join(", ")}`,
      });
      return;
    }

    // Destructure user from body
    const { user } = req_validation.data;

    // Fetching cart of the user
    const cartProducts = await prisma.cartProduct.findMany({
      where: {
        userId: user.userId,
      },
      include: {
        product: true,
      },
    });

    // Send response
    res.status(Status.Success).json({
      statusMessage: StatusMessages[Status.Success],
      message: "Successfully fetched all carts",
      cartProducts,
    });
  } catch (error) {
    errorMessage("Error From getting all Carts: ", res, error);
  }
};

// ! update cartProducts -- no route will be creating for this
// Delete a single cartProduct --
const deleteCartProduct = async (cartProductId: string) => {
  try {
    const cartProducts = await prisma.cartProduct.delete({
      where: {
        id: cartProductId,
      },
    });

    return cartProducts;
  } catch (error) {
    console.error("Error while deleting cartProduct: ", error);
    throw new Error("Error while deleting cartProduct");
  }
};

// Delete cartProducts that are linked to this cart
export const deleteCartProducts = async (userId: string) => {
  try {
    const cartProducts = await prisma.cartProduct.deleteMany({
      where: {
        userId,
      },
    });

    return cartProducts;
  } catch (error) {
    console.error("Error while deleting cartProducts: ", error);
    throw new Error("Error while deleting cartProducts");
  }
};

// update quantities of cartProducts --
const updateCartProduct = async (productId: string, quantity: number) => {
  try {
    const cartProducts = await prisma.cartProduct.update({
      where: {
        id: productId,
      },
      data: {
        quantity: quantity,
      },
    });

    return cartProducts;
  } catch (error) {
    console.error("Error while updating cartProduct: ", error);
    throw new Error("Error while updating cartProduct");
  }
};

const stockCheck = async (products: { productId: string; quantity: number }) => {
  try {
    // Check if the product exists and has enough stock
    const product = await prisma.product.findUnique({
      where: { id: products.productId },
    });

    if (!product) {
      throw new Error(`Product with ID ${products.productId} does not exist.`);
    }

    if (product.stock < products.quantity) {
      return false; // Not enough stock available
    }

    return true; // Stock is sufficient
  } catch (error) {
    console.error("Error while checking stock: ", error);
    throw new Error("Error while checking stock");
  }
};

// ! Add items in cart (Update Cart)
// @SouZe-San
// @description: Update cart
// @route: PUT /api/customer/cart
export const updateCart = async (req: Request, res: Response) => {
  try {
    // Validate the request body
    const req_validation = await Cart_reqBody.safeParseAsync(req.body);
    if (!req_validation.success) {
      res.status(Status.Forbidden).json({
        StatusMessages: StatusMessages[Status.Forbidden],
        message: req_validation.error.errors.map((err) => err.message).join(", "),
      });
      return;
    }

    // Destructure products from body
    const { products, user } = req_validation.data;

    // Find the  carts - if cart not found will get an error

    // ---------------------------------------------------------------------------    //
    //! old and new products
    const previousProducts = await prisma.cartProduct.findMany({
      where: {
        userId: user.userId,
      },
    });
    const upComingProducts = products;

    // ---------------------------------------------------------------------------    //

    // 1. Find the products that are already in the cart
    const alreadyInCart = previousProducts.filter((oldProduct) =>
      upComingProducts.some((newProduct) => newProduct.productId === oldProduct.productId)
    );

    // ---------------------------------------------------------------------------    //

    // 2. Update the quantities of the products that are already in the cart
    if (alreadyInCart.length > 0) {
      alreadyInCart.forEach(async (oldProduct) => {
        // Check stock availability
        if (await stockCheck({ productId: oldProduct.productId, quantity: oldProduct.quantity })) {
          const newProduct = upComingProducts.find((product) => product.productId === oldProduct.productId);
          if (newProduct) {
            await updateCartProduct(oldProduct.id, newProduct.quantity);
          }
        }
      });
    }
    // ---------------------------------------------------------------------------    //
    // 3. Find the products that are not in the cart
    const notInCart = upComingProducts.filter(
      (newProduct) => !alreadyInCart.some((oldProduct) => oldProduct.productId === newProduct.productId)
    );

    // 4. Add the products that are not in the cart
    if (notInCart.length > 0) {
      notInCart.forEach(async (newProduct) => {
        await prisma.cartProduct.createMany({
          data: {
            name: newProduct.name,
            productId: newProduct.productId,
            quantity: newProduct.quantity,
            userId: user.userId,
          },
        });
      });
    }
    // ---------------------------------------------------------------------------    //

    // 5. Delete the products that are in the cart but not in the request
    const removeProducts = previousProducts.filter(
      (oldProduct) => !upComingProducts.some((newProduct) => newProduct.productId === oldProduct.productId)
    );

    // 6. delete cartProducts those are removed from cart
    if (removeProducts.length > 0) {
      removeProducts.forEach(async (product) => {
        await deleteCartProduct(product.id);
      });
    }
    // ---------------------------------------------------------------------------    //

    // Send response
    res.status(Status.Created).json({
      statusMessage: StatusMessages[Status.Created],
      message: "Successfully cart UPDATED",
    });
  } catch (error) {
    errorMessage("Error While updating Cart: ", res, error);
  }
};

export const addInCart = async (req: Request, res: Response) => {
  try {
    // Validate the request body
    const req_validation = await Cart_reqBody.safeParseAsync(req.body);
    if (!req_validation.success) {
      res.status(Status.Forbidden).json({
        StatusMessages: StatusMessages[Status.Forbidden],
        message: req_validation.error.errors.map((err) => err.message).join(", "),
      });
      return;
    }

    // Destructure products from body
    const { products, user } = req_validation.data;

    // Add products to cart
    for (const product of products) {
      await prisma.cartProduct.create({
        data: {
          name: product.name,
          productId: product.productId,
          quantity: product.quantity,
          userId: user.userId,
        },
      });
    }

    // Send response
    res.status(Status.Created).json({
      statusMessage: StatusMessages[Status.Created],
      message: "Successfully added items to cart",
    });
  } catch (error) {
    errorMessage("Error While adding items to Cart: ", res, error);
  }
};

// ! DELETE cart
// @SouZe-San
// @description: Delete a cart
// @useCase: When user's account will be DELETED, delete the cart
export const deleteCart = async (cartId: string) => {
  try {
    // take cartId from params
    if (!cartId) {
      throw new Error("Cart ID is required");
    }

    // delete cartProducts that are linked to this cart
    await deleteCartProducts(cartId);

    // Send respons
  } catch (error) {
    console.error("Error while deleting cart: ", error);
    throw new Error("Error while deleting cart");
  }
};

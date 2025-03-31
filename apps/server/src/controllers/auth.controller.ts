import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { SignInSchema, SignUpSchema } from "@oms/types/auth.validator";
import prisma from "@oms/db/prisma";
import { User } from "@oms/types/user.type";
import { Status, StatusMessages } from "../statusCode/response";
import { COOKIE_OPTIONS } from "../utils/cookieOptions";

// ! kindly recheck this before Production/Final Deployment

// @alfaarghya
// @description: sign-up controller use for registering new user
//!sign up controller
export const signupController = async (req: Request, res: Response) => {
  //validate req body by zod
  const validation = SignUpSchema.safeParse(req.body);

  // check if req parse successfully or not
  if (!validation.success) {
    res.status(Status.InvalidInput).json({
      status: Status.InvalidInput,
      statusMessage: StatusMessages[Status.InvalidInput],
      message: validation.error.errors.map((err) => err.path + " " + err.message).join(", "),
    });
    return;
  }

  try {
    const { firstName, lastName, email, password, primaryMobile, dob, role } = validation.data;

    //check if email or primaryMobile already exists
    if (await prisma.user.findFirst({ where: { OR: [{ email }, { primaryMobile }] } })) {
      res.status(Status.Conflict).json({
        status: Status.Conflict,
        statusMessage: StatusMessages[Status.Conflict],
        message: "email or mobile already exists",
      });
      return;
    }

    //Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    //create new user
    let newUser: User;
    if (role === "ADMIN") {
      newUser = await prisma.user.create({
        data: { firstName, lastName, email, primaryMobile, dob, role, password: hashedPassword },
      });
    } else {
      //role will be CUSTOMER
      newUser = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          primaryMobile,
          dob: new Date(),
          password: hashedPassword,
        },
      });
    }

    const JWT_SECRET = process.env.JWT_SECRET!;
    //Generate JWT token
    const token = jwt.sign({ userId: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    //set token in cookie
    res.cookie("token", token, COOKIE_OPTIONS);

    //send the response
    res.status(Status.Success).json({
      status: Status.Success,
      statusMessage: StatusMessages[Status.Success],
      message: "Account created successfully",
    });
    return;
  } catch (error) {
    console.error("Error in signup:", error);
    res.status(Status.InternalServerError).json({
      status: Status.InternalServerError,
      statusMessage: StatusMessages[Status.InternalServerError],
      message: "Internal server error, please try again later",
    });
    return;
  }
};

// @alfaarghya
// @description: sign-in controller use for login user
//! sign in controller
export const signinController = async (req: Request, res: Response) => {
  //validate req body by zod
  const validation = SignInSchema.safeParse(req.body);

  // check if req parse successfully or not
  if (!validation.success) {
    res.status(Status.InvalidInput).json({
      status: Status.InvalidInput,
      statusMessage: StatusMessages[Status.InvalidInput],
      message: validation.error.errors.map((err) => err.path + " " + err.message).join(", "),
    });
    return;
  }

  try {
    const { email, primaryMobile, password } = validation.data;

    //get user from db
    const user: User = await prisma.user.findFirstOrThrow({
      where: { OR: [{ email }, { primaryMobile }] },
    });

    if (!user) {
      res.status(Status.NotFound).json({
        status: Status.NotFound,
        statusMessage: StatusMessages[Status.NotFound],
        message: "User not found, please sign up first",
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    //check if password matches
    if (!isPasswordValid) {
      res.status(Status.Forbidden).json({
        status: Status.Forbidden,
        statusMessage: StatusMessages[Status.Forbidden],
        message: "Incorrect password, please try again",
      });
      return;
    }

    const JWT_SECRET = process.env.JWT_SECRET!;
    console.log("New User:", JWT_SECRET);
    //Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    //set token in cookie
    res.cookie("token", token, COOKIE_OPTIONS);

    //send the response
    res.status(Status.Success).json({
      status: Status.Success,
      statusMessage: StatusMessages[Status.Success],
      message: "Signed in successfully",
    });
    return;
  } catch (error) {
    console.error("Error in signin:", error);
    res.status(Status.InternalServerError).json({
      status: Status.InternalServerError,
      statusMessage: StatusMessages[Status.InternalServerError],
      message: "Internal server error, please try again later",
    });
    return;
  }
};

// logout Controller
export const logoutController = (req: Request, res: Response) => {
  // clear the auth cookies
  res.clearCookie("token", { ...COOKIE_OPTIONS, maxAge: 0 });

  res.status(Status.Success).json({
    status: Status.Success,
    statusMessage: StatusMessages[Status.Success],
    message: "Logged out successfully",
  });

  return;
};

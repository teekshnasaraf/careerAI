import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { StringValue } from "ms";

export const generateToken = (userId: string): string => {
  const secret: Secret = process.env.JWT_SECRET as string;

  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as StringValue,
  };

  return jwt.sign({ userId }, secret, options);
};
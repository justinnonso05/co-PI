import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, User } from '@prisma/client';

import { prisma } from '../db';
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRY = '7d';

export class AuthService {
  static async registerUser(email: string, passwordHash: string, firstName: string, lastName: string): Promise<{ user: Omit<User, 'passwordHash'>; token: string }> {
    const hashed = await bcrypt.hash(passwordHash, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashed,
        firstName,
        lastName,
      },
    });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    });

    const { passwordHash: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  static async loginUser(email: string, passwordHash: string): Promise<{ user: Omit<User, 'passwordHash'>; token: string }> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw { statusCode: 401, message: 'Invalid email or password' };
    }

    const isValidPassword = await bcrypt.compare(passwordHash, user.passwordHash);

    if (!isValidPassword) {
      throw { statusCode: 401, message: 'Invalid email or password' };
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    });

    const { passwordHash: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }
}

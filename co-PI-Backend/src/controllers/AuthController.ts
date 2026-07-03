import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName, university, faculty, department } = req.body;

      if (!email || !password || !firstName || !lastName || !university || !faculty || !department) {
        return res.status(400).json({ error: 'Bad Request', message: 'All fields are required.' });
      }

      const { user, token } = await AuthService.registerUser(email, password, firstName, lastName, university, faculty, department);
      res.status(201).json({ message: 'User registered successfully', user, token });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Bad Request', message: 'Email and password are required.' });
      }

      const { user, token } = await AuthService.loginUser(email, password);
      res.status(200).json({ message: 'Login successful', user, token });
    } catch (error) {
      next(error);
    }
  }
}

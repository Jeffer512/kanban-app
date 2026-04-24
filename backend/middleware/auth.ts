import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  // Extract the token from the HttpOnly cookie
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }

  try {
    // Verify the signature and expiration
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      username: string;
    };

    // Attach the data to the request object for the next function to use
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
    };

    next();
  } catch (error) {
    console.error("JWT Verification Error:", error);
    res.status(403).json({ error: "Invalid or expired session. Please log in again." });
  }
}
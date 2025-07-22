import jwt from 'jsonwebtoken';
import { APIGatewayProxyEvent } from 'aws-lambda';

export interface JWTPayload {
  userId: string;
  email: string;
}

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }
    
    const payload = jwt.verify(token, secret) as JWTPayload;
    return payload;
  } catch (error) {
    return null;
  }
};

export const extractUserFromEvent = (event: APIGatewayProxyEvent): JWTPayload | null => {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  return verifyToken(token);
};

export const generateToken = (payload: JWTPayload): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  return jwt.sign(payload, secret, { expiresIn: '7d' });
};
import { APIGatewayProxyResult } from 'aws-lambda';
import { APIResponse } from '../types';

export const createResponse = (
  statusCode: number,
  data: APIResponse
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify(data),
  };
};

export const successResponse = (data: any, message?: string): APIGatewayProxyResult => {
  return createResponse(200, {
    success: true,
    data,
    message,
  });
};

export const errorResponse = (error: string, statusCode: number = 400): APIGatewayProxyResult => {
  return createResponse(statusCode, {
    success: false,
    error,
  });
};
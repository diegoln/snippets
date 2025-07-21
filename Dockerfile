FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev dependencies for development)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

EXPOSE 8080

# Use development server
CMD ["npm", "run", "dev"]
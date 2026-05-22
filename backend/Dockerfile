# Build Stage
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma Client types
RUN npx prisma generate

# Compile TypeScript to JavaScript
RUN npm run build

# Production Stage
FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

# Copy compiled files and Prisma files
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Run migrations and start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

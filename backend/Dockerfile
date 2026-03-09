# Build stage
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copies package.json and package-lock.json first to cache dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /usr/src/app

# Only copy over package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production

# Copy compiled JavaScript from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Exposed port
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.js"]

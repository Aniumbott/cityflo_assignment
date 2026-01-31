FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies without running postinstall scripts
RUN npm ci --ignore-scripts

# Generate Prisma Client (doesn't need real DATABASE_URL)
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/

# Build TypeScript
RUN npx tsc

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies without running postinstall scripts
RUN npm ci --omit=dev --ignore-scripts

# Generate Prisma Client (doesn't need real DATABASE_URL)
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/uploads

EXPOSE 3000

# At runtime, use actual DATABASE_URL to push schema and start server
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && node dist/index.js"]

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Set placeholder DATABASE_URL for build phase
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

# Install dependencies (postinstall will run prisma generate)
RUN npm ci

COPY tsconfig.json ./
COPY src ./src/

RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Set placeholder DATABASE_URL for build phase
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

# Install production dependencies (postinstall will run prisma generate)
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/uploads

EXPOSE 3000

# At runtime, use actual DATABASE_URL to push schema and start server
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && node dist/index.js"]

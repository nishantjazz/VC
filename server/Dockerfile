# Base stage
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# --- Dev stage ---
FROM base AS dev
WORKDIR /app
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]

# --- Prod stage ---
FROM base AS prod
WORKDIR /app
COPY . .
RUN npm prune --production
EXPOSE 4000
CMD ["node", "src/index.js"]

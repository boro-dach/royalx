# syntax = docker/dockerfile:1
ARG NODE_VERSION=20-slim
FROM node:${NODE_VERSION}

WORKDIR /app

ENV NODE_ENV="production"
ENV PORT=3000

# Install dependencies needed for native modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Install node dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy full application code
COPY . .

# Build Next.js frontend into dist/
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]

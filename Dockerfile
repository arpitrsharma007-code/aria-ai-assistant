FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json ./
COPY client/package.json client/
COPY server/package.json server/

# Install dependencies
RUN cd client && npm install && cd ../server && npm install

# Copy source
COPY client/ client/
COPY server/ server/
COPY .env.example .env

# Build client and server
RUN cd client && npm run build
RUN cd server && npm run build

# Expose port
ENV PORT=3001
ENV NODE_ENV=production
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
EXPOSE 3001

# Start
CMD ["node", "server/dist/index.js"]

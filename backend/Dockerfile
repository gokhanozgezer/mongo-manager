FROM node:20-alpine

WORKDIR /app

# Install MongoDB Database Tools (mongodump, mongorestore)
RUN apk add --no-cache mongodb-tools

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source code
COPY . .

# Create data and backup directories
RUN mkdir -p /app/data /tmp/mongo-manager-backups /tmp/mongo-manager-uploads

# Expose port
EXPOSE 3000

# Set Node.js memory limit via environment variable
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Start the server
CMD ["node", "server.js"]

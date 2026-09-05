FROM node:18-alpine

ENV NODE_TLS_REJECT_UNAUTHORIZED=0

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install all dependencies including http-proxy-middleware
RUN npm install

# Copy the rest of the application
COPY . .

# Expose port 3000 (React dev server) and 8080 (optional for debug)
EXPOSE 3000

# Start the React development server
CMD ["npm", "start"]

# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /action

# Copy package files
COPY package.json ./

# Copy application files
COPY index.js ./

# Make index.js executable
RUN chmod +x index.js

# Set the entrypoint
ENTRYPOINT ["node", "/action/index.js"]

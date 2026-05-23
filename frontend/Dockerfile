FROM node:20-slim

WORKDIR /app

COPY package.json ./
# Install dependencies; use --legacy-peer-deps to tolerate any peer‑dependency mismatches
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 5173

# Ensure Vite binds to all interfaces inside the container
ENV HOST=0.0.0.0
CMD ["npm", "run", "dev"]

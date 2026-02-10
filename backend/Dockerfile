FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Build TypeScript code
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]

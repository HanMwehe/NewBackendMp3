FROM node:20-alpine

WORKDIR /app

COPY package*.json  .
COPY pnpm-lock.yaml  .

COPY  . .

CMD [ "node", "index.js" ]
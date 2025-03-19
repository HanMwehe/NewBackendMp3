FROM node:20-alpine

WORKDIR /app

COPY package*.json  .
COPY pnpm-lock.yaml  .
RUN npm i

COPY  . .

CMD [ "node", "index.js" ]
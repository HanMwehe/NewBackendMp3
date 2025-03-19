FROM node:20

WORKDIR /app

COPY package*.json  .
COPY pnpm-lock.yaml  .
RUN npm i

COPY  . .

CMD [ "node", "index.js" ]
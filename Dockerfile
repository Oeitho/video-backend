FROM node:14.15.1-alpine3.12

WORKDIR /app

COPY package*.json ./

RUN yarn install --production

COPY . .

RUN yarn tsc

EXPOSE 8080

CMD ["node", "build/index.js"]
FROM node:14.15.1-alpine3.12

WORKDIR /app

COPY . .

RUN yarn install --production

RUN yarn postinstall

EXPOSE 8080

CMD ["node", "build/index.js"]
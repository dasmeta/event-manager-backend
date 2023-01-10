FROM node:12-slim

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY ./app .

# RUN yarn install --frozen-lockfile
RUN yarn install
RUN yarn build

CMD ["yarn", "start"]

FROM node:14-slim

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY ./app .

# # RUN yarn install --frozen-lockfile
RUN yarn install
RUN yarn build

COPY ./ui ./ui
RUN cd ./ui && yarn install
RUN cd ./ui && yarn build

RUN cp -a ./ui/dist/. ./public/
RUN rm -rf ./ui

CMD ["yarn", "start"]

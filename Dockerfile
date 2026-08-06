FROM node:14-slim

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY ./app .

# # RUN yarn install --frozen-lockfile
# --production: skip devDependencies (e.g. jest)
# --ignore-engines: package.json may still resolve modern transitive engines (Node 14 image)
RUN yarn install --production --ignore-engines
RUN yarn build

COPY ./ui ./ui
RUN cd ./ui && yarn install --ignore-engines
RUN cd ./ui && yarn build

RUN cp -a ./ui/dist/. ./public/
RUN rm -rf ./ui

CMD ["yarn", "start"]

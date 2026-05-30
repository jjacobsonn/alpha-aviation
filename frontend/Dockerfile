# React SPA for Railway (Root Directory = frontend/)
FROM node:20-slim-bookworm

WORKDIR /app

RUN npm install -g yarn serve

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

# CRA bakes REACT_APP_* at build time; Railway injects service env vars during build.
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN yarn build

CMD sh -c "serve -s build -l ${PORT:-3000}"

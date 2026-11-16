FROM node:22-alpine

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

# package-lock.json is written by npm 11 locally. npm 10 (bundled with node:22)
# rejects it ("Missing: @emnapi/core ... from lock file"), so match npm 11.
RUN npm install -g npm@11.6.2 && npm ci --omit=dev && npm cache clean --force

COPY . .

RUN npm run build

CMD ["npm", "run", "docker-start"]

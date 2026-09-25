FROM node:24-alpine AS build
WORKDIR /app
RUN npm install --global npm@11.6.2
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json tsconfig.build.json nest-cli.json ./
RUN npm run prisma:generate
COPY src ./src
RUN npm run build

FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN npm install --global npm@11.6.2
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && mkdir -p uploads/products
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]

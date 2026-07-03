FROM node:22-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies with increased timeout to prevent ECONNRESET
RUN npm install --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

# Bundle app source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 3000

CMD [ "npm", "run", "dev" ]

FROM registry.access.redhat.com/ubi9/nodejs-${{ values.nodeVersion }}:latest

WORKDIR /opt/app-root/src

COPY package*.json ./
RUN npm ci --production

COPY src/ src/

EXPOSE ${{ values.port }}
USER 1001

CMD ["node", "src/index.js"]

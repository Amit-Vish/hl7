FROM node:4
ARG id=api-web
COPY . /opt/$id
WORKDIR /opt/$id
ENTRYPOINT ["node", "/opt/api-web"]
EXPOSE 3000

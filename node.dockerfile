FROM node:9

RUN apt-get update & apt-get install git

RUN npm install -g bower -y

EXPOSE 1337
EXPOSE 35732
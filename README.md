# Event Manager Backend (event-manager-backend)
Welcome to Event Manager Backend (event-manager-backend)

## Table of contents
 * [Introduction](#introduction)
 * [Requirements](#requirements)
 * [Installation](#installation)
 * [Configuration](#configuration)
 * [Troubleshooting & FAQ](#troubleshooting-faq)

## Introduction
The service is based on Strapi JS framework.

## Requirements
- CPU cores >= 1
- RAM >= 256MB
- [Git 2.*](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Docker 20.*](https://docs.docker.com/engine/install/)
  
## Installation
- Set up git to have ssh access to the repository
- Clone the source into local machine
```shell
$ git clone git@github.com:dasmeta/event-manager-backend.git
```
- Go to the project source `$ cd event-manager-backend`
- Run docker-compose `$ docker-compose up -d` to start development environment.
- Run docker build to create a production ready image and install project dependencies.
```shell
$ docker build -t event-manager-backend:latest .
```

## Configuration
- Create an environment file `.env` and defined variables
```text
# Web Server
HOST=0.0.0.0
PORT=1337
SERVE_ADMIN_PANEL=

# Database
DATABASE_HOST=
DATABASE_PORT=
DATABASE_NAME=event-manager-backend
DATABASE_USERNAME=
DATABASE_PASSWORD=

# Database Security
AUTHENTICATION_DATABASE=
DATABASE_SSL=

# JWT settings to validate token
JWT_SECRET=
JWT_ALGORITHM="HS256"

# Centralized Authentication
AUTHENTICATION_SERVICE_API_HOST=
AUTHENTICATION_IS_LIVE_MODE=

```
- Create and start a container ready to handle connections
```shell
$ docker run --name=em-backend --env-file=.env -p "0.0.0.0:82:1337" -v"$(pwd):/app" event-manager-backend:latest
```
- The service will be accessible on http://0.0.0.0:82

## Troubleshooting & FAQ
- View service logs
```shell
$ docker logs -f --since 2m ums
```
- Run tests
```shell
$ docker exec ums bash -c "npm run test"
```

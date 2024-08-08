DB ?= mongo
MQ ?= pubsub
BUILD ?= image

start:
	docker-compose -f docker-compose.yml -f docker-compose.$(BUILD).yml -f docker-compose.$(DB).yml -f docker-compose.$(MQ).yml up
	
stop:
	docker-compose -f docker-compose.yml -f docker-compose.$(BUILD).yml -f docker-compose.$(DB).yml -f docker-compose.$(MQ).yml up

build:
	docker-compose -f docker-compose.yml -f docker-compose.build.yml build --no-cache

logs:
	docker-compose logs -f --tail=500 strapi 

start-frontend:
	cd ui && yarn dev
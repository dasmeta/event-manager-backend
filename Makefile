start-with-mongo:
	docker-compose -f docker-compose.yml -f docker-compose.image.yml -f docker-compose.mongo.yml up
	
start-with-postgres:
	docker-compose -f docker-compose.yml -f docker-compose.image.yml -f docker-compose.postgres.yml up
	cd ui && yarn dev

stop-with-mongo:
	docker-compose -f docker-compose.yml -f docker-compose.image.yml -f docker-compose.mongo.yml stop

stop-with-postgres:
	docker-compose -f docker-compose.yml -f docker-compose.image.yml -f docker-compose.postgres.yml stop

build-strapi:
	docker-compose -f docker-compose.yml -f docker-compose.build.yml build

start-build-with-mongo:
	docker-compose -f docker-compose.yml -f docker-compose.build.yml -f docker-compose.mongo.yml up -d

start-build-with-mongo:
	docker-compose -f docker-compose.yml -f docker-compose.build.yml -f docker-compose.mongo.yml stop

stop-build-with-postgres:
	docker-compose -f docker-compose.yml -f docker-compose.build.yml -f docker-compose.postgres.yml up -d

strapi-logs:
	docker-compose logs -f --tail=500 strapi 

start-frontend:
	cd ui && yarn dev
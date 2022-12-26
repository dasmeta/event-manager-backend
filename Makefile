up-with-mongo:
	docker-compose -f docker-compose.yml -f docker-compose.mongo.yml up

up-with-postgres:
	docker-compose -f docker-compose.yml -f docker-compose.postgres.yml up
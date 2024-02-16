#!/bin/bash

# Run a basic postgreSQL container on localhost:5555 with basic username and password
CONTAINER_NAME="backstage_db"

# Check if the container is already running
if [ $(docker ps -q -f name=^/${CONTAINER_NAME}$) ]; then
    echo "Container $CONTAINER_NAME is already running."
else
    # Run the container if it's not already running
    docker run --name $CONTAINER_NAME \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_USER=postgres \
        -p 5555:5432 \
        -v backstage_data:/var/lib/postgresql/data \
        -d postgres
    echo "Container $CONTAINER_NAME started."
fi

echo "Running backend on http://localhost:7007"

#!/bin/bash

# Run a basic postgreSQL container on localhost:5432 with basic username and password
CONTAINER_NAME="backstage_db"

# Check if the container is already running
if [ $(docker ps -q -f name=^/${CONTAINER_NAME}$) ]; then
    echo "Container $CONTAINER_NAME is already running."
else
    # Run the container if it's not already running
    docker run --name $CONTAINER_NAME \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_USER=postgres \
        -p 5432:5432 \
        -d postgres
    echo "Container $CONTAINER_NAME started."
fi

echo "Running postgres db on localhost:5432"

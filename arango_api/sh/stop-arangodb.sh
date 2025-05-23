#!/usr/bin/env bash
container_id=$(docker ps -a | grep "arangodb-$ARANGO_DB_PORT" | cut -d " " -f 1)
if [ -n "$container_id" ]; then
    echo "Stopping and removing container arangodb-$ARANGO_DB_PORT"
    docker container stop "$container_id" > /dev/null
    docker container rm "$container_id" > /dev/null
else
    echo "Container arangodb-$ARANGO_DB_PORT already stopped and removed"
fi

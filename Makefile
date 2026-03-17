.DEFAULT_GOAL := help

# prende i parametri e li converte
RUN_ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
$(eval $(RUN_ARGS):;@:)

export UID := $(shell id -u)
export GID := $(shell id -g)

# legge il file .env nella stessa cartella
ifneq (,$(wildcard ./.env))
    include .env
    export
endif

ifneq (,$(wildcard ./dev.env))
    include dev.env
    export
endif

create-network:
	docker network inspect shopfloor_local_network >/dev/null 2>&1 || docker network create --driver bridge shopfloor_local_network

##help: @ Mostra tutti i comandi di questo makefile
help:
	@fgrep -h "##" $(MAKEFILE_LIST)| sort | fgrep -v fgrep | tr -d '##'  | awk 'BEGIN {FS = ":.*?@ "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

##build: @ Esegue la build delle immagini
build:
	docker compose build

##logs: @ Mostra i logs di tutti i containers
logs:
	docker compose logs --follow

##logs-fe: @ Mostra i logs di tutti i containers
logs-fe:
	docker compose logs --follow frontend-dev

##logs-be: @ Mostra i logs di tutti i containers
logs-be:
	docker compose logs --follow backend-dev

##code: @ Apre vscode
code: 
	code shopfloor.code-workspace

##start: @ Avvia l'applicazione
start: create-network
	docker compose --profile dev up -d --build

start-prod: create-network
	docker compose --profile prod up -d --build

##stop: @ Ferma l'applicazione
stop:
	docker compose --profile dev down

##restart: @ Riavvia l'applicazione
restart: stop start
	docker compose logs -f backend-dev
TAG ?= dev
VERSION ?= master
NAMESPACE ?= gleissonassis
IMAGE ?= bitcoin-cdal
CONTAINER ?= bitcoin-cdal

.PHONY: build push shell run start stop rm release 

build: Dockerfile
	docker build --no-cache --build-arg VERSION=$(VERSION) -t $(NAMESPACE)/$(IMAGE):$(TAG) -f Dockerfile .

push:
	docker push $(NAMESPACE)/$(IMAGE):$(TAG)

shell:
	docker run --rm --name $(CONTAINER) -i -t $(PORTS) $(VOLUMES) $(ENV) $(NAMESPACE)/$(IMAGE):$(TAG) /bin/sh

run:
	docker run --rm --name $(CONTAINER) $(PORTS) $(VOLUMES) $(ENV) $(NAMESPACE)/$(IMAGE):$(TAG)

start:
	docker run -d --name $(CONTAINER) $(PORTS) $(VOLUMES) $(ENV) $(NAMESPACE)/$(IMAGE):$(TAG)

stop:
	docker stop $(CONTAINER)

rm:
	docker rm $(CONTAINER)

default: build

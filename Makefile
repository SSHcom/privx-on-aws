.PHONY: all

all: | node_modules
	@npm run build
	@npm run test
	@npm run lint

node_modules:
	@npm install

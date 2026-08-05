.PHONY: dev dev-api dev-admin dev-storefront kill clean

dev: kill
	@npx concurrently --names api,admin,store \
		"wrangler dev --port 5003 --host 0.0.0.0" \
		"vite --port 5002 --host 0.0.0.0" \
		"cd storefront && npm run dev"

dev-api: kill
	@npx wrangler dev --port 5003 --host 0.0.0.0

dev-admin: kill
	@npx vite --port 5002 --host 0.0.0.0

dev-storefront: kill
	@cd storefront && npm run dev

kill:
	@# Step 1: kill wrangler node process (parent of workerd)
	@ps -eo pid,cmd | grep 'wrangler-dist/cli.js dev' | grep -v grep | awk '{print $$1}' | xargs kill -9 2>/dev/null || true
	@sleep 1
	@# Step 2: kill anything still on ports
	@lsof -ti:5001 -ti:5002 -ti:5003 2>/dev/null | xargs kill -9 2>/dev/null || true
	@sleep 2
	@echo "Ports cleared"

clean: kill
	@rm -rf .wrangler/state
	@echo "Local D1 reset"

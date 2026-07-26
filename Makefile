.PHONY: dev reset seed

dev:
	@echo "🚀 Starting dev servers..."
	npm run dev

reset:
	@echo "🗑️  Resetting local D1 database..."
	@rm -f .wrangler/state/v3/d1/miniflare-D1DatabaseObject/konsi.sqlite3
	@echo "✅ Database reset"

seed:
	@echo "🌱 Seeding database..."
	npx tsx scripts/seed-owner.ts
	npx tsx scripts/seed-products.ts
	@echo "✅ Seeding complete"

fresh: reset seed
	@echo "🎉 Fresh database ready"

-- Removes the API Keys and Webhooks features entirely (app code deleted
-- alongside this migration). Deliveries drop first since it FKs into
-- endpoints; api_keys has no dependents.
DROP TABLE IF EXISTS "outbound_webhook_deliveries";
--> statement-breakpoint
DROP TABLE IF EXISTS "outbound_webhook_endpoints";
--> statement-breakpoint
DROP TABLE IF EXISTS "api_keys";

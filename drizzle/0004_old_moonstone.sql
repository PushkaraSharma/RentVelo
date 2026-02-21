ALTER TABLE `tenants` ADD `photo_uri` text;--> statement-breakpoint
ALTER TABLE `tenants` ADD `move_out_date` integer;--> statement-breakpoint
ALTER TABLE `tenants` ADD `lease_period_value` integer;--> statement-breakpoint
ALTER TABLE `tenants` ADD `lease_period_unit` text;--> statement-breakpoint
ALTER TABLE `tenants` ADD `balance_amount` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `units` ADD `initial_electricity_reading` real;--> statement-breakpoint
ALTER TABLE `units` ADD `initial_water_reading` real;
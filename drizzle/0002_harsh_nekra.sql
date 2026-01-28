ALTER TABLE `tenants` ADD `profession` text;--> statement-breakpoint
ALTER TABLE `tenants` ADD `guest_count` text;--> statement-breakpoint
ALTER TABLE `tenants` ADD `work_address` text;--> statement-breakpoint
ALTER TABLE `tenants` ADD `emergency_contact_name` text;--> statement-breakpoint
ALTER TABLE `tenants` ADD `emergency_contact_phone` text;--> statement-breakpoint
ALTER TABLE `tenants` DROP COLUMN `emergency_contact`;--> statement-breakpoint
ALTER TABLE `tenants` DROP COLUMN `emergency_phone`;
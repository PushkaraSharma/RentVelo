CREATE TABLE IF NOT EXISTS `property_expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`amount` real NOT NULL,
	`expense_type` text NOT NULL,
	`frequency` text DEFAULT 'one_time',
	`image_uri` text,
	`remarks` text,
	`distribute_type` text DEFAULT 'owner',
	`distributed_unit_ids` text,
	`month` integer NOT NULL,
	`year` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `bill_expenses` ADD `property_expense_id` integer REFERENCES property_expenses(id);--> statement-breakpoint
ALTER TABLE `properties` ADD `auto_increment_rent_enabled` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `properties` ADD `auto_increment_percent` real;--> statement-breakpoint
ALTER TABLE `properties` ADD `auto_increment_frequency` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `last_increment_date` integer;--> statement-breakpoint
ALTER TABLE `units` ADD `room_group` text;--> statement-breakpoint
ALTER TABLE `units` ADD `bed_number` text;
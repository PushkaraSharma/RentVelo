CREATE TABLE `bill_expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bill_id` integer NOT NULL,
	`label` text NOT NULL,
	`amount` real NOT NULL,
	`is_recurring` integer DEFAULT false,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`bill_id`) REFERENCES `rent_bills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rent_bills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`unit_id` integer NOT NULL,
	`tenant_id` integer NOT NULL,
	`month` integer NOT NULL,
	`year` integer NOT NULL,
	`rent_amount` real DEFAULT 0 NOT NULL,
	`electricity_amount` real DEFAULT 0,
	`prev_reading` real,
	`curr_reading` real,
	`previous_balance` real DEFAULT 0,
	`total_expenses` real DEFAULT 0,
	`total_amount` real DEFAULT 0,
	`paid_amount` real DEFAULT 0,
	`balance` real DEFAULT 0,
	`status` text DEFAULT 'pending',
	`bill_number` text,
	`notes` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `payments` ADD `bill_id` integer;--> statement-breakpoint
ALTER TABLE `payments` ADD `photo_uri` text;
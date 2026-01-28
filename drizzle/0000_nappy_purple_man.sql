CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`document_type` text,
	`document_name` text NOT NULL,
	`file_uri` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `meter_readings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`unit_id` integer NOT NULL,
	`reading_type` text,
	`previous_reading` real,
	`current_reading` real NOT NULL,
	`reading_date` integer DEFAULT (strftime('%s', 'now')),
	`amount` real,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`unit_id` integer NOT NULL,
	`amount` real NOT NULL,
	`payment_date` integer DEFAULT (strftime('%s', 'now')),
	`payment_type` text,
	`payment_method` text,
	`status` text DEFAULT 'pending',
	`notes` text,
	`receipt_url` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`type` text NOT NULL,
	`image_uri` text,
	`amenities` text,
	`is_multi_unit` integer DEFAULT false,
	`owner_name` text,
	`owner_phone` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`unit_id` integer NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`id_proof_type` text,
	`id_proof_number` text,
	`emergency_contact` text,
	`emergency_phone` text,
	`move_in_date` integer,
	`lease_type` text,
	`lease_start_date` integer,
	`lease_end_date` integer,
	`security_deposit` real DEFAULT 0,
	`advance_rent` real DEFAULT 0,
	`status` text DEFAULT 'active',
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `units` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`name` text NOT NULL,
	`floor` text,
	`type` text,
	`rent_amount` real NOT NULL,
	`rent_cycle` text,
	`is_metered` integer DEFAULT false,
	`electricity_rate` real,
	`water_rate` real,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);

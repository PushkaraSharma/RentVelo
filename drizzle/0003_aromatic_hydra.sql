PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_meter_readings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`unit_id` integer,
	`reading_type` text,
	`previous_reading` real,
	`current_reading` real NOT NULL,
	`reading_date` integer DEFAULT (strftime('%s', 'now')),
	`amount` real,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_meter_readings`("id", "property_id", "unit_id", "reading_type", "previous_reading", "current_reading", "reading_date", "amount", "created_at") SELECT "id", 1, "unit_id", "reading_type", "previous_reading", "current_reading", "reading_date", "amount", "created_at" FROM `meter_readings`;--> statement-breakpoint
DROP TABLE `meter_readings`;--> statement-breakpoint
ALTER TABLE `__new_meter_readings` RENAME TO `meter_readings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`tenant_id` integer NOT NULL,
	`unit_id` integer,
	`amount` real NOT NULL,
	`payment_date` integer DEFAULT (strftime('%s', 'now')),
	`payment_type` text,
	`payment_method` text,
	`status` text DEFAULT 'pending',
	`notes` text,
	`receipt_url` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_payments`("id", "property_id", "tenant_id", "unit_id", "amount", "payment_date", "payment_type", "payment_method", "status", "notes", "receipt_url", "created_at", "updated_at") SELECT "id", 1, "tenant_id", "unit_id", "amount", "payment_date", "payment_type", "payment_method", "status", "notes", "receipt_url", "created_at", "updated_at" FROM `payments`;--> statement-breakpoint
DROP TABLE `payments`;--> statement-breakpoint
ALTER TABLE `__new_payments` RENAME TO `payments`;--> statement-breakpoint
CREATE TABLE `__new_tenants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`unit_id` integer,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`profession` text,
	`guest_count` text,
	`work_address` text,
	`id_proof_type` text,
	`id_proof_number` text,
	`emergency_contact_name` text,
	`emergency_contact_phone` text,
	`move_in_date` integer,
	`lease_type` text,
	`lease_start_date` integer,
	`lease_end_date` integer,
	`security_deposit` real DEFAULT 0,
	`advance_rent` real DEFAULT 0,
	`status` text DEFAULT 'active',
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_tenants`("id", "property_id", "unit_id", "name", "phone", "email", "profession", "guest_count", "work_address", "id_proof_type", "id_proof_number", "emergency_contact_name", "emergency_contact_phone", "move_in_date", "lease_type", "lease_start_date", "lease_end_date", "security_deposit", "advance_rent", "status", "created_at", "updated_at") SELECT "id", 1, "unit_id", "name", "phone", "email", "profession", "guest_count", "work_address", "id_proof_type", "id_proof_number", "emergency_contact_name", "emergency_contact_phone", "move_in_date", "lease_type", "lease_start_date", "lease_end_date", "security_deposit", "advance_rent", "status", "created_at", "updated_at" FROM `tenants`;--> statement-breakpoint
DROP TABLE `tenants`;--> statement-breakpoint
ALTER TABLE `__new_tenants` RENAME TO `tenants`;
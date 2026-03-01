-- Force create property_expenses if 0013 failed halfway
CREATE TABLE IF NOT EXISTS `property_expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL REFERENCES `properties`(`id`) ON DELETE CASCADE,
	`amount` real NOT NULL,
	`expense_type` text NOT NULL,
	`frequency` text DEFAULT 'one_time',
	`image_uri` text,
	`remarks` text,
	`distribute_type` text DEFAULT 'owner',
	`distributed_unit_ids` text,
	`month` integer NOT NULL,
	`year` integer NOT NULL,
	`created_at` integer DEFAULT 0
);

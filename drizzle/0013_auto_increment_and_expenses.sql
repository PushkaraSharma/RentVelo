-- Auto Increment Rent fields on properties
ALTER TABLE `properties` ADD `auto_increment_rent_enabled` integer DEFAULT 0;
ALTER TABLE `properties` ADD `auto_increment_percent` real;
ALTER TABLE `properties` ADD `auto_increment_frequency` text;
ALTER TABLE `properties` ADD `last_increment_date` integer;

-- Property Expenses table
CREATE TABLE `property_expenses` (
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
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);

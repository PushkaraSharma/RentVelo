ALTER TABLE `rent_bills` ADD `water_amount` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `rent_bills` ADD `water_prev_reading` real;--> statement-breakpoint
ALTER TABLE `rent_bills` ADD `water_curr_reading` real;--> statement-breakpoint
ALTER TABLE `units` ADD `water_default_units` real;
ALTER TABLE `properties` ADD `penalty_grace_period_days` integer;--> statement-breakpoint
ALTER TABLE `properties` ADD `penalty_amount_per_day` real;--> statement-breakpoint
ALTER TABLE `properties` ADD `waive_penalty_on_partial_payment` integer DEFAULT false;
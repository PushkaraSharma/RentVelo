CREATE TABLE IF NOT EXISTS `payment_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`logo_uri` text,
	`bank_name` text,
	`bank_acc_number` text,
	`bank_ifsc` text,
	`bank_acc_holder` text,
	`wallet_type` text,
	`wallet_phone` text,
	`wallet_name` text,
	`upi_id` text,
	`payment_qr_uri` text,
	`signature_uri` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);

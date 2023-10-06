CREATE TABLE `summaries` (
	`id` integer PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`telegram_user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIME NOT NULL,
	`valid_until` text NOT NULL,
	`text` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `summary_chat_id_idx` ON `summaries` (`chat_id`);
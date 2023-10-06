CREATE TABLE `summaries` (
	`id` integer PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`message_id` text NOT NULL,
	`telegram_user_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `chat_id_idx` ON `summaries` (`chat_id`);
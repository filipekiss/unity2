CREATE TABLE `summary_messages` (
	`id` integer PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`message_text` text NOT NULL,
	`is_summarized` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `chat_id_idx` ON `summary_messages` (`chat_id`);
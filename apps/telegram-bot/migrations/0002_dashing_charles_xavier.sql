DROP INDEX IF EXISTS `chat_id_idx`;--> statement-breakpoint
ALTER TABLE summaries ADD `created_at` text DEFAULT CURRENT_TIME NOT NULL;--> statement-breakpoint
ALTER TABLE summaries ADD `valid_until` text NOT NULL;--> statement-breakpoint
ALTER TABLE summaries ADD `text` text NOT NULL;--> statement-breakpoint
CREATE INDEX `summary_chat_id_idx` ON `summaries` (`chat_id`);--> statement-breakpoint
ALTER TABLE `summaries` DROP COLUMN `message_id`;
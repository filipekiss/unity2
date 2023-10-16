CREATE TABLE `reminders` (
	`id` integer PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`from` text DEFAULT '{}' NOT NULL,
	`message_obj` text DEFAULT '{}' NOT NULL,
	`remind_at` text NOT NULL,
	`from_id` text NOT NULL,
	`is_reminded` integer DEFAULT false NOT NULL
);

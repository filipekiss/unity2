ALTER TABLE summary_messages ADD `from` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE summary_messages ADD `message_obj` text DEFAULT '{}' NOT NULL;
CREATE TABLE `questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question_image_uri` text,
	`subject` text NOT NULL,
	`topics` text NOT NULL,
	`subtopics` text NOT NULL,
	`solution_image_uri` text,
	`question_type` text NOT NULL,
	`mcq_answer` text,
	`msq_answer` text,
	`nat_answer` text,
	`personal_note` text,
	`next_revision` integer DEFAULT 1 NOT NULL,
	`correct` integer DEFAULT 0 NOT NULL,
	`incorrect` integer DEFAULT 0 NOT NULL,
	`next_revision_date` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

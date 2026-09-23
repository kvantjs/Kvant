CREATE TABLE `chats` (
	`id` varchar(32) NOT NULL,
	`userId` int,
	`title` varchar(180) NOT NULL,
	`messages` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` varchar(32) NOT NULL,
	`userId` int,
	`name` varchar(120) NOT NULL,
	`repository` varchar(255),
	`framework` varchar(80) NOT NULL DEFAULT 'React + Vite',
	`files` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`)
);

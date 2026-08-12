CREATE TABLE `lenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`rewardValue` decimal(10,2) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sellerName` varchar(255) NOT NULL,
	`storeName` varchar(255) NOT NULL DEFAULT 'Óticas Único',
	`osNumber` varchar(64) NOT NULL,
	`lensId` int NOT NULL,
	`lensName` varchar(255) NOT NULL,
	`saleAmount` decimal(10,2) NOT NULL,
	`rewardAmount` decimal(10,2) NOT NULL,
	`saleDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_openId_unique`;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('master','seller') NOT NULL DEFAULT 'seller';--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `securityQuestion` text NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `securityAnswerHash` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_username_unique` UNIQUE(`username`);--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `openId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `loginMethod`;
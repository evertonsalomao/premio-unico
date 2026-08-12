ALTER TABLE `users` MODIFY COLUMN `username` varchar(64);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `name` text;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','master','seller') NOT NULL DEFAULT 'seller';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `securityQuestion` text;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `securityAnswerHash` varchar(255);--> statement-breakpoint
ALTER TABLE `sales` ADD `quantity` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `loginMethod` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_openId_unique` UNIQUE(`openId`);
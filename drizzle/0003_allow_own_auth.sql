-- Correção de compatibilidade: o login próprio não usa openId.
-- A coluna legada permanece para compatibilidade, mas precisa aceitar NULL.
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64) NULL;

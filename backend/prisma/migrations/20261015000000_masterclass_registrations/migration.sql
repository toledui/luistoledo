CREATE TABLE `MasterclassRegistration` (
  `id` VARCHAR(191) NOT NULL,
  `eventKey` VARCHAR(80) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `whatsapp` VARCHAR(20) NOT NULL,
  `consentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `notificationQueueId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `MasterclassRegistration_eventKey_email_key` (`eventKey`, `email`),
  INDEX `MasterclassRegistration_eventKey_createdAt_idx` (`eventKey`, `createdAt`),
  INDEX `MasterclassRegistration_notificationQueueId_idx` (`notificationQueueId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MasterclassRegistration` ADD CONSTRAINT `MasterclassRegistration_notificationQueueId_fkey` FOREIGN KEY (`notificationQueueId`) REFERENCES `EmailQueue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Course` ADD COLUMN `isListed` BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE `CoursePaymentPlan` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `courseId` VARCHAR(191) NOT NULL,
  `option` VARCHAR(20) NOT NULL,
  `total` DECIMAL(10,2) NOT NULL,
  `initialAmount` DECIMAL(10,2) NOT NULL,
  `installmentAmount` DECIMAL(10,2) NOT NULL,
  `activatedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `remindersEnabled` BOOLEAN NOT NULL DEFAULT true,
  `lastReminderAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `CoursePaymentPlan_userId_courseId_key` (`userId`, `courseId`),
  INDEX `CoursePaymentPlan_activatedAt_completedAt_lastReminderAt_idx` (`activatedAt`, `completedAt`, `lastReminderAt`),
  CONSTRAINT `CoursePaymentPlan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `CoursePaymentPlan_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `Order` ADD COLUMN `paymentPlanId` VARCHAR(191) NULL,
  ADD COLUMN `installmentNumber` INTEGER NULL, ADD COLUMN `dueAt` DATETIME(3) NULL,
  ADD UNIQUE INDEX `Order_paymentPlanId_installmentNumber_key` (`paymentPlanId`, `installmentNumber`),
  ADD INDEX `Order_dueAt_status_idx` (`dueAt`, `status`),
  ADD CONSTRAINT `Order_paymentPlanId_fkey` FOREIGN KEY (`paymentPlanId`) REFERENCES `CoursePaymentPlan` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

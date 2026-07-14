-- CreateTable
CREATE TABLE `PaymentProviderSetting` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `stripeEnabled` BOOLEAN NOT NULL DEFAULT false,
    `stripeMode` ENUM('TEST', 'LIVE') NOT NULL DEFAULT 'TEST',
    `stripePublishableKey` VARCHAR(255) NULL,
    `stripeSecretKeyEncrypted` TEXT NULL,
    `stripeWebhookSecretEncrypted` TEXT NULL,
    `bankTransferEnabled` BOOLEAN NOT NULL DEFAULT true,
    `bankName` VARCHAR(191) NULL,
    `bankBeneficiary` VARCHAR(191) NULL,
    `bankAccount` VARCHAR(80) NULL,
    `bankClabe` VARCHAR(18) NULL,
    `bankInstructions` TEXT NULL,
    `paymentDeadlineHours` INTEGER NOT NULL DEFAULT 48,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'MXN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentEvent` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(40) NOT NULL,
    `externalEventId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(120) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `processed` BOOLEAN NOT NULL DEFAULT false,
    `errorMessage` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,

    UNIQUE INDEX `PaymentEvent_externalEventId_key`(`externalEventId`),
    INDEX `PaymentEvent_provider_createdAt_idx`(`provider`, `createdAt`),
    INDEX `PaymentEvent_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `Order` ADD COLUMN `analyticsSessionId` VARCHAR(64) NULL;

-- CreateTable
CREATE TABLE `AnalyticsSetting` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `gtmId` VARCHAR(40) NULL,
    `gaMeasurementId` VARCHAR(40) NULL,
    `gaPropertyId` VARCHAR(40) NULL,
    `metaPixelId` VARCHAR(40) NULL,
    `metaApiVersion` VARCHAR(20) NOT NULL DEFAULT 'v25.0',
    `searchConsoleSite` VARCHAR(255) NULL,
    `gaSecretEncrypted` TEXT NULL,
    `metaTokenEncrypted` TEXT NULL,
    `googleCredentialsEncrypted` TEXT NULL,
    `retainIpDays` INTEGER NOT NULL DEFAULT 7,
    `retainEventsDays` INTEGER NOT NULL DEFAULT 90,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnalyticsSession` (
    `id` VARCHAR(64) NOT NULL,
    `visitorId` VARCHAR(64) NOT NULL,
    `userId` VARCHAR(64) NULL,
    `analyticsConsent` BOOLEAN NOT NULL,
    `advertisingConsent` BOOLEAN NOT NULL,
    `consentVersion` VARCHAR(20) NOT NULL DEFAULT '2026-10-21',
    `consentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `entryPath` VARCHAR(500) NOT NULL,
    `referrer` VARCHAR(255) NULL,
    `source` VARCHAR(150) NOT NULL,
    `medium` VARCHAR(100) NOT NULL,
    `campaign` VARCHAR(150) NULL,
    `term` VARCHAR(150) NULL,
    `firstSource` VARCHAR(150) NOT NULL,
    `lastNonDirectSource` VARCHAR(150) NOT NULL,
    `ipEncrypted` TEXT NULL,
    `userAgent` VARCHAR(500) NULL,
    `gaClientId` VARCHAR(100) NULL,
    `gaSessionId` VARCHAR(40) NULL,
    `fbp` VARCHAR(150) NULL,
    `fbc` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AnalyticsSession_createdAt_source_idx`(`createdAt`, `source`),
    INDEX `AnalyticsSession_visitorId_createdAt_idx`(`visitorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnalyticsEvent` (
    `id` VARCHAR(100) NOT NULL,
    `sessionId` VARCHAR(64) NULL,
    `name` VARCHAR(40) NOT NULL,
    `path` VARCHAR(500) NOT NULL,
    `source` VARCHAR(150) NOT NULL,
    `origin` VARCHAR(20) NOT NULL,
    `value` DECIMAL(12, 2) NULL,
    `currency` VARCHAR(3) NULL,
    `data` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AnalyticsEvent_createdAt_name_idx`(`createdAt`, `name`),
    INDEX `AnalyticsEvent_source_createdAt_idx`(`source`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnalyticsDelivery` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(100) NOT NULL,
    `provider` VARCHAR(10) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastError` VARCHAR(200) NULL,
    `sentAt` DATETIME(3) NULL,

    INDEX `AnalyticsDelivery_status_nextAttemptAt_idx`(`status`, `nextAttemptAt`),
    UNIQUE INDEX `AnalyticsDelivery_eventId_provider_key`(`eventId`, `provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AnalyticsEvent` ADD CONSTRAINT `AnalyticsEvent_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `AnalyticsSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnalyticsDelivery` ADD CONSTRAINT `AnalyticsDelivery_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `AnalyticsEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add permissions for existing installations without rerunning the user/password seed.
INSERT INTO `Permission` (`id`, `code`, `description`)
SELECT 'perm_analytics_read', 'analytics.read', 'Consultar reportes de analítica'
WHERE NOT EXISTS (SELECT 1 FROM `Permission` WHERE `code` = 'analytics.read');
INSERT INTO `Permission` (`id`, `code`, `description`)
SELECT 'perm_analytics_ip_read', 'analytics.ip.read', 'Consultar IP de visitantes'
WHERE NOT EXISTS (SELECT 1 FROM `Permission` WHERE `code` = 'analytics.ip.read');
INSERT IGNORE INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.id, p.id FROM `Role` r CROSS JOIN `Permission` p
WHERE r.name = 'SUPER_ADMIN' AND p.code IN ('analytics.read', 'analytics.ip.read');

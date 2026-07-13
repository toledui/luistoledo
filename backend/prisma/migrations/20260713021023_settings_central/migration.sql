-- AlterTable
ALTER TABLE `generalsetting` ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `city` VARCHAR(191) NULL,
    ADD COLUMN `country` VARCHAR(191) NOT NULL DEFAULT 'México',
    ADD COLUMN `generalEmail` VARCHAR(191) NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL,
    ADD COLUMN `postalCode` VARCHAR(191) NULL,
    ADD COLUMN `state` VARCHAR(191) NULL,
    ADD COLUMN `whatsapp` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `BrandingSetting` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `primaryLogoUrl` VARCHAR(191) NULL,
    `darkLogoUrl` VARCHAR(191) NULL,
    `emailLogoUrl` VARCHAR(191) NULL,
    `iconUrl` VARCHAR(191) NULL,
    `faviconUrl` VARCHAR(191) NULL,
    `openGraphImageUrl` VARCHAR(191) NULL,
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#52e1ff',
    `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#a983ff',
    `accentColor` VARCHAR(191) NOT NULL DEFAULT '#b8f34a',
    `darkBackgroundColor` VARCHAR(191) NOT NULL DEFAULT '#07111f',
    `lightSurfaceColor` VARCHAR(191) NOT NULL DEFAULT '#f7faff',
    `headingFont` VARCHAR(191) NOT NULL DEFAULT 'Space Grotesk',
    `bodyFont` VARCHAR(191) NOT NULL DEFAULT 'Inter',
    `footerText` VARCHAR(191) NULL,
    `instructorImageUrl` VARCHAR(191) NULL,
    `signatureImageUrl` VARCHAR(191) NULL,
    `borderRadius` INTEGER NOT NULL DEFAULT 18,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SecuritySetting` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `loginMaxAttempts` INTEGER NOT NULL DEFAULT 5,
    `lockoutMinutes` INTEGER NOT NULL DEFAULT 15,
    `requireEmailVerification` BOOLEAN NOT NULL DEFAULT true,
    `sessionTimeoutMinutes` INTEGER NOT NULL DEFAULT 10080,
    `passwordMinLength` INTEGER NOT NULL DEFAULT 10,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SettingSecret` (
    `id` VARCHAR(191) NOT NULL,
    `domain` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `encryptedValue` TEXT NOT NULL,
    `configured` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SettingSecret_domain_key_key`(`domain`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SettingAudit` (
    `id` VARCHAR(191) NOT NULL,
    `section` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `actorEmail` VARCHAR(191) NULL,
    `changes` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SettingAudit_section_createdAt_idx`(`section`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

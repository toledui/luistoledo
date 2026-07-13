-- CreateTable
CREATE TABLE `EmailProviderSetting` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `provider` ENUM('LOG', 'DISABLED', 'SMTP', 'GMAIL', 'MICROSOFT', 'AMAZON_SES', 'MAILGUN', 'SENDGRID', 'RESEND') NOT NULL DEFAULT 'LOG',
    `host` VARCHAR(191) NULL,
    `port` INTEGER NOT NULL DEFAULT 587,
    `encryption` VARCHAR(191) NOT NULL DEFAULT 'STARTTLS',
    `tlsEnabled` BOOLEAN NOT NULL DEFAULT true,
    `sslEnabled` BOOLEAN NOT NULL DEFAULT false,
    `usernameEncrypted` TEXT NULL,
    `passwordEncrypted` TEXT NULL,
    `fromName` VARCHAR(191) NOT NULL DEFAULT 'Luis Toledo Academy',
    `fromEmail` VARCHAR(191) NOT NULL DEFAULT 'contacto@luistoledo.com.mx',
    `replyToEmail` VARCHAR(191) NULL,
    `adminNotificationEmail` VARCHAR(191) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `saveLogs` BOOLEAN NOT NULL DEFAULT true,
    `timeoutMs` INTEGER NOT NULL DEFAULT 10000,
    `maxRetries` INTEGER NOT NULL DEFAULT 3,
    `rateLimitPerMinute` INTEGER NOT NULL DEFAULT 20,
    `rateLimitPerHour` INTEGER NOT NULL DEFAULT 200,
    `lastTestedAt` DATETIME(3) NULL,
    `lastSuccessAt` DATETIME(3) NULL,
    `lastErrorAt` DATETIME(3) NULL,
    `lastErrorMessage` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `event` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `preheader` VARCHAR(191) NULL,
    `htmlContent` LONGTEXT NOT NULL,
    `textContent` LONGTEXT NOT NULL,
    `locale` VARCHAR(191) NOT NULL DEFAULT 'es-MX',
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EmailTemplate_event_locale_key`(`event`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailQueue` (
    `id` VARCHAR(191) NOT NULL,
    `recipient` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `htmlContent` LONGTEXT NULL,
    `textContent` LONGTEXT NOT NULL,
    `event` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 3,
    `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sentAt` DATETIME(3) NULL,
    `errorMessage` VARCHAR(500) NULL,
    `externalId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `orderId` VARCHAR(191) NULL,
    `courseId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EmailQueue_status_nextAttemptAt_idx`(`status`, `nextAttemptAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailLog` (
    `id` VARCHAR(191) NOT NULL,
    `queueId` VARCHAR(191) NULL,
    `recipient` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `event` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED') NOT NULL,
    `provider` ENUM('LOG', 'DISABLED', 'SMTP', 'GMAIL', 'MICROSOFT', 'AMAZON_SES', 'MAILGUN', 'SENDGRID', 'RESEND') NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 1,
    `externalId` VARCHAR(191) NULL,
    `errorMessage` VARCHAR(500) NULL,
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmailLog_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

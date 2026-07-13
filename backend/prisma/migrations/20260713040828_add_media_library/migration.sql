-- CreateTable
CREATE TABLE `MediaAsset` (
    `id` VARCHAR(191) NOT NULL,
    `kind` ENUM('IMAGE', 'DOCUMENT', 'VIDEO_EMBED') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(255) NULL,
    `url` TEXT NOT NULL,
    `mimeType` VARCHAR(120) NULL,
    `sizeBytes` INTEGER NULL,
    `provider` VARCHAR(80) NULL,
    `altText` VARCHAR(255) NULL,
    `uploadedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MediaAsset_kind_createdAt_idx`(`kind`, `createdAt`),
    INDEX `MediaAsset_uploadedById_idx`(`uploadedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MediaAsset` ADD CONSTRAINT `MediaAsset_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

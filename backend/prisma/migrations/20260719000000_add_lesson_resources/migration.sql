CREATE TABLE `LessonResource` (
    `id` VARCHAR(191) NOT NULL,
    `lessonId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `kind` ENUM('LINK', 'DOCUMENT', 'IMAGE') NOT NULL,
    `url` TEXT NULL,
    `mediaId` VARCHAR(191) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LessonResource_lessonId_position_idx`(`lessonId`, `position`),
    INDEX `LessonResource_mediaId_idx`(`mediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `LessonResource`
  ADD CONSTRAINT `LessonResource_lessonId_fkey`
  FOREIGN KEY (`lessonId`) REFERENCES `Lesson`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `LessonResource`
  ADD CONSTRAINT `LessonResource_mediaId_fkey`
  FOREIGN KEY (`mediaId`) REFERENCES `MediaAsset`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

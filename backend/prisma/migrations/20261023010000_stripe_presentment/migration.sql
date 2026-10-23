ALTER TABLE `Payment`
    ADD COLUMN `presentmentAmount` DECIMAL(20, 0) NULL,
    ADD COLUMN `presentmentCurrency` VARCHAR(3) NULL;

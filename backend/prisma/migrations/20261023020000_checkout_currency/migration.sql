ALTER TABLE `Payment`
    ADD COLUMN `checkoutAmount` DECIMAL(20, 0) NULL,
    ADD COLUMN `checkoutCurrency` VARCHAR(3) NULL,
    ADD COLUMN `checkoutRate` DECIMAL(24, 12) NULL,
    ADD COLUMN `checkoutRateAt` DATETIME(3) NULL;

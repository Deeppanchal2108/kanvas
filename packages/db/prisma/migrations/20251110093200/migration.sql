/*
  Warnings:

  - You are about to drop the column `info` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Event` table. All the data in the column will be lost.
  - Added the required column `message` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `key` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "info",
DROP COLUMN "type",
ADD COLUMN     "message" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "key" TEXT NOT NULL,
ADD COLUMN     "sharedType" TEXT NOT NULL DEFAULT 'public';

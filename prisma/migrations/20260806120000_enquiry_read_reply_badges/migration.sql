-- AlterTable
ALTER TABLE "Enquiry" ADD COLUMN     "isReplied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isUnread" BOOLEAN NOT NULL DEFAULT true;

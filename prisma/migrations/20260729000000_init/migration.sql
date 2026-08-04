-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'DRAFTED', 'SENT', 'DISMISSED');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('PENDING', 'SENT', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'default',
    "openingLineHtml" TEXT NOT NULL,
    "termsBlockHtml" TEXT NOT NULL,
    "closingSignatureHtml" TEXT NOT NULL,
    "isHtml" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "gmailThreadId" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "senderName" TEXT,
    "companyName" TEXT,
    "subject" TEXT NOT NULL,
    "rawBody" TEXT NOT NULL,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "generalRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastRefreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnquiryLineItem" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "lineOrder" INTEGER NOT NULL,
    "rawText" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "qty" TEXT,
    "price" DECIMAL(12,2),
    "stockRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnquiryLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "gmailDraftId" TEXT NOT NULL,
    "gmailMessageId" TEXT,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "isHtml" BOOLEAN NOT NULL,
    "status" "DraftStatus" NOT NULL DEFAULT 'PENDING',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedByUserId" TEXT NOT NULL,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentHistory" (
    "id" TEXT NOT NULL,
    "draftId" TEXT,
    "gmailMessageId" TEXT NOT NULL,
    "gmailThreadId" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "companyName" TEXT,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "generalRemarks" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentByUserId" TEXT NOT NULL,

    CONSTRAINT "SentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentHistoryItem" (
    "id" TEXT NOT NULL,
    "sentHistoryId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "qty" TEXT,
    "price" DECIMAL(12,2),
    "stockRemarks" TEXT,

    CONSTRAINT "SentHistoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_gmailThreadId_key" ON "Enquiry"("gmailThreadId");

-- CreateIndex
CREATE INDEX "Enquiry_status_idx" ON "Enquiry"("status");

-- CreateIndex
CREATE INDEX "Enquiry_senderEmail_idx" ON "Enquiry"("senderEmail");

-- CreateIndex
CREATE INDEX "EnquiryLineItem_enquiryId_idx" ON "EnquiryLineItem"("enquiryId");

-- CreateIndex
CREATE INDEX "Draft_status_idx" ON "Draft"("status");

-- CreateIndex
CREATE INDEX "Draft_enquiryId_idx" ON "Draft"("enquiryId");

-- CreateIndex
CREATE INDEX "SentHistory_senderEmail_idx" ON "SentHistory"("senderEmail");

-- CreateIndex
CREATE INDEX "SentHistory_sentAt_idx" ON "SentHistory"("sentAt");

-- CreateIndex
CREATE INDEX "SentHistoryItem_itemName_idx" ON "SentHistoryItem"("itemName");

-- AddForeignKey
ALTER TABLE "EnquiryLineItem" ADD CONSTRAINT "EnquiryLineItem_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentHistory" ADD CONSTRAINT "SentHistory_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentHistoryItem" ADD CONSTRAINT "SentHistoryItem_sentHistoryId_fkey" FOREIGN KEY ("sentHistoryId") REFERENCES "SentHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- One PENDING draft per enquiry at a time (partial unique index; not expressible in Prisma schema DSL)
CREATE UNIQUE INDEX "draft_one_pending_per_enquiry" ON "Draft" ("enquiryId") WHERE "status" = 'PENDING';

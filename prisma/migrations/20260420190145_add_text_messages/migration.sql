-- CreateTable
CREATE TABLE "TextMessage" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "twilioSid" TEXT,
    "fromNumber" TEXT,
    "toNumber" TEXT,
    "contactId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TextMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TextMessage_twilioSid_key" ON "TextMessage"("twilioSid");

-- AddForeignKey
ALTER TABLE "TextMessage" ADD CONSTRAINT "TextMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

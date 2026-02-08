-- CreateTable
CREATE TABLE "Admin" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Material" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "alertThreshold" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Storage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "parentId" INTEGER,
    "isGlobalStock" BOOLEAN NOT NULL DEFAULT false,
    "uniqueLink" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Storage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Storage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StorageTemplateItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storageId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "expectedQuantity" INTEGER NOT NULL,
    CONSTRAINT "StorageTemplateItem_storageId_fkey" FOREIGN KEY ("storageId") REFERENCES "Storage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StorageTemplateItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storageId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "expirationDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockItem_storageId_fkey" FOREIGN KEY ("storageId") REFERENCES "Storage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storageId" INTEGER NOT NULL,
    "rescuerName" TEXT NOT NULL,
    "postName" TEXT,
    "postNumber" TEXT,
    "type" TEXT NOT NULL,
    "greeting" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Inventory_storageId_fkey" FOREIGN KEY ("storageId") REFERENCES "Storage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inventoryId" INTEGER NOT NULL,
    "storageId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "expected" INTEGER NOT NULL,
    "quantityFound" INTEGER NOT NULL,
    "quantityAdded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryItem_storageId_fkey" FOREIGN KEY ("storageId") REFERENCES "Storage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Material_name_key" ON "Material"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Storage_uniqueLink_key" ON "Storage"("uniqueLink");

-- CreateIndex
CREATE UNIQUE INDEX "StorageTemplateItem_storageId_materialId_key" ON "StorageTemplateItem"("storageId", "materialId");

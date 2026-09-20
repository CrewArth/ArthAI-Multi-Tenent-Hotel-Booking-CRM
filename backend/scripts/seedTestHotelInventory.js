/**
 * Seeds central inventory and Tulip Hotel (GH002) inventory in the guesthouses database.
 *
 * Run: node backend/scripts/seedTestHotelInventory.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const DATABASE_NAME = 'guesthouses';
const TEST_HOTEL_ID = 'GH002';

const inventorySeed = [
  { name: 'Bath Soap', description: 'Guest room bath soap', unit: 'piece', costPrice: 12, price: 25, centralQuantity: 240, hotelQuantity: 48 },
  { name: 'Shampoo Sachet', description: 'Guest room shampoo sachet', unit: 'pack', costPrice: 4, price: 10, centralQuantity: 300, hotelQuantity: 60 },
  { name: 'Dental Kit', description: 'Toothbrush and toothpaste kit', unit: 'piece', costPrice: 18, price: 40, centralQuantity: 120, hotelQuantity: 24 },
  { name: 'Toilet Paper Roll', description: 'Bathroom tissue roll', unit: 'piece', costPrice: 15, price: 30, centralQuantity: 180, hotelQuantity: 36 },
  { name: 'Laundry Bag', description: 'Disposable guest laundry bag', unit: 'pack', costPrice: 25, price: 50, centralQuantity: 80, hotelQuantity: 16 },
  { name: 'Tea Bag', description: 'In-room tea bag', unit: 'box', costPrice: 90, price: 150, centralQuantity: 60, hotelQuantity: 12 },
  { name: 'Coffee Sachet', description: 'In-room instant coffee sachet', unit: 'box', costPrice: 120, price: 200, centralQuantity: 60, hotelQuantity: 12 },
  { name: 'Slippers', description: 'Disposable guest slippers', unit: 'set', costPrice: 35, price: 75, centralQuantity: 100, hotelQuantity: 20 },
];

if (!MONGO_URI) {
  console.error('MONGODB_URI or MONGO_URI is required.');
  process.exit(1);
}

await mongoose.connect(MONGO_URI);

try {
  const db = mongoose.connection.getClient().db(DATABASE_NAME);
  const [hotel, superAdmin] = await Promise.all([
    db.collection('guesthouses').findOne({ guestHouseId: TEST_HOTEL_ID }),
    db.collection('users').findOne({ role: 'SUPER_ADMIN' }),
  ]);

  if (!hotel) throw new Error(`Hotel ${TEST_HOTEL_ID} was not found in ${DATABASE_NAME}.`);
  if (!superAdmin) throw new Error('A SUPER_ADMIN user is required to seed inventory.');

  const now = new Date();

  for (const seed of inventorySeed) {
    const item = await db.collection('items').findOneAndUpdate(
      { name: seed.name },
      {
        $set: {
          description: seed.description,
          unit: seed.unit,
          isActive: true,
          updatedAt: now,
        },
        $setOnInsert: {
          createdBy: superAdmin._id,
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: 'after' },
    );

    const inventoryRecords = [
      { guestHouseId: null, quantity: seed.centralQuantity },
      { guestHouseId: hotel._id, quantity: seed.hotelQuantity },
    ];

    for (const record of inventoryRecords) {
      await db.collection('inventories').updateOne(
        { itemId: item._id, guestHouseId: record.guestHouseId },
        {
          $set: {
            quantity: record.quantity,
            price: seed.price,
            costPrice: seed.costPrice,
            updatedBy: superAdmin._id,
            updatedAt: now,
          },
          $setOnInsert: {
            itemId: item._id,
            guestHouseId: record.guestHouseId,
            createdBy: superAdmin._id,
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }
  }

  console.log(`Seeded ${inventorySeed.length} inventory items for ${hotel.guestHouseName} (${TEST_HOTEL_ID}).`);
} finally {
  await mongoose.disconnect();
}

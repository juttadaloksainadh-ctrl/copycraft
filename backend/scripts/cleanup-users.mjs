import 'dotenv/config';
import { initDatabase, closeDatabase, getMongoCollection } from '../config/db.js';

async function cleanupUsers() {
  await initDatabase();
  const usersCol = getMongoCollection('users');
  
  // Delete all users that are not admin or super_admin
  const deleteResult = await usersCol.deleteMany({
    role: { $nin: ['admin', 'super_admin'] }
  });
  console.log(`Deleted ${deleteResult.deletedCount} non-admin user records from MongoDB.`);

  const remaining = await usersCol.find({}).toArray();
  console.log('Remaining users in MongoDB:');
  remaining.forEach(u => console.log(` - [${u.role}] ${u.name} (${u.email})`));

  await closeDatabase();
}

cleanupUsers().catch(err => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});

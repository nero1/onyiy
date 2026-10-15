import {closeDb} from './index';
import {verifyDatabaseBinding} from './verify-binding';
try {
  await verifyDatabaseBinding(true);
  console.log('Fresh owner/runtime database binding and restricted roles verified without application DDL.');
} finally {await closeDb();}

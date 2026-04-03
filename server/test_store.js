
import { createUser, findUserByEmail } from './src/db/store.js';

async function test() {
  try {
    console.log('Testing createUser...');
    const user = await createUser('test@example.com', 'hash', 'salt', { iterations: 1000 });
    console.log('User created:', user);
    
    const found = await findUserByEmail('test@example.com');
    console.log('User found:', found);
  } catch (err) {
    console.error('CRASH:', err);
  }
}

test();

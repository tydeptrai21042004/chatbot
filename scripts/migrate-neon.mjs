import { neon } from '@neondatabase/serverless';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const sql=neon(process.env.DATABASE_URL);
const dir=fileURLToPath(new URL('../migrations/',import.meta.url));
const files=(await readdir(dir)).filter(x=>/^\d+.*\.sql$/.test(x)).sort();
for(const file of files){
 const migration=await readFile(path.join(dir,file),'utf8');
 for(const statement of migration.split(/;\s*(?:\n|$)/).map(x=>x.trim()).filter(Boolean)) await sql.query(statement);
 console.log(`Applied ${file}`);
}
console.log('Neon migrations completed');

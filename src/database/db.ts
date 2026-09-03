import {drizzle} from 'drizzle-orm/expo-sqlite';
import * as schema from './schema'
import { openDatabaseSync } from 'expo-sqlite';

export const expodb = openDatabaseSync('revision.db');
export const db = drizzle(expodb,{schema})
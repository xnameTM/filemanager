import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// odwołanie do katalogu głównego projektu
const __filename = fileURLToPath(import.meta.url);
export const __dirname = join(dirname(__filename), '..');
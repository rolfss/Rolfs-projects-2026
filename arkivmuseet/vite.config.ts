import { defineConfig } from 'vite';
// Relative asset URLs keep the museum portable when the Pages repository is renamed.
export default defineConfig({base:'./', build:{target:'es2022', chunkSizeWarningLimit:700}});

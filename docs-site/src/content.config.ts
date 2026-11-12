import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    // access: who the help assistant may answer from this page. "staff" pages are never used for anonymous visitors.
    schema: docsSchema({ extend: z.object({ access: z.enum(['public', 'staff']).default('public') }) }),
  }),
};

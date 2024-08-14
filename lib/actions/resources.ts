'use server';

import {
  NewResourceParams,
  insertResourceSchema,
  resources,
} from '@/lib/db/schema/resources';
import { generateEmbeddings } from '../ai/embedding';
import { db } from '../db';
import { embeddings } from '../db/schema/embeddings';

export const createResource = async (input: NewResourceParams) => {
  try {
    const { content } = insertResourceSchema.parse(input);

    const [resource] = await db
      .insert(resources)
      .values({ content })
      .returning();

    // Generate embeddings for the new resource
    const embeddingsData = await generateEmbeddings(content);

    // Store the embeddings in the database
    await db.insert(embeddings).values(
      embeddingsData.map(({ embedding, content: embeddingContent }) => ({
        resourceId: resource.id,
        content: embeddingContent,
        embedding,
      }))
    );

    return 'Resource successfully created with embeddings.';
  } catch (e) {
    if (e instanceof Error)
      return e.message.length > 0 ? e.message : 'Error, please try again.';
    return 'An unexpected error occurred.';
  }
};
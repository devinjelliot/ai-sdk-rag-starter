import { createResource } from '@/lib/actions/resources';
import { findRelevantContent } from '@/lib/ai/embedding';
import { openai } from '@ai-sdk/openai';
import { convertToCoreMessages, streamText, tool } from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, experimental_attachments } = await req.json();

  console.log("Received attachments:", experimental_attachments);

  const processedAttachments = experimental_attachments?.map((attachment: any) => ({
    ...attachment,
    url: attachment.content,
  }));

  console.log("Processed attachments:", processedAttachments);

  const result = await streamText({
    model: openai('gpt-4o'),
    messages: convertToCoreMessages(messages),
    system: `You are a helpful assistant. Check your knowledge base before answering questions.
    Only respond to questions using information from tool calls.
    If no relevant information is found in the tool calls, respond, "Sorry, I don't know."
    If an image is provided, always analyze it and describe what you see in detail.
    Start your response with "I see an image." when an image is present.`,
    tools: {
      addResource: tool({
        description: `add a resource to your knowledge base.
          If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
        parameters: z.object({
          content: z
            .string()
            .describe('the content or resource to add to the knowledge base'),
        }),
        execute: async ({ content }) => createResource({ content }),
      }),
      getInformation: tool({
        description: `get information from your knowledge base to answer questions.`,
        parameters: z.object({
          question: z.string().describe('the users question'),
        }),
        execute: async ({ question }) => findRelevantContent(question),
      }),
    },
    experimental_attachments: processedAttachments,
  } as any);

  return result.toDataStreamResponse();
}
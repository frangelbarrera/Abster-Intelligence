'use server';
/**
 * @fileOverview A Genkit flow for the Contextual Intelligence Agent.
 *
 * - absterIntelAgent - A function that acts as a contextual intelligence agent,
 *   processing chat history and attached files to provide relevant analysis.
 * - AbsterIntelInput - The input type for the absterIntelAgent function.
 * - AbsterIntelOutput - The return type for the absterIntelAgent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {Part} from '@genkit-ai/ai'; // Import Part type

// Define the schema for a single attachment within a message.
// It includes the dataUri for the actual file content.
const AttachmentSchema = z.object({
  id: z.string().describe('Unique ID of the attachment.'),
  name: z.string().describe('File name of the attachment.'),
  type: z.string().describe('MIME type of the attachment (e.g., "image/jpeg", "application/pdf").'),
  dataUri: z
    .string()
    .describe(
      "The content of the attachment as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type Attachment = z.infer<typeof AttachmentSchema>;

// Define the schema for a single chat message.
// 'content' here represents the text part of the message.
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']).describe('Role of the message sender (user or assistant).'),
  content: z.string().describe('Text content of the message.'),
  attachments: z.array(AttachmentSchema).optional().describe('List of attachments for this message, including their data URIs.'),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// Define the input schema for the Genkit flow.
const AbsterIntelInputSchema = z.object({
  chatMessages: z.array(ChatMessageSchema).describe('The full conversation history, including the current user message and its attachments. Attachments must include their data URIs for AI processing.'),
});
export type AbsterIntelInput = z.infer<typeof AbsterIntelInputSchema>;

// Define the output schema for the Genkit flow.
const AbsterIntelOutputSchema = z.object({
  response: z.string().describe('The AI agent\'s contextual analysis, summary, or structured data based on the conversation and attached files.'),
});
export type AbsterIntelOutput = z.infer<typeof AbsterIntelOutputSchema>;

// Exported wrapper function to call the Genkit flow.
export async function absterIntelAgent(input: AbsterIntelInput): Promise<AbsterIntelOutput> {
  return absterIntelAgentFlow(input);
}

// Genkit Flow definition.
const absterIntelAgentFlow = ai.defineFlow(
  {
    name: 'absterIntelAgentFlow',
    inputSchema: AbsterIntelInputSchema,
    outputSchema: AbsterIntelOutputSchema,
  },
  async (input) => {
    // Transform the incoming chat messages into the format expected by Genkit's AI model.
    // This involves handling both text and multimodal parts (attachments).
    const formattedMessages: { role: 'user' | 'model'; content: Part[] }[] = [];

    for (const msg of input.chatMessages) {
      const contentParts: Part[] = [{ text: msg.content }];

      // If the message has attachments, add them as media parts.
      if (msg.attachments && msg.attachments.length > 0) {
        for (const attachment of msg.attachments) {
          // Extract content type from the dataUri, or fallback to provided type, then to a generic type.
          const contentTypeMatch = attachment.dataUri.match(/^data:(.*?);base64,/);
          const contentType = contentTypeMatch ? contentTypeMatch[1] : attachment.type; // Fallback to provided type if dataUri doesn't have it

          contentParts.push({
            media: {
              url: attachment.dataUri,
              contentType: contentType || 'application/octet-stream', // Ensure a content type is always provided
            },
          });
        }
      }

      // Map 'assistant' role to 'model' for Gemini compatibility.
      formattedMessages.push({
        role: msg.role === 'user' ? 'user' : 'model',
        content: contentParts,
      });
    }

    // Set up the system instruction for the AI agent.
    const systemInstruction = `You are a highly skilled contextual intelligence agent named ABSTER INTELLIGENCE.\nYour primary role is to assist intelligence analysts by providing relevant, contextual, and in-depth analysis or structured data.\nYou will consider the entire conversation history and any attached files to respond to queries.\nFocus on extracting key information, identifying patterns, and offering actionable insights.\nIf files are attached, analyze their content thoroughly in relation to the query and conversation.\nYour responses should be precise, factual, and directly address the user's intelligence query.\nPresent your findings clearly, using markdown formatting when appropriate for readability.\nIf a query involves sensitive information, handle it with appropriate discretion.`

    // Make the call to the generative AI model.
    const { text } = await ai.generate({
      messages: formattedMessages,
      model: 'googleai/gemini-2.5-flash',
      system: systemInstruction,
      config: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        topP: 0.95,
      },
    });

    // Handle cases where no text response is generated.
    if (!text) {
      throw new Error('ABSTER INTELLIGENCE failed to generate a response.');
    }

    // Return the AI's response.
    return { response: text };
  }
);

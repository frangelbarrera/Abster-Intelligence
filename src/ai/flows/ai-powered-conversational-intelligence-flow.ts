'use server';
/**
 * @fileOverview A Genkit flow for natural language intelligence queries.
 *
 * - conversationalIntelligence - A function that processes natural language queries and returns AI-generated analysis.
 * - ConversationalIntelligenceInput - The input type for the conversationalIntelligence function.
 * - ConversationalIntelligenceOutput - The return type for the conversationalIntelligence function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ConversationalIntelligenceInputSchema = z.object({
  query: z.string().describe('The natural language intelligence query.'),
});
export type ConversationalIntelligenceInput = z.infer<typeof ConversationalIntelligenceInputSchema>;

const ConversationalIntelligenceOutputSchema = z.object({
  analysis: z.string().describe('The AI-generated analysis, summary, or insight based on the query.'),
});
export type ConversationalIntelligenceOutput = z.infer<typeof ConversationalIntelligenceOutputSchema>;

export async function conversationalIntelligence(input: ConversationalIntelligenceInput): Promise<ConversationalIntelligenceOutput> {
  return conversationalIntelligenceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'conversationalIntelligencePrompt',
  input: { schema: ConversationalIntelligenceInputSchema },
  output: { schema: ConversationalIntelligenceOutputSchema },
  prompt: `You are an intelligence analyst AI agent. Your task is to process natural language queries and provide comprehensive analysis, summaries, or insights.

Query: {{{query}}}

Please provide a detailed and accurate response based on the query.`, // The model should generate analysis based on the query
});

const conversationalIntelligenceFlow = ai.defineFlow(
  {
    name: 'conversationalIntelligenceFlow',
    inputSchema: ConversationalIntelligenceInputSchema,
    outputSchema: ConversationalIntelligenceOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('No analysis generated.');
    }
    return output;
  }
);

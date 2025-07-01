// Default prompts configuration
export interface PromptConfig {
  researchAssistant: string;
}

// Template variables available for prompts:
// {{collectionName}} - The name of the collection being queried
// {{context}} - The relevant document content retrieved from the database
export const TEMPLATE_VARIABLES = {
  collectionName: "The name of the collection being queried (e.g., 'Machine Learning Papers')",
  context: "The relevant document content retrieved from the database"
} as const;

export const DEFAULT_PROMPTS: PromptConfig = {
  researchAssistant: `You are an expert research assistant analyzing scientific documents. Your task is to provide accurate, well-structured answers based EXCLUSIVELY on the information provided from collection "{{collectionName}}".

**CRITICAL GUIDELINES:**
• Base your response ONLY on the provided context - never use external knowledge
• If the context doesn't contain sufficient information to answer the question, explicitly state this
• Clearly distinguish between direct facts from the documents and any logical inferences
• Preserve the scientific accuracy and terminology from the source material

**RESPONSE FORMATTING:**
• Use **bold** for key findings, important terms, and main conclusions
• Use bullet points (•) for lists, multiple findings, or step-by-step information
• Use numbered lists (1., 2., 3.) when describing processes, methodologies, or ranked information
• Use > blockquotes for direct citations or important quotes from the papers
• Organize information hierarchically with clear sections when appropriate

**CONTENT STRUCTURE:**
1. Lead with the most relevant and direct answer to the question
2. Support with specific evidence, data, or findings from the documents
3. Include relevant context that helps understand the main answer
4. Note any limitations or gaps in the available information

**HANDLING UNCERTAINTY:**
• If information is incomplete: "Based on the available documents, [partial answer], however more information would be needed to fully address [specific aspect]"
• If no relevant information exists: "The provided documents from collection {{collectionName}} do not contain information about [specific topic]"
• If information conflicts: Present both perspectives clearly and note the discrepancy

Context from collection "{{collectionName}}":
{{context}}

Provide a comprehensive, accurate response that maximizes the value of the available information while maintaining scientific rigor.`
};

// Custom prompt storage and retrieval
const PROMPTS_STORAGE_KEY = 'dvd_custom_prompts';

export const getCustomPrompts = (userId?: string): PromptConfig => {
  if (typeof window === 'undefined') return DEFAULT_PROMPTS;
  
  try {
    const storageKey = userId ? `${PROMPTS_STORAGE_KEY}_${userId}` : PROMPTS_STORAGE_KEY;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<PromptConfig>;
      // Merge with defaults to ensure all required fields exist
      return {
        ...DEFAULT_PROMPTS,
        ...parsed
      };
    }
  } catch (error) {
    console.error('Error loading custom prompts:', error);
  }
  
  return DEFAULT_PROMPTS;
};

export const saveCustomPrompts = (prompts: PromptConfig, userId?: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const storageKey = userId ? `${PROMPTS_STORAGE_KEY}_${userId}` : PROMPTS_STORAGE_KEY;
    localStorage.setItem(storageKey, JSON.stringify(prompts));
  } catch (error) {
    console.error('Error saving custom prompts:', error);
  }
};

export const resetToDefaultPrompts = (userId?: string): PromptConfig => {
  if (typeof window !== 'undefined') {
    const storageKey = userId ? `${PROMPTS_STORAGE_KEY}_${userId}` : PROMPTS_STORAGE_KEY;
    localStorage.removeItem(storageKey);
  }
  return DEFAULT_PROMPTS;
};

// Template replacement helper
export const interpolatePrompt = (template: string, variables: Record<string, string>): string => {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value);
  }
  return result;
}; 
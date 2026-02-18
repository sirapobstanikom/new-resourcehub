
import { GoogleGenAI } from "@google/genai";

export async function getToolInsights(toolName: string, userContext: string = "") {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-pro-preview';
  
  const prompt = `As an Innovation Expert, provide a high-level summary and actionable steps for using the tool: "${toolName}". 
  ${userContext ? `User context: ${userContext}` : ""}
  Format the response with:
  1. What it is (brief)
  2. Why it matters
  3. 3-5 Actionable steps to start
  Keep it professional, encouraging, and concise. Use Markdown.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 4096 }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to fetch AI insights. Please try again later.";
  }
}

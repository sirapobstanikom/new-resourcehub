
export async function getToolInsights(toolName: string, userContext: string = "") {
  const apiKey = process.env.API_KEY;
  
  const systemPrompt = `As an Innovation Expert, provide a high-level summary and actionable steps for using the tool: "${toolName}". 
  Format the response with:
  1. What it is (brief)
  2. Why it matters
  3. 3-5 Actionable steps to start
  Keep it professional, encouraging, and concise. Use Markdown.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a professional Innovation Consultant.' },
          { role: 'user', content: `${systemPrompt}${userContext ? `\n\nUser context: ${userContext}` : ""}` }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("AI Insight Error:", error);
    return "Failed to fetch AI insights. Please check your API key and connection.";
  }
}

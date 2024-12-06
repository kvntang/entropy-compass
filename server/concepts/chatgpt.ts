import axios from "axios";

class ChatGPTConcept {
  private openAIApiKey: string;

  constructor() {
    this.openAIApiKey = process.env.OPENAI_API_KEY || "";
    if (!this.openAIApiKey) {
      throw new Error("OpenAI API Key is not set in environment variables.");
    }
  }

  /**
   * Generate a word list using ChatGPT API.
   */
  async generateWordList(inputText: string): Promise<string[]> {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: `Strictly generate a JSON object with keys 0-35 containing words similar to this scene: "${inputText}". Ensure 0 is most similar. Format exactly like:
{
  "0": "most similar word",
  "1": "second similar word",
  ...
  "35": "least similar word"
}`,
            },
          ],
          max_tokens: 300,
          temperature: 0.7,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.openAIApiKey}`,
          },
        },
      );

      const responseText = (response.data as any).choices[0].message.content.trim();
      const wordList = JSON.parse(responseText);
      return Object.values(wordList);
    } catch (error) {
      console.error("Error generating word list:", error);
      throw error;
    }
  }
}

export default ChatGPTConcept;

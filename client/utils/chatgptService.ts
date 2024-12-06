export const generateWordList = async (caption: string): Promise<string[]> => {
  try {
    const response = await fetch("/api/chatgpt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputText: caption }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Server error response:", errorText);
      throw new Error(`ChatGPT API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.words; // Use the 'words' key from the response
  } catch (error) {
    console.error("Error generating word list:", error);
    throw error; // Rethrow to allow upstream error handling
  }
};

export const fetchGeneratedImage = async (prompt: string): Promise<string | null> => {
  try {
    const response = await fetch("/api/images/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Image generation API Error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.image || typeof data.image !== "string") {
      throw new Error("Invalid response format: 'image' is missing or not a string");
    }

    return data.image; // Assuming `data.image` is a base64 string or URL
  } catch (error) {
    console.error("Error fetching generated image:", error);
    return null; // Return null in case of an error
  }
};

export const getSimilarWords = async (prompt: string): Promise<Record<string, string>> => {
  try {
    const response = await fetch("/api/images/similar-words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Similar Words API Error: ${response.status}`);
    }

    const data = await response.json();

    if (typeof data !== "object" || data === null) {
      throw new Error("Invalid response format: Expected an object");
    }

    return data; // Assuming the API returns an object with key-value pairs
  } catch (error) {
    console.error("Error fetching similar words:", error);
    return {}; // Return an empty object in case of an error
  }
};

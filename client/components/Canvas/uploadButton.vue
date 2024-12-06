<!-- works -->
<script setup lang="ts">
import { generateWordList } from "@/utils/chatgptService";
import { generateCaption } from "@/utils/huggingFaceService";
import { ref } from "vue";

interface ImageDoc {
  author: string;
  parent: string;
  coordinate: string;
  prompt: string;
  type: string;
  step: string;
  originalImage: string;
  steppedImage: string;
  promptedImage: string;
  caption: string;
  wordList: string[];
  _id: string;
}

const photo = ref<File | null>(null);
const emit = defineEmits(["refreshImages"]);

// Convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const createImageDoc = async (): Promise<ImageDoc | null> => {
  try {
    if (!photo.value) return null;

    // Convert image to Base64
    const base64Photo = await fileToBase64(photo.value);
    console.log("Payload sent to backend:", {
      originalImage: base64Photo,
    }); 

    // Generate caption
    const caption = await generateCaption(base64Photo);
    console.log("Generated caption:", caption);

    // Generate word list using ChatGPT
    const wordList = await generateWordList(caption);
    console.log("Generated word list:", wordList);

    // Send to backend
    const response = await fetch("/api/images", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        author: "mocked-author-id",
        parent: "",
        coordinate: "50,50",
        type: "denoise",
        step: "0",
        prompt: "0",
        originalImage: base64Photo,
        steppedImage: "",
        promptedImage: "",
        caption,
        wordList,
      }),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    emit("refreshImages");
    photo.value = null;

    return data as ImageDoc;
  } catch (error) {
    console.error("Error creating ImageDoc:", error);
    return null;
  }
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  photo.value = target.files?.[0] ?? null;
};
</script>

<template>
  <form @submit.prevent="createImageDoc">
    <input id="photo" type="file" accept="image/*" @change="handleFileChange" />
    <button type="submit" class="pure-button-primary pure-button" :disabled="!photo">
      Upload
    </button>
  </form>
</template>

<style scoped>
form {
  background-color: #3fa14c68;
  border-radius: 1em;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  padding: 1em;
  width: 90%;
  max-width: 40em;
  margin: 1em auto;
}

textarea {
  font-family: inherit;
  font-size: inherit;
  height: 6em;
  padding: 0.5em;
  border-radius: 4px;
  resize: none;
}

button:disabled {
  background-color: #000000;
  cursor: not-allowed;
  opacity: 0.2;
}
</style>

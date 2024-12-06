

<script setup lang="ts">
import deleteButton from "@/components/Canvas/deleteButton.vue";
import oneDCanvasComponent from "@/components/Canvas/oneDCanvasComponent_7.vue";
import twoDCanvasComponent from "@/components/Canvas/twoDCanvasComponent_4.vue";
import uploadButton from "@/components/Canvas/uploadButton.vue";
import { useUserStore } from "@/stores/user";
import { fetchy } from "@/utils/fetchy.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref } from "vue";

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

const props = defineProps({
  is1DCanvas: {
    type: Boolean,
    required: true,
  },
});

const images = ref<ImageDoc[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const showUploadButton = ref(true);

const userStore = useUserStore();
const { currentUsername, currentUserID, isLoggedIn } = storeToRefs(userStore);

async function fetchImages() {
  if (!isLoggedIn.value) {
    images.value = [];
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    const result = await fetchy(`/api/images/author/${currentUserID.value}`, "GET");
    images.value = result || [];
    showUploadButton.value = images.value.length === 0;
  } catch (err) {
    error.value = "Failed to load images. Please try again later.";
    console.error("Error fetching images:", err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchImages();
});

function refreshImages() {
  fetchImages();
}

function deleteAll() {
  showUploadButton.value = true;
  refreshImages();
}

const canvasMessage = computed(() => (props.is1DCanvas ? "1D Canvas" : "2D Canvas"));
</script>

<template>
  <main>
    <div class="delete-panel">
      <h2 class="canvas-message">{{ canvasMessage }}</h2>
      <deleteButton @deleteAll="deleteAll" />
    </div>

    <div class="tips-panel">
      <h2>User Tips</h2>
      <div>
        - Hold "Shift" and drag to navigate the canvas
        <br />
        - Double click to select a box
        <br />
        - Press "Esc" to exit dragging mode
      </div>
    </div>

    <div v-if="showUploadButton" class="upload-panel">
      <h2>Upload an image to start!</h2>
      <uploadButton @refreshImages="refreshImages" />
    </div>

    <section v-if="isLoggedIn">
      <section v-if="loading">Loading images...</section>
      <section v-else-if="error">{{ error }}</section>
      <template v-else>
        <oneDCanvasComponent
          v-if="props.is1DCanvas"
          :images="images"
          @refreshImages="refreshImages"
        />
        <twoDCanvasComponent
          v-else
          :images="images"
          @refreshImages="refreshImages"
        />
      </template>
    </section>
    <section v-else>
      <p>Please log in to upload and view images.</p>
    </section>
  </main>
</template>


<style scoped>
/* Global styles */
body {
  font-family: "Arial", sans-serif;
  font-size: large;
  margin: 0;
  padding: 0;
  background-color: #000000;
  color: white;
}

h1 {
  text-align: center;
  margin: 20px 0;
}

main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: 100vh;
  background-color: #000000;
  color: white;
  padding: 20px;
}

section {
  width: 100%;
  max-width: 1200px;
  margin: 10px 0;
  padding: 10px;
  border-radius: 10px;
  background: #000000;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.3);
}

/* Delete Panel Styles */
.delete-panel {
  position: fixed;
  top: 100px;
  right: 0px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 10px;
  background: rgba(26, 26, 26, 0.8);
  border-radius: 8px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  width: auto;
}

.tips-panel {
  position: fixed;
  top: 300px;
  right: 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 10px;
  background: rgba(26, 26, 26, 0.8);
  border-radius: 8px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  width: auto;
}

.upload-panel {
  position: fixed;
  top: 80%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 10px;
  background: rgba(26, 26, 26, 0.0);
  border-radius: 8px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  width: auto;
}

.canvas-message {
  margin: 0 0 10px 0;
}
</style>

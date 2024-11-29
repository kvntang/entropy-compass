<script setup lang="ts">
import oneDCanvasComponent from "@/components/Canvas/oneDCanvasComponent_1.vue";
import twoDCanvasComponent from "@/components/Canvas/twoDCanvasComponent_2.vue";
import { useUserStore } from "@/stores/user";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref } from "vue";
import deleteButton from "../components/Canvas/deleteButton.vue";
import { fetchy } from "../utils/fetchy.js";

// Define props
const props = defineProps(["is1DCanvas"]);

const images = ref([]); // Store the images fetched from the backend
const loading = ref(false); // Loading state
const error = ref<string | null>(null); // Explicitly define the type as string or null

// Use store
const { currentUsername, currentUserID, isLoggedIn } = storeToRefs(useUserStore());

// Get ImageDocs from current user and pass as props into the canvases
async function fetchImages() {
  loading.value = true;
  error.value = null;
  try {
    const result = await fetchy(`/api/images/author/${currentUserID.value}`, "GET");
    console.log("Fetched images:", result);
    images.value = result.images || []; // Assign the `images` array from the result
  } catch (err) {
    error.value = "Failed to load images. Please try again later.";
    console.error("Error fetching images:", err);
  } finally {
    loading.value = false;
  }
}

// Fetch images on component mount
onMounted(() => {
  fetchImages().catch((err) => {
    console.error("Error during onMounted fetch:", err);
  });
});

// Handle refreshImages emit from the child component
function refreshImages() {
  fetchImages().catch((err) => {
    console.error("Error during refreshImages:", err);
  });
}

// Dynamic message based on the canvas type
const canvasMessage = computed(() => (props.is1DCanvas ? "1D Canvas" : "2D Canvas"));
</script>

<template>
  <main>
    <h1>Welcome to Home Page</h1>
    <h1>A new way to explore stable diffusion!</h1>
    <section>
      <h1 v-if="isLoggedIn">Welcome {{ currentUsername }}!</h1>
      <h1 v-else>Please login!</h1>
    </section>
    <!-- Conditionally render the canvas components and message -->
    <section v-if="isLoggedIn">
      <h2>{{ canvasMessage }}</h2>
      <deleteButton @refreshImages="refreshImages" />
      <section v-if="loading">Loading images...</section>
      <section v-else-if="error">{{ error }}</section>
      <template v-else>
        <oneDCanvasComponent v-if="is1DCanvas" :images="images" @refreshImages="refreshImages" />
        <twoDCanvasComponent v-else :images="images" @refreshImages="refreshImages" />
      </template>
    </section>
  </main>
</template>

<style scoped>
/* change global font */
body {
  font-family: "Arial", sans-serif;
  margin: 0;
  padding: 0;
  background-color: #1a1a1a;
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
  background-color: #1a1a1a;
  color: white;
  padding: 20px;
}
section {
  width: 90%;
  max-width: 1200px;
  margin: 20px 0;
  padding: 20px;
  border-radius: 10px;
  background: #2b2b2b;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.3);
}

/* center the 1d canvas/2d canvas text */
h2 {
  text-align: center;
}
</style>

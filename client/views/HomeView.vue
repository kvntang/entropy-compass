<script setup lang="ts">
import oneDCanvasComponent from "@/components/Canvas/oneDCanvasComponent_1.vue";
import twoDCanvasComponent from "@/components/Canvas/twoDCanvasComponent_1.vue";
import { useUserStore } from "@/stores/user";
import { storeToRefs } from "pinia";
import { computed } from "vue";

// Define props
const props = defineProps(["is1DCanvas"]);

// Use store
const { currentUsername, isLoggedIn } = storeToRefs(useUserStore());

// Dynamic message based on the canvas type
const canvasMessage = computed(() => (props.is1DCanvas ? "1D Canvas!!!!!" : "2D Canvas!!!!!"));
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
      <oneDCanvasComponent v-if="is1DCanvas" />
      <twoDCanvasComponent v-else />
    </section>
  </main>
</template>

<style scoped>
h1 {
  text-align: center;
}
</style>

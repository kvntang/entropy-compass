<script setup lang="ts">
import { useUserStore } from "@/stores/user";
import { storeToRefs } from "pinia";
import { onBeforeMount, ref } from "vue";

const { isLoggedIn } = storeToRefs(useUserStore());

const loaded = ref(false);

onBeforeMount(async () => {
  loaded.value = true;
});
</script>

<template>
  <div v-if="isLoggedIn">
    <h1>2D Canvas here!!!!!</h1>
    <br />
    <br />
    <br />
    <br />
    <br />
    <br />
    <br />
  </div>
</template>

<style scoped>
section {
  display: flex;
  flex-direction: column;
  gap: 1em;
}

section,
p,
.row {
  margin: 0 auto;
  max-width: 60em;
}

article {
  background-color: var(--base-bg);
  border-radius: 1em;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  padding: 1em;
}

.posts {
  padding: 1em;
}

.row {
  display: flex;
  justify-content: space-between;
  margin: 0 auto;
  max-width: 60em;
}

/* Styles for the 1D Canvas div */
div {
  background-color: black;
  color: white;
  padding: 1em;
  text-align: center;
  display: flex; /* Enable Flexbox */
  justify-content: center; /* Horizontally center content */
  align-items: center; /* Vertically center content */
  height: 50vh; /* Optional: Full viewport height for centering */
}
</style>

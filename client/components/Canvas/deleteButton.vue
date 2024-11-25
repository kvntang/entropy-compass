<script setup lang="ts">
import { useUserStore } from "@/stores/user";
import { storeToRefs } from "pinia";
import { ref } from "vue";
import { fetchy } from "../../utils/fetchy";

// Emit event to notify parent component
const emit = defineEmits(["refreshImages"]);

const isLoading = ref(false); // Loading state
const errorMessage = ref<string | null>(null); // Error message state
const successMessage = ref<string | null>(null); // Success message state

// Get the current user's ID from the store
const { currentUserID } = storeToRefs(useUserStore());

// Function to delete all images for the current user
const deleteAllImages = async () => {
  if (!currentUserID.value) {
    errorMessage.value = "User is not logged in.";
    return;
  }

  isLoading.value = true;
  errorMessage.value = null;
  successMessage.value = null;

  try {
    await fetchy(`/api/images/author/${currentUserID.value}`, "DELETE");
    successMessage.value = "All images have been successfully deleted.";
    emit("refreshImages"); // Emit event to refresh images
  } catch (error) {
    console.error("Error deleting images:", error);
    errorMessage.value = "Failed to delete images. Please try again.";
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div>
    <button @click="deleteAllImages" :disabled="isLoading" class="delete-button">
      {{ isLoading ? "Deleting..." : "Delete All Images" }}
    </button>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
  </div>
</template>

<style scoped>
.delete-button {
  background-color: #e63946;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.delete-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.error-message {
  color: #e63946;
  margin-top: 10px;
}

.success-message {
  color: #2a9d8f;
  margin-top: 10px;
}
</style>

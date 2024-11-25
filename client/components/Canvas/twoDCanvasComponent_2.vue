<script setup lang="ts">
import p5 from "p5";
import { onMounted, ref } from "vue";
import { fetchy } from "../../utils/fetchy";

// Define the images prop
const props = defineProps({
  images: {
    type: Array,
    required: true,
  },
});

console.log("Received images in child:", props.images);

// Reference to the canvas container
const canvasContainer = ref(null);

// Helper function to create a new ImageDoc
const createImageDoc = async (coordinate: string, type: string, step: string) => {
  try {
    // Mocked author ID (replace with actual user authentication logic)
    const authorId = "mocked-author-id";

    await fetchy("/api/images", "POST", {
      body: {
        author: authorId,
        coordinate,
        type,
        step, // Step is now a string
        prompt: "",
        originalImage: "",
        steppedImage: "",
        promptedImage: "",
      },
    });

    console.log(`ImageDoc created successfully! Coordinate: ${coordinate}, Type: ${type}, Step: ${step}`);
  } catch (error) {
    console.error("Error creating ImageDoc:", error);
  }
};

onMounted(() => {
  if (canvasContainer.value) {
    new p5((p) => {
      // Variables
      let point: any; // Renamed from `ball` to `point`
      let isDragging = false;
      let launchDirection: p5.Vector;
      let staticPositions: { pos: p5.Vector; color: p5.Color; type: string; step: number }[] = [];
      let currentColor: p5.Color; // Placeholder for the color of the point's "image"

      p.setup = () => {
        const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent(canvasContainer.value);

        // Initialize static positions from props.images
        props.images.forEach((image: { coordinate: string; type: string }, index: number) => {
          const [x, y] = image.coordinate.split(",").map(Number);
          const color = image.type === "red" ? p.color(255, 0, 0) : p.color(0, 0, 255);

          staticPositions.push({
            pos: p.createVector(x, y),
            color,
            type: image.type,
            step: 0, // No step value for static images
          });
        });

        // Point properties
        point = {
          pos: p.createVector(p.width / 2, p.height / 2),
          radius: 25, // Adjust radius to match the size of the placeholder "image"
          vel: p.createVector(0, 0),
          isFlying: false,
          type: "red", // Default type
          step: 0, // Placeholder for step
        };

        // Default color (red for now)
        currentColor = p.color(255, 0, 0);

        // Launch direction vector
        launchDirection = p.createVector(0, 0);
      };

      p.draw = () => {
        p.background(10);

        // Draw all recorded static positions as colored boxes (placeholder for images)
        staticPositions.forEach((sp, index) => {
          // Draw the rectangle
          p.fill(sp.color);
          p.rectMode(p.CENTER);
          p.rect(sp.pos.x, sp.pos.y, point.radius * 2, point.radius * 2);

          // Draw the index label
          p.fill(255); // White text
          p.textAlign(p.CENTER, p.CENTER);
          p.text(index, sp.pos.x, sp.pos.y - point.radius - 10); // Position label above the rectangle
        });

        // Draw the current point's placeholder "image" as a colored box
        p.fill(currentColor);
        p.rectMode(p.CENTER);
        p.rect(point.pos.x, point.pos.y, point.radius * 2, point.radius * 2);

        if (isDragging) {
          let dragDistance = p.dist(p.mouseX, p.mouseY, point.pos.x, point.pos.y);

          let dynamicRadius = Math.max(dragDistance, 50);

          // Draw a circle around the point to show the drag range
          p.stroke(100);
          p.noFill();
          p.ellipse(point.pos.x, point.pos.y, dynamicRadius * 2);

          // Calculate the launch direction
          launchDirection = p.createVector(point.pos.x, point.pos.y).sub(p.createVector(p.mouseX, p.mouseY)).normalize().mult(dynamicRadius);

          // Draw the launch line
          p.stroke(255);
          p.line(point.pos.x, point.pos.y, point.pos.x + launchDirection.x, point.pos.y + launchDirection.y);
        }

        // Handle point movement
        if (point.isFlying) {
          point.pos.add(point.vel);

          point.vel.mult(0.98); // Apply friction

          if (point.vel.mag() < 0.01) {
            point.vel.set(0, 0);
            point.isFlying = false;

            staticPositions.push({ pos: point.pos.copy(), color: currentColor, type: point.type, step: point.step });
          }

          if (point.pos.x - point.radius < 0 || point.pos.x + point.radius > p.width) {
            point.vel.x *= -0.8;
          }
          if (point.pos.y - point.radius < 0 || point.pos.y + point.radius > p.height) {
            point.vel.y *= -0.8;
          }
        }
      };

      p.mousePressed = () => {
        let d = p.dist(p.mouseX, p.mouseY, point.pos.x, point.pos.y);
        if (d < point.radius && !point.isFlying) {
          isDragging = true;
        }
      };

      p.mouseReleased = async () => {
        if (isDragging) {
          isDragging = false;
          point.isFlying = true;

          let force = p5.Vector.sub(point.pos, p.createVector(p.mouseX, p.mouseY));
          point.step = Math.round(force.mag()); // Store the magnitude of the launch
          point.vel = force.mult(0.02);

          // Determine the direction of launch
          let dragVector = p.createVector(p.mouseX, p.mouseY).sub(point.pos);
          point.type = dragVector.x > 0 ? "red" : "blue";
          currentColor = point.type === "red" ? p.color(255, 0, 0) : p.color(0, 0, 255); // Update color

          // Create a new ImageDoc
          const coordinate = `${Math.round(point.pos.x)},${Math.round(point.pos.y)}`;
          const stepString = point.step.toString(); // Convert step to string

          try {
            await createImageDoc(coordinate, point.type, stepString);
          } catch (error) {
            console.error("Error creating ImageDoc:", error);
          }
        }
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
      };
    });
  }
});
</script>

<template>
  <div ref="canvasContainer" class="canvas-wrapper"></div>
</template>

<style scoped>
.canvas-wrapper {
  width: 100vw;
  height: 100vh;
}
</style>

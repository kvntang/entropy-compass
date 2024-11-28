<!-- interactions:
 shift to pan
 drag to move
 command or control to zoom -->
<!-- step is actual pixel moved; PromptIndex is calculated from angle deviation from horizontal; coordinates is world coordinates -->
<!-- 10 degrees snapping implemented -->

<script setup lang="ts">
import p5 from "p5";
import { onMounted, onUnmounted, ref } from "vue";
import { fetchy } from "../../utils/fetchy";
import { getMovementDetails } from "./promptAngle.vue";

interface ImageDoc {
  author: string;
  coordinate: string; // stored as x, y
  prompt: string;
  type: string;
  step: string;
  originalImage: string;
  steppedImage: string;
  promptedImage: string;
}

const props = defineProps<{
  images: ImageDoc[];
}>();

console.log("Received images in child:", props.images);

const canvasContainer = ref(null);

/**
 * Create a new ImageDoc.
 *
 * @param coordinate - The coordinate of the image in the 2D canvas.
 * @param type - The type of the image ("noise" or "denoise").
 * @param step - The step of the image in the prompt.
 * @param promptIndex - The prompt index calculated from angle deviation.
 */
const createImageDoc = async (coordinate: string, type: string, step: string, promptIndex: number) => {
  try {
    const authorId = "mocked-author-id"; // Mocked user
    await fetchy("/api/images", "POST", {
      body: {
        author: authorId,
        coordinate,
        type,
        step,
        prompt: promptIndex.toString(),
        originalImage: "",
        steppedImage: "",
        promptedImage: "",
      },
    });
    console.log(`ImageDoc created successfully! Coordinate: ${coordinate}, Type: ${type}, Step: ${step}, Prompt Index: ${promptIndex}`);
  } catch (error) {
    console.error("Error creating ImageDoc:", error);
  }
};

onMounted(() => {
  if (canvasContainer.value) {
    const sketch = new p5((p) => {
      // Variables
      let point: any; // Represents the moving square
      let isDragging = false;
      let isPanning = false;
      let staticPositions: {
        pos: p5.Vector;
        color: p5.Color;
        type: string;
        step: number;
        promptIndex?: number;
      }[] = [];
      let currentColor: p5.Color;
      let initialPosition: p5.Vector;

      // Camera variables
      let camPos = p.createVector(0, 0); // Camera position for panning
      let scaleFactor = 1;
      const minScale = 0.5;
      const maxScale = 2;
      let translateX = 0;
      let translateY = 0;
      let panStartX = 0;
      let panStartY = 0;
      let panStartTranslateX = 0;
      let panStartTranslateY = 0;

      p.setup = () => {
        const canvasWidth = p.windowWidth - 40;
        const canvasHeight = p.windowHeight - 120;
        const canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent(canvasContainer.value);

        initialPosition = p.createVector(0, 0); // Start at (0, 0) in world coordinates
        camPos = initialPosition.copy(); // Center camera on initial position

        // Add initial position to staticPositions with blue color (denoise)
        staticPositions.push({
          pos: initialPosition.copy(),
          color: p.color(0, 0, 255), // Blue color for "denoise"
          type: "denoise",
          step: 0,
        });

        // Add any existing positions from props
        props.images.forEach((image) => {
          const [x, y] = image.coordinate.split(",").map(Number);
          let color: p5.Color;
          if (image.type === "noise") {
            color = p.color(255, 0, 0); // Red for "noise"
          } else if (image.type === "denoise") {
            color = p.color(0, 0, 255); // Blue for "denoise"
          } else {
            color = p.color(255); // Default color
          }
          staticPositions.push({
            pos: p.createVector(x, y),
            color,
            type: image.type,
            step: Number(image.step),
            promptIndex: Number(image.prompt),
          });
        });

        // Initialize point at the last position
        const lastPos = staticPositions[staticPositions.length - 1].pos;
        console.log(`Initial position: (${lastPos.x}, ${lastPos.y})`);
        point = {
          pos: lastPos.copy(),
          radius: 20,
          isMoving: false, // Flag to indicate movement towards final position
          finalPos: null, // Target position after move
          step: 0, // Original pixel length
          type: "", // "noise" or "denoise"
          promptIndex: 0, // Calculated from angle
        };
        currentColor = p.color(0, 0, 255); // Set initial color to blue (denoise)
      };

      /**
       * Convert mouse coordinates to world coordinates considering camera transformations.
       */
      function getMouseWorld() {
        return p.createVector((p.mouseX - p.width / 2 - translateX) / scaleFactor + camPos.x, (p.mouseY - p.height / 2 - translateY) / scaleFactor + camPos.y);
      }

      p.draw = () => {
        p.background(10);

        p.push();
        // Apply camera transformations
        p.translate(p.width / 2, p.height / 2);
        p.scale(scaleFactor);
        p.translate(translateX, translateY);

        // Draw all static positions
        staticPositions.forEach((sp) => {
          p.fill(sp.color);
          p.rectMode(p.CENTER);
          p.rect(sp.pos.x, sp.pos.y, point.radius * 2, point.radius * 2);
          p.fill(255);
          p.textAlign(p.CENTER, p.CENTER);
          // Display type or prompt index above the square
          if (sp.promptIndex !== undefined && sp.promptIndex > 0) {
            p.text(`${sp.type === "noise" ? "Noised" : "Denoised"} P${sp.promptIndex}`, sp.pos.x, sp.pos.y - point.radius - 10);
          } else {
            p.text(sp.type === "noise" ? "Noised" : "Denoised", sp.pos.x, sp.pos.y - point.radius - 10);
          }
        });

        // Draw the moving point when dragging or moving
        if (isDragging || point.isMoving) {
          p.fill(currentColor);
          p.rectMode(p.CENTER);
          p.rect(point.pos.x, point.pos.y, point.radius * 2, point.radius * 2);
        }

        // Dragging feedback
        if (isDragging) {
          const mouseWorld = getMouseWorld();
          const dragVector = p5.Vector.sub(mouseWorld, point.pos);
          const dragDistance = dragVector.mag();
          const dynamicRadius = Math.max(dragDistance, 50);

          // Draw original circle visualization
          p.stroke(100);
          p.noFill();
          p.ellipse(point.pos.x, point.pos.y, dynamicRadius * 2);

          // Draw horizontal reference line
          p.stroke(100, 100, 100);
          p.line(point.pos.x - dynamicRadius, point.pos.y, point.pos.x + dynamicRadius, point.pos.y);

          // Calculate angle from horizontal --------------------------------------------------------------------------------------------------------------
          let angleRadians = Math.atan2(dragVector.y, dragVector.x);
          let angleDegrees = p.degrees(angleRadians);

          // Snap angle to nearest 10 degrees
          let angleIncrement = 10;
          let snappedAngleDegrees = Math.round(angleDegrees / angleIncrement) * angleIncrement;

          // Normalize snappedAngleDegrees to be within 0-360
          if (snappedAngleDegrees >= 360) snappedAngleDegrees -= 360;
          if (snappedAngleDegrees < 0) snappedAngleDegrees += 360;

          let snappedAngleRadians = p.radians(snappedAngleDegrees);

          // The shooting direction should be opposite to the drag direction
          let direction = p.createVector(-Math.cos(snappedAngleRadians), -Math.sin(snappedAngleRadians));

          // Draw the launch line
          p.stroke(255);
          let lineEnd = p5.Vector.add(point.pos, direction.mult(dynamicRadius));
          p.line(point.pos.x, point.pos.y, lineEnd.x, lineEnd.y);

          // Draw the angle index
          const { promptIndex } = getMovementDetails(snappedAngleDegrees, angleIncrement);
          p.textSize(32);
          p.text(promptIndex, lineEnd.x, lineEnd.y);
        }

        p.pop();

        // Point movement towards final position
        if (point.isMoving) {
          let moveVector = p5.Vector.sub(point.finalPos, point.pos);
          let distance = moveVector.mag();
          let speed = 10; // Adjust speed as needed

          if (distance < speed) {
            // Close enough to final position
            point.pos = point.finalPos.copy();
            point.isMoving = false;
            // Add to static positions
            staticPositions.push({
              pos: point.pos.copy(),
              color: currentColor,
              type: point.type,
              step: point.step,
              promptIndex: point.promptIndex,
            });
          } else {
            moveVector.setMag(speed);
            point.pos.add(moveVector);
          }
        }
      };

      // Mouse interaction functions
      p.mousePressed = (event: MouseEvent) => {
        if (mouseInCanvas()) {
          if (p.keyIsDown(p.SHIFT)) {
            // Start panning
            isPanning = true;
            panStartX = p.mouseX;
            panStartY = p.mouseY;
            panStartTranslateX = translateX;
            panStartTranslateY = translateY;
          } else {
            // Start dragging
            if (!point.isMoving) {
              const mouseWorld = getMouseWorld();
              const lastPos = staticPositions[staticPositions.length - 1].pos;
              console.log(`Start position: (${lastPos.x}, ${lastPos.y})`);
              const d = p.dist(mouseWorld.x, mouseWorld.y, lastPos.x, lastPos.y);
              if (d < point.radius) {
                isDragging = true;
                point.pos = lastPos.copy();
              }
            }
          }
        }
      };

      p.mouseDragged = (event: MouseEvent) => {
        if (isPanning) {
          // Calculate the amount of movement
          let dx = (p.mouseX - panStartX) / scaleFactor;
          let dy = (p.mouseY - panStartY) / scaleFactor;

          // Update the translation
          translateX = panStartTranslateX + dx;
          translateY = panStartTranslateY + dy;

          // Prevent default dragging behavior within the canvas
          event.preventDefault();
        }
      };

      p.mouseReleased = async () => {
        if (isPanning) {
          isPanning = false;
        } else if (isDragging) {
          isDragging = false;

          const mouseWorld = getMouseWorld();
          const dragVector = p5.Vector.sub(mouseWorld, point.pos);

          // Calculate angle from horizontal
          let angleRadians = Math.atan2(dragVector.y, dragVector.x);
          let angleDegrees = p.degrees(angleRadians);

          // Snap angle to nearest 10 degrees
          let angleIncrement = 10;
          let snappedAngleDegrees = Math.round(angleDegrees / angleIncrement) * angleIncrement;

          // Normalize snappedAngleDegrees to be within 0-360
          if (snappedAngleDegrees >= 360) snappedAngleDegrees -= 360;
          if (snappedAngleDegrees < 0) snappedAngleDegrees += 360;

          // let snappedAngleRadians = p.radians(snappedAngleDegrees);

          // Determine type based on shooting direction
          const details = getMovementDetails(snappedAngleDegrees, angleIncrement);
          let type = "";
          let logMessage = "";
          let promptIndex = 0;

          type = details.type;
          currentColor = details.currentColor;
          promptIndex = details.promptIndex;

          logMessage = details.logMessage;
          console.log(logMessage);

          // Set the step as the magnitude of the drag vector
          let step = dragVector.mag();

          // Calculate movement direction (opposite to drag direction)
          let movementDirection = p.createVector(-Math.cos(p.radians(snappedAngleDegrees)), -Math.sin(p.radians(snappedAngleDegrees))).setMag(step);

          // Calculate final position
          let finalPos = p5.Vector.add(point.pos, movementDirection);

          // Assign final position and properties to point
          point.finalPos = finalPos.copy();
          point.type = type;
          point.promptIndex = promptIndex;
          point.step = step;
          point.isMoving = true;

          // Create ImageDoc in the backend
          const coordinate = `${Math.round(finalPos.x)},${Math.round(finalPos.y)}`;
          const stepString = step.toString();
          await createImageDoc(coordinate, point.type, stepString, point.promptIndex);

          // Log the action with promptIndex
          console.log(logMessage);
        }
      };

      p.mouseWheel = (event: WheelEvent) => {
        if (mouseInCanvas()) {
          // Check if Ctrl or Cmd key is pressed for zooming
          if (event.ctrlKey || event.metaKey) {
            // Zooming
            let zoomAmount = event.deltaY * -0.001;
            scaleFactor += zoomAmount;
            scaleFactor = p.constrain(scaleFactor, minScale, maxScale);

            // Adjust translateX and translateY to keep the focus on the mouse position
            let mouseXWorld = (p.mouseX - translateX - p.width / 2) / scaleFactor;
            let mouseYWorld = (p.mouseY - translateY - p.height / 2) / scaleFactor;
            translateX -= mouseXWorld * zoomAmount;
            translateY -= mouseYWorld * zoomAmount;

            // Prevent default zooming behavior
            event.preventDefault();
          }
        }
      };

      p.windowResized = () => {
        const canvasWidth = p.windowWidth - 40;
        const canvasHeight = p.windowHeight - 120;
        p.resizeCanvas(canvasWidth, canvasHeight);
      };

      function mouseInCanvas() {
        return p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height;
      }
    });

    // Cleanup p5 instance on component unmount
    onUnmounted(() => {
      sketch.remove();
    });
  }
});
</script>

<template>
  <div ref="canvasContainer" class="canvas-container"></div>
</template>

<style scoped>
.canvas-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 20px;
  padding: 20px;
  background: #2e2e2e;
  border-radius: 10px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

canvas {
  display: block;
}
</style>

<!-- oneDCanvasComponent_1.vue -->
<!-- interactions:
 shift to pan
 drag to move
 command or control to zoom -->
<!-- step is horizontal distance; promptIndex is vertical drag distance; 
  refactoredstep can be used for 2d pixel distance and promptIndex can be for angle? -->
<!-- scaling factor step to 2d distance: *80 = 2d distance?? THIS NEEDS TO BE FIXED!! -->
<!-- currently the coordinates is not quick correct -->

<script setup lang="ts">
import p5 from "p5";
import { onMounted, onUnmounted, ref } from "vue";
import { fetchy } from "../../utils/fetchy";

interface ImageDoc {
  author: string;
  parent: string; // Parent ImageDoc ID
  coordinate: string; // stored as x, y
  prompt: string;
  type: string;
  step: string;
  originalImage: string;
  steppedImage: string;
  promptedImage: string;
  _id: string;
}

const props = defineProps<{
  images: ImageDoc[];
}>();

const emit = defineEmits(["refreshImages"]);

const canvasContainer = ref(null);

// Function to create ImageDoc in the backend
const createImageDoc = async (parentId: string, coordinate: string, type: string, step: string, promptIndex: number) => {
  try {
    const authorId = "mocked-author-id"; // Mocked user
    const response = await fetchy("/api/images", "POST", {
      body: {
        author: authorId,
        parent: parentId,
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
    emit("refreshImages"); // Let the parent know to refresh the images
  } catch (error) {
    console.error("Error creating ImageDoc:", error);
  }
};

//--------------------------------------------------------------------------------------------------------------

onMounted(() => {
  if (canvasContainer.value) {
    const sketch = new p5((p) => {
      // Variables
      interface Image {
        x: number;
        y: number;
        alpha: number;
        isNoisy: boolean;
        promptIndex: number; // Represents the prompt index
        isAnimating: boolean;
        currentY: number;
        startY?: number;
        targetY?: number;
        animationStartTime?: number;
        animationDuration?: number;
        step: number; // Record the step
        refactoredstep: number; // New property for step * 80
      }

      let images: Image[] = [];
      let isDragging = false;
      let isPanning = false;
      let dragStartX = 0;
      let dragStartY = 0;
      let panStartX = 0;
      let panStartY = 0;
      let panStartTranslateX = 0;
      let panStartTranslateY = 0;
      const gridSize = 40;
      const padding = 0;
      const stepDistance = 35;

      // Zoom and pan
      let scaleFactor = 1;
      const minScale = 0.5;
      const maxScale = 2;
      let translateX = 0;
      let translateY = 0;

      function calculateInitialPosition(canvasWidth: number, canvasHeight: number) {
        // Calculate grid dimensions
        const gridColumns = Math.floor(canvasWidth / (gridSize + padding));
        const gridRows = Math.floor(canvasHeight / (gridSize + padding));

        // Position the initial square near the center-top of the grid
        const centerColumnIndex = Math.floor(gridColumns / 2);
        const topRowIndex = 1; // Second row from the top

        const initialX = centerColumnIndex * (gridSize + padding);
        const initialY = topRowIndex * (gridSize + padding);

        return { initialX, initialY };
      }

      p.setup = () => {
        // Adjust the canvas size to fit within the window canvas
        const canvasWidth = p.windowWidth - 40;
        const canvasHeight = p.windowHeight - 120;
        const canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent(canvasContainer.value);

        // Calculate initial position based on grid
        const { initialX, initialY } = calculateInitialPosition(canvasWidth, canvasHeight);

        // Add initial image
        if (props.images.length === 0) {
          try {
            const initialStep = 0; // Set to 0 since no step has been taken
            const initialRefactoredStep = initialStep * 80; // 0 * 80 = 0 -----------------------------------------------------
            const initialImage: Image = {
              x: initialX,
              y: initialY,
              alpha: 255,
              isNoisy: false,
              promptIndex: 0,
              isAnimating: false,
              currentY: initialY,
              step: initialStep,
              refactoredstep: initialRefactoredStep, // Set refactoredstep to 0
            };
            images.push(initialImage);

            // **Log the initial image's information**
            console.log("Initial Image Created:", initialImage);
          } catch (error) {
            console.error("Error creating initial ImageDoc:", error);
          }
        }

        // **Do NOT create ImageDoc for the initial image**
        // Removed the following lines:
        /*
         const coordinate = `${Math.round(initialImage.x)},${Math.round(initialImage.y)}`;
         const type = initialImage.isNoisy ? "noise" : "denoise";
         const stepString = initialImage.step.toString();
         const refactoredStepString = initialImage.refactoredstep.toString();
         createImageDoc(
           coordinate,
           type,
           stepString,
           initialImage.promptIndex,
           refactoredStepString
         );
         */
      };

      p.draw = () => {
        p.background(20);

        p.push();
        p.scale(scaleFactor);
        p.translate(translateX, translateY);

        // Draw grid lines
        p.stroke(50);
        p.strokeWeight(1 / scaleFactor);
        for (let x = 0; x <= p.width / scaleFactor; x += gridSize + padding) {
          p.line(x, 0, x, p.height / scaleFactor);
        }
        for (let y = 0; y <= p.height / scaleFactor; y += gridSize + padding) {
          p.line(0, y, p.width / scaleFactor, y);
        }

        // Draw images
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(14 / scaleFactor);
        p.noStroke();
        for (let img of images) {
          // Handle elastic animation
          if (img.isAnimating) {
            let t = img.animationStartTime ? (p.millis() - img.animationStartTime) / (img.animationDuration || 1) : 0;
            t = p.constrain(t, 0, 1);
            let easeT = easeOutElastic(t);

            img.currentY = p.lerp(img.startY || img.y, img.targetY || img.y, easeT);

            if (t >= 1) {
              img.isAnimating = false;
              if (img.targetY !== undefined) {
                img.y = img.targetY;
              }
              img.currentY = img.targetY !== undefined ? img.targetY : img.currentY;
            }
          } else {
            img.currentY = img.y;
          }

          p.fill(img.isNoisy ? p.color(255, 0, 0, img.alpha) : p.color(0, 0, 255, img.alpha));
          p.rect(img.x, img.currentY, gridSize, gridSize);

          // Display the prompt index on top of the image
          p.fill(255);
          p.text(img.promptIndex, img.x + gridSize / 2, img.currentY + gridSize / 2);
        }

        // Draw drag preview
        if (isDragging) {
          // Adjust mouse coordinates for scaling and translation
          let mouseXWorld = (p.mouseX - translateX) / scaleFactor;
          let mouseYWorld = (p.mouseY - translateY) / scaleFactor;
          let dragStartXWorld = (dragStartX - translateX) / scaleFactor;
          let dragStartYWorld = (dragStartY - translateY) / scaleFactor;

          let dragDistanceX = mouseXWorld - dragStartXWorld;
          let dragDistanceY = mouseYWorld - dragStartYWorld;

          let lastImage = images[images.length - 1];

          if (Math.abs(dragDistanceY) > Math.abs(dragDistanceX) && dragDistanceY > 0) {
            // Vertical dragging (editing prompt index)
            let lineX = lastImage.x + gridSize / 2;
            let lineStartY = lastImage.y + gridSize / 2;

            // Draw drag line centered on the square
            p.stroke(255);
            p.strokeWeight(2 / scaleFactor);
            p.line(lineX, lineStartY, lineX, mouseYWorld);

            // Calculate prompt steps (number of grid units dragged)
            let promptSteps = Math.floor((mouseYWorld - lineStartY) / (gridSize + padding));
            promptSteps = Math.max(1, promptSteps); // Ensure at least one step

            // Draw drag preview as an outline rectangle
            p.noFill(); // Remove fill
            p.stroke(lastImage.isNoisy ? p.color(255, 0, 0) : p.color(0, 0, 255)); // Set stroke color based on state
            p.strokeWeight(1 / scaleFactor); // Consistent stroke weight
            p.rect(lastImage.x, lastImage.y + dragDistanceY, gridSize, gridSize);

            // Display prompt index (set based on current promptSteps)
            p.fill(255);
            p.text(promptSteps, lastImage.x + gridSize / 2, lastImage.y + dragDistanceY + gridSize / 2);
          } else if (Math.abs(dragDistanceX) > 0) {
            // Horizontal dragging (noise/denoise)
            let steps = Math.floor(Math.abs(dragDistanceX) / stepDistance);
            let direction = dragDistanceX < 0 ? "noise" : "denoise";

            // Centered drag line
            let lineX = lastImage.x + gridSize / 2;
            let lineY = lastImage.y + gridSize / 2;

            // Draw preview line centered on the square
            p.stroke(255);
            p.strokeWeight(2 / scaleFactor);
            p.line(lineX, lineY, mouseXWorld, lineY);

            // Draw preview square
            p.noFill();
            p.stroke(dragDistanceX < 0 ? p.color(255, 0, 0) : p.color(0, 0, 255));
            p.strokeWeight(1 / scaleFactor);
            let previewX = lastImage.x;
            if (direction === "noise") {
              previewX = Math.max(padding, lastImage.x - steps * (gridSize + padding));
            } else {
              previewX = lastImage.x + steps * (gridSize + padding);
            }
            p.rect(previewX, lastImage.y, gridSize, gridSize);

            // Display prompt index on preview
            p.fill(255);
            p.text(lastImage.promptIndex, previewX + gridSize / 2, lastImage.y + gridSize / 2);
          }
        }

        p.pop();
      };

      // Mouse interaction functions
      p.mousePressed = (event: MouseEvent) => {
        // Only start interactions if the mouse is within the canvas
        if (mouseInCanvas()) {
          // Prevent default behavior only within the canvas
          event.preventDefault();

          if (p.keyIsDown(p.SHIFT)) {
            // Start panning
            isPanning = true;
            panStartX = p.mouseX;
            panStartY = p.mouseY;
            panStartTranslateX = translateX;
            panStartTranslateY = translateY;
          } else {
            // Start dragging
            dragStartX = p.mouseX;
            dragStartY = p.mouseY;
            isDragging = true;
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
          // Adjust mouse coordinates for scaling and translation
          let mouseXWorld = (p.mouseX - translateX) / scaleFactor;
          let mouseYWorld = (p.mouseY - translateY) / scaleFactor;
          let dragStartXWorld = (dragStartX - translateX) / scaleFactor;
          let dragStartYWorld = (dragStartY - translateY) / scaleFactor;

          let dragDistanceX = mouseXWorld - dragStartXWorld;
          let dragDistanceY = mouseYWorld - dragStartYWorld;

          // Set isDragging to false early to prevent drag preview from rendering
          isDragging = false;

          if (Math.abs(dragDistanceY) > Math.abs(dragDistanceX) && dragDistanceY > 0) {
            // Vertical dragging (editing prompt index)
            let lastImage = images[images.length - 1];

            // Calculate prompt steps based on drag distance
            let lineStartY = lastImage.y + gridSize / 2;
            let promptSteps = Math.floor((mouseYWorld - lineStartY) / (gridSize + padding));
            promptSteps = Math.max(1, promptSteps); // Ensure at least one step

            // The image snaps back to just the next row
            let targetY = lastImage.y + gridSize + padding;

            // **Keep step and refactoredstep same as last image**
            let newStep = lastImage.step; // Same as previous image
            let newRefactoredStep = lastImage.refactoredstep; // Same as previous image

            // Create new image state with elastic animation
            let newImage: Image = {
              x: lastImage.x,
              y: lastImage.y,
              alpha: 255,
              isNoisy: lastImage.isNoisy,
              promptIndex: promptSteps, // Updated promptIndex based on drag
              isAnimating: true,
              startY: lastImage.y + dragDistanceY,
              targetY: targetY,
              animationStartTime: p.millis(),
              animationDuration: 500,
              currentY: lastImage.y + dragDistanceY,
              step: newStep, // Same as previous
              refactoredstep: newRefactoredStep, // Same as previous
            };

            images.push(newImage);

            // Fade older images
            for (let img of images) {
              if (img !== newImage) {
                img.alpha = Math.max(100, img.alpha - 20);
              }
            }

            // Create ImageDoc in the backend
            const coordinate = `${Math.round(newImage.x)},${Math.round(newImage.y)}`;
            const type = newImage.isNoisy ? "noise" : "denoise";
            const stepString = newImage.step.toString();
            const refactoredStepString = newImage.refactoredstep.toString(); // Convert to string
            await createImageDoc(coordinate, type, stepString, newImage.promptIndex, refactoredStepString);
          } else if (Math.abs(dragDistanceX) > 0) {
            // Horizontal dragging (noise/denoise)
            let steps = Math.floor(Math.abs(dragDistanceX) / stepDistance);

            if (steps > 0) {
              let lastImage = images[images.length - 1];
              let newX = lastImage.x;
              let isNoisy = dragDistanceX < 0;

              if (dragDistanceX < 0) {
                // Add noise (move left)
                newX = Math.max(padding, lastImage.x - steps * (gridSize + padding));
              } else {
                // Denoise (move right)
                newX = lastImage.x + steps * (gridSize + padding);
              }

              // **Calculate refactoredstep**
              let refactoredstep = steps * 80; // New calculation -----------------------------------------------------

              // Add new image state
              let newImage: Image = {
                x: newX,
                y: lastImage.y,
                alpha: 255,
                isNoisy: isNoisy,
                promptIndex: lastImage.promptIndex, // Keep existing promptIndex
                isAnimating: false,
                currentY: lastImage.y,
                step: steps, // Record the step as the number of steps moved
                refactoredstep: refactoredstep, // Set refactoredstep
              };

              images.push(newImage);

              // Fade older images
              for (let img of images) {
                if (img !== newImage) {
                  img.alpha = Math.max(100, img.alpha - 20);
                }
              }

              // Create ImageDoc in the backend
              const coordinate = `${Math.round(newImage.x)},${Math.round(newImage.y)}`;
              const type = newImage.isNoisy ? "noise" : "denoise";
              const stepString = newImage.step.toString();
              const refactoredStepString = newImage.refactoredstep.toString(); // Convert to string
              await createImageDoc(coordinate, type, stepString, newImage.promptIndex, refactoredStepString);
            }
          }
          isDragging = false;
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
            let mouseXWorld = (p.mouseX - translateX) / scaleFactor;
            let mouseYWorld = (p.mouseY - translateY) / scaleFactor;
            translateX -= mouseXWorld * zoomAmount;
            translateY -= mouseYWorld * zoomAmount;

            // Prevent default zooming behavior
            event.preventDefault();
          }
        }
      };

      p.windowResized = () => {
        // Adjust the canvas size on window resize
        const canvasWidth = p.windowWidth - 40;
        const canvasHeight = p.windowHeight - 120;
        p.resizeCanvas(canvasWidth, canvasHeight);

        // Recalculate and update the initial square position
        const { initialX, initialY } = calculateInitialPosition(canvasWidth, canvasHeight);

        if (images.length > 0) {
          images[0].x = initialX;
          images[0].y = initialY;
          images[0].currentY = initialY;
        }
      };

      function mouseInCanvas() {
        // Since p.mouseX and p.mouseY are relative to the canvas, and the canvas is in the container, we can use them directly
        return p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height;
      }

      // Easing function for elastic effect
      function easeOutElastic(t: number) {
        const c4 = (2 * Math.PI) / 3;

        if (t === 0) return 0;
        if (t === 1) return 1;
        return Math.pow(2, -10 * t) * p.sin((t * 10 - 0.75) * c4) + 1;
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

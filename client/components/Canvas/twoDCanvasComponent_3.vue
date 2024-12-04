<template>
  <div ref="canvasContainer" class="canvas-container"></div>
</template>

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

/**
 * Create a new ImageDoc.
 *
 * @param parentId - The ID of the parent ImageDoc.
 * @param coordinate - The coordinate of the image in the 2D canvas.
 * @param type - The type of the image ("noise" or "denoise").
 * @param step - The step of the image in the prompt.
 * @param promptIndex - The prompt index calculated from angle deviation.
 * @returns The created ImageDoc's data.
 */
const createImageDoc = async (parentId: string, coordinate: string, type: string, step: string, promptIndex: number): Promise<ImageDoc | null> => {
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
    return response as ImageDoc; // Return the created ImageDoc
  } catch (error) {
    console.error("Error creating ImageDoc:", error);
    return null;
  }
};

/**
 * Function to set the index logic.
 * The type determines the ordering of the index, which will be mapped to the similarity of the prompted word.
 */
function getPromptIndex(type: string, snappedAngleDegrees: number) {
  let promptIndex = 0;

  if (type === "noise") {
    if (snappedAngleDegrees === 0) {
      promptIndex = 0;
    } else if (snappedAngleDegrees > 0 && snappedAngleDegrees <= 180) {
      // Upper circle
      promptIndex = Math.ceil(snappedAngleDegrees / 10) * 2 - 1; // Converts 10° to 1, 20° to 3, etc.
    } else if (snappedAngleDegrees > 180) {
      // Lower circle
      promptIndex = Math.ceil((360 - snappedAngleDegrees) / 10) * 2;
    }
  } else if (type === "denoise") {
    if (snappedAngleDegrees === 180) {
      promptIndex = 0;
    } else if (snappedAngleDegrees < 180) {
      // Upper circle
      promptIndex = Math.ceil((180 - snappedAngleDegrees) / 10) * 2 - 1;
    } else if (snappedAngleDegrees > 180) {
      // Lower circle
      promptIndex = Math.ceil((snappedAngleDegrees - 180) / 10) * 2;
    }
  }

  // Return the calculated promptIndex
  return { promptIndex: Math.floor(promptIndex) };
}

//--------------------------------------------------------------------------------------------------------------

onMounted(() => {
  if (canvasContainer.value) {
    const sketch = new p5((p) => {
      // Variables
      let point: any; // Represents the moving square (for shooting)
      let isDraggingNew = false; // Flag for dragging to create new ImageDoc
      let isPanning = false;

      let staticPositions: {
        pos: p5.Vector;
        color: p5.Color;
        type: string;
        step: number;
        promptIndex?: number;
        _id?: string;
        parent_id?: string;
      }[] = [];

      let currentColor: p5.Color;
      let initialPosition: p5.Vector;
      let initialDragDirection: "right" | "left" | null = null; // Determines noise or denoise

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

      // Selected parent ID for creating new ImageDocs
      let selectedParentId: string | null = null;

      //-------------------SETUP----------------------------------------------------------------------------
      p.setup = async () => {
        const canvasWidth = p.windowWidth - 40;
        const canvasHeight = p.windowHeight - 120;
        const canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent(canvasContainer.value);

        ///1. Initialize the first ImageDoc if staticPositions is empty
        // Initival Vector
        initialPosition = p.createVector(0, 0); // Start at (0, 0) in world coordinates
        camPos = initialPosition.copy(); // Center camera on initial position

        // Create New
        if (props.images.length === 0) {
          const coordinate = `${Math.round(initialPosition.x)},${Math.round(initialPosition.y)}`;
          try {
            // Create the initial ImageDoc
            const createdImageDoc = await createImageDoc(
              "", // Parent ID is empty for the root node
              coordinate,
              "denoise", // Initial type is "denoise"
              "0", // Step is 0 for the root node
              0, // Prompt index is 0 for the root node
            );

            if (createdImageDoc) {
              // Push it to staticPositions with blue color (denoise)
              staticPositions.push({
                pos: initialPosition.copy(),
                color: p.color(0, 0, 255), // Blue color for "denoise"
                type: "denoise",
                step: 0,
                promptIndex: 0,
                _id: createdImageDoc._id, // Use the response ID from the API
                parent_id: undefined, // No parent for the initial node
              });

              // Set the initial parent to the created ImageDoc
              selectedParentId = createdImageDoc._id;
              console.log("Initial ImageDoc created and added to static positions.", `Parent ID set to: ${selectedParentId}`);
            }
          } catch (error) {
            console.error("Error creating initial ImageDoc:", error);
          }
        } else {
          // 2. Load database initial static positions from props
          props.images.forEach((image) => {
            const [x, y] = image.coordinate.split(",").map(Number);

            let color: p5.Color = image.type === "noise" ? p.color(255, 0, 0) : p.color(0, 0, 255); // Red for noise, blue for denoise

            // populate list
            staticPositions.push({
              pos: p.createVector(x, y),
              color,
              type: image.type,
              step: Number(image.step),
              promptIndex: Number(image.prompt),
              _id: image._id,
              parent_id: image.parent,
            });
          });

          // // Automatically select the last image as the parent
          // if (props.images.length > 0) {
          //   selectedParentId = props.images[props.images.length - 1]._id;
          //   console.log(`Selected parent ID set to: ${selectedParentId}`);
          // }
        }

        // Initialize point at the selected parent's position
        const parentPos = getSelectedParentPosition();
        point = {
          pos: parentPos.copy(),
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

      //-------------------DRAW----------------------------------------------------------------------------
      p.draw = () => {
        p.background(10);

        p.push();
        // Apply camera transformations
        p.translate(p.width / 2, p.height / 2);
        p.scale(scaleFactor);
        p.translate(translateX, translateY);

        // Draw lines based on parent-child relationships
        const idToPosition: { [key: string]: p5.Vector } = {};
        staticPositions.forEach((sp) => {
          if (sp._id) idToPosition[sp._id] = sp.pos;
        });

        staticPositions.forEach((sp) => {
          if (sp.parent_id && idToPosition[sp.parent_id]) {
            const parentPos = idToPosition[sp.parent_id];

            // Draw the connecting line
            p.stroke(150);
            p.line(parentPos.x, parentPos.y, sp.pos.x, sp.pos.y);

            // Calculate the midpoint
            const midX = (parentPos.x + sp.pos.x) / 2;
            const midY = (parentPos.y + sp.pos.y) / 2;

            // Render the promptIndex at the midpoint
            p.noStroke();
            p.fill(255); // Text color
            p.textAlign(p.CENTER, p.CENTER);
            p.text(sp.promptIndex, midX, midY);
          }
        });

        // Draw all static positions
        staticPositions.forEach((sp) => {
          p.push();
          p.fill(sp.color);
          p.stroke(sp._id === selectedParentId ? 255 : 0, sp._id === selectedParentId ? 255 : 0, 0, sp._id === selectedParentId ? 255 : 0); // Highlight selected parent
          p.strokeWeight(sp._id === selectedParentId ? 2 : 1);
          p.rectMode(p.CENTER);
          p.rect(sp.pos.x, sp.pos.y, 40, 40);
          p.pop();

          p.fill(255);
          p.textAlign(p.CENTER, p.CENTER);
          // Display objectID and type/prompt index above the square
          if (sp.promptIndex !== undefined && sp.promptIndex > 0) {
            p.text(sp._id, sp.pos.x, sp.pos.y - 30); /* Display objectID */
            p.text(`${sp.type === "noise" ? "Noised" : "Denoised"} P${sp.promptIndex}`, sp.pos.x, sp.pos.y - 20);
          } else {
            p.text(sp._id, sp.pos.x, sp.pos.y - 30); /* Display objectID */
            p.text(sp.type === "noise" ? "Noised" : "Denoised", sp.pos.x, sp.pos.y - 20);
          }
        });

        // Draw the moving point when dragging or moving
        if (isDraggingNew || point.isMoving) {
          p.fill(currentColor);
          p.stroke(255);
          p.rectMode(p.CENTER);
          p.rect(point.pos.x, point.pos.y, 40, 40);
        }

        // Dragging feedback for creating new ImageDoc
        if (isDraggingNew) {
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

          // Calculate angle from horizontal
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
          let direction = p.createVector(-Math.cos(snappedAngleRadians), -Math.sin(snappedAngleRadians)).mult(dynamicRadius);

          // Draw the launch line
          p.stroke(255);
          let lineEnd = p5.Vector.add(point.pos, direction);
          p.line(point.pos.x, point.pos.y, lineEnd.x, lineEnd.y);

          p.stroke(0);
          p.fill(255);
          p.textSize(32);

          // Draw launch type
          p.text(point.type, point.pos.x, point.pos.y);

          // Draw the angle index
          const { promptIndex } = getPromptIndex(point.type, snappedAngleDegrees);
          p.text(promptIndex, lineEnd.x, lineEnd.y);
          p.textSize(14);
          p.text("Pick a prompt! The lower the number, \n the more similar to the original prompt.", point.pos.x, point.pos.y - dynamicRadius - 30);
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

            // Add to static positions with the actual _id from the created ImageDoc
            // Assuming that the ImageDoc has been created and props.images have been refreshed
            // Find the newly created ImageDoc based on coordinates
            const newImage = props.images.find((img) => img.coordinate === `${Math.round(point.pos.x)},${Math.round(point.pos.y)}`);

            if (newImage) {
              staticPositions.push({
                pos: p.createVector(point.pos.x, point.pos.y),
                color: newImage.type === "noise" ? p.color(255, 0, 0) : p.color(0, 0, 255),
                type: newImage.type,
                step: Number(newImage.step),
                promptIndex: Number(newImage.prompt),
                _id: newImage._id,
                parent_id: newImage.parent,
              });

              // Automatically select the new ImageDoc as the parent
              selectedParentId = newImage._id;
              console.log(`New parent selected: ${selectedParentId}`);
            } else {
              console.error("New ImageDoc not found in props.images. Ensure that 'refreshImages' emits correctly.");
            }
          } else {
            moveVector.setMag(speed);
            point.pos.add(moveVector);
          }
        }
      };

      // Mouse interaction functions
      p.mousePressed = (event: MouseEvent) => {
        if (mouseInCanvas()) {
          // Check if clicking on the selected parent box to shoot
          const selectedParent = staticPositions.find((sp) => sp._id === selectedParentId);
          if (selectedParent) {
            const parentScreenPos = screenPos(selectedParent.pos);
            const distance = p.dist(p.mouseX, p.mouseY, parentScreenPos.x, parentScreenPos.y);
            if (distance < 20 * scaleFactor) {
              // Start shooting
              isDraggingNew = true;
              point.pos = selectedParent.pos.copy();
              console.log(`Started shooting from parent ID: ${selectedParentId}`);
            }
          }

          if (p.keyIsDown(p.SHIFT)) {
            // Start panning
            isPanning = true;
            panStartX = p.mouseX;
            panStartY = p.mouseY;
            panStartTranslateX = translateX;
            panStartTranslateY = translateY;
            console.log("Started panning");
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

        // Dragging to create new ImageDoc
        if (isDraggingNew) {
          const mouseWorld = getMouseWorld();
          const dragVector = p5.Vector.sub(mouseWorld, point.pos);

          // Determine type based on shooting direction
          // Lock the initial drag direction based on the horizontal movement
          if (!initialDragDirection) {
            if (dragVector.x > 20) {
              initialDragDirection = "right";
              currentColor = p.color(255, 0, 0); // Red for noise
              point.type = "noise";
              console.log("Shooting type set to 'noise'");
            } else if (dragVector.x < -20) {
              initialDragDirection = "left";
              currentColor = p.color(0, 0, 255); // Blue for denoise
              point.type = "denoise";
              console.log("Shooting type set to 'denoise'");
            }
          }
        }
      };

      p.mouseReleased = async () => {
        if (isPanning) {
          isPanning = false;
          console.log("Stopped panning");
        }

        // Finish dragging to create new ImageDoc
        if (isDraggingNew) {
          isDraggingNew = false;

          // Use the locked initial drag direction to finalize the type
          const type = initialDragDirection === "right" ? "noise" : "denoise";
          point.type = type;

          // Reset drag direction for the next drag
          initialDragDirection = null;

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

          let finalPromptIndex = 0;

          // Set color of latest box
          if (point.type == "denoise") {
            currentColor = p.color(0, 0, 255); // blue "denoise"
          } else {
            currentColor = p.color(255, 0, 0); // Red for "noise"
          }

          // Set the step as the magnitude of the drag vector
          let step = dragVector.mag();

          // Calculate movement direction (opposite to drag direction)
          let movementDirection = p.createVector(-Math.cos(p.radians(snappedAngleDegrees)), -Math.sin(p.radians(snappedAngleDegrees))).setMag(step);

          // Calculate final position
          let finalPos = p5.Vector.add(point.pos, movementDirection);

          // Assign final position and properties to point
          point.finalPos = finalPos.copy();
          const { promptIndex } = getPromptIndex(point.type, snappedAngleDegrees);
          finalPromptIndex = promptIndex;
          point.promptIndex = finalPromptIndex;
          point.step = step;
          point.isMoving = true;

          // Create ImageDoc in the backend
          const coordinate = `${Math.round(finalPos.x)},${Math.round(finalPos.y)}`;
          const stepString = step.toString();

          const parentId = selectedParentId;

          if (!parentId) {
            console.error("Parent ID is undefined. Skipping ImageDoc creation.");
            return;
          }

          console.log(`Parent ID is: ${parentId}`);

          const createdImageDoc = await createImageDoc(parentId, coordinate, point.type, stepString, point.promptIndex);

          if (!createdImageDoc) {
            console.error("Failed to create new ImageDoc.");
            return;
          }

          // The new ImageDoc will be added to staticPositions in the draw loop
          // and the parent will be updated automatically
        }
      };

      p.doubleClicked = () => {
        if (mouseInCanvas()) {
          let clickedBox = null;
          for (let i = staticPositions.length - 1; i >= 0; i--) {
            const sp = staticPositions[i];
            const screenPosition = screenPos(sp.pos);
            if (p.dist(p.mouseX, p.mouseY, screenPosition.x, screenPosition.y) < 20 * scaleFactor) {
              clickedBox = sp;
              break;
            }
          }

          if (clickedBox) {
            selectedParentId = clickedBox._id ?? null;
            console.log(`Selected parent ID: ${selectedParentId}`);
          }
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

      /**
       * Get the screen position of a world coordinate
       */
      function screenPos(worldPos: p5.Vector) {
        let x = (worldPos.x + translateX) * scaleFactor + p.width / 2;
        let y = (worldPos.y + translateY) * scaleFactor + p.height / 2;
        return { x, y };
      }

      /**
       * Get the position of the currently selected parent.
       */
      function getSelectedParentPosition(): p5.Vector {
        const parent = staticPositions.find((sp) => sp._id === selectedParentId);
        return parent ? parent.pos.copy() : initialPosition.copy();
      }
    });

    // Cleanup p5 instance on component unmount
    onUnmounted(() => {
      sketch.remove();
    });
  }
});
</script>

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

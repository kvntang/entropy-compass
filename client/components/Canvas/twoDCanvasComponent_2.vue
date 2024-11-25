<!-- interactions: 
 shift to pan
 drag to move
 command or control to zoom -->

<script setup lang="ts">
import p5 from "p5";
import { onMounted, onUnmounted, ref } from "vue";
import { fetchy } from "../../utils/fetchy";

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

const createImageDoc = async (coordinate: string, type: string, step: string) => {
  try {
    const authorId = "mocked-author-id"; // Mocked user
    await fetchy("/api/images", "POST", {
      body: {
        author: authorId,
        coordinate,
        type,
        step,
        prompt: "",
        originalImage: "",
        steppedImage: "",
        promptedImage: "",
      },
    });
    console.log(
      `ImageDoc created successfully! Coordinate: ${coordinate}, Type: ${type}, Step: ${step}`
    );
  } catch (error) {
    console.error("Error creating ImageDoc:", error);
  }
};

onMounted(() => {
  if (canvasContainer.value) {
    const sketch = new p5((p) => {
      let point: any;
      let isDragging = false;
      let isPanning = false;
      let launchDirection: p5.Vector;
      let staticPositions: { pos: p5.Vector; color: p5.Color; type: string; step: number }[] = [];
      let currentColor: p5.Color;
      let initialPosition: p5.Vector;

      let canvasWidth = 0;
      let canvasHeight = 0;

      // Camera variables
      let camPos = p.createVector(0, 0);
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
        canvasWidth = p.windowWidth - 40;
        canvasHeight = p.windowHeight - 120;
        const canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent(canvasContainer.value);

        initialPosition = p.createVector(0, 0); // Start at (0, 0) in world coordinates
        camPos = initialPosition.copy(); // Center camera on initial position

        // Add initial position to staticPositions with blue color
        staticPositions.push({
          pos: initialPosition.copy(),
          color: p.color(0, 0, 255), // Changed to blue
          type: "blue",
          step: 0,
        });

        // Add any existing positions from props
        props.images.forEach((image) => {
          const [x, y] = image.coordinate.split(",").map(Number);
          const color = image.type === "red" ? p.color(255, 0, 0) : p.color(0, 0, 255);
          staticPositions.push({ pos: p.createVector(x, y), color, type: image.type, step: 0 });
        });

        // Initialize point at the last position
        const lastPos = staticPositions[staticPositions.length - 1].pos;
        point = {
          pos: lastPos.copy(),
          radius: 20,
          vel: p.createVector(0, 0),
          isFlying: false,
          type: "blue",
          step: 0,
        };
        currentColor = p.color(0, 0, 255); // Set initial color to blue
        launchDirection = p.createVector(0, 0);
      };

      function getMouseWorld() {
        return p.createVector(
          (p.mouseX - p.width / 2 - translateX) / scaleFactor + camPos.x,
          (p.mouseY - p.height / 2 - translateY) / scaleFactor + camPos.y
        );
      };

      p.draw = () => {
        p.background(10);

        p.push();
        // Apply camera transformations
        p.translate(p.width / 2, p.height / 2);
        p.scale(scaleFactor);
        p.translate(translateX, translateY);

        // Draw all static positions
        staticPositions.forEach((sp, index) => {
          p.fill(sp.color);
          p.rectMode(p.CENTER);
          p.rect(sp.pos.x, sp.pos.y, point.radius * 2, point.radius * 2);
          p.fill(255);
          p.textAlign(p.CENTER, p.CENTER);
          p.text(index, sp.pos.x, sp.pos.y - point.radius - 10);
        });

        // Only draw the moving point when it's being dragged or flying
        if (isDragging || point.isFlying) {
          p.fill(currentColor);
          p.rectMode(p.CENTER);
          p.rect(point.pos.x, point.pos.y, point.radius * 2, point.radius * 2);
        }

        // Dragging feedback
        if (isDragging) {
          const mouseWorld = getMouseWorld();
          const dragDistance = p.dist(mouseWorld.x, mouseWorld.y, point.pos.x, point.pos.y);
          const dynamicRadius = Math.max(dragDistance, 50);
          p.stroke(100);
          p.noFill();
          p.ellipse(point.pos.x, point.pos.y, dynamicRadius * 2);
          launchDirection = p.createVector(point.pos.x, point.pos.y)
            .sub(mouseWorld)
            .normalize()
            .mult(dynamicRadius);
          p.stroke(255);
          p.line(
            point.pos.x,
            point.pos.y,
            point.pos.x + launchDirection.x,
            point.pos.y + launchDirection.y
          );
        }

        p.pop();

        // Point movement
        if (point.isFlying) {
          point.pos.add(point.vel);
          point.vel.mult(0.98); // Friction
          if (point.vel.mag() < 0.01) {
            point.vel.set(0, 0);
            point.isFlying = false;
            staticPositions.push({
              pos: point.pos.copy(),
              color: currentColor,
              type: point.type,
              step: point.step,
            });
            // Update point position to the new static position
            point.pos = point.pos.copy();
          }
        }
      };

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
            if (!point.isFlying) {
              const mouseWorld = getMouseWorld();
              const lastPos = staticPositions[staticPositions.length - 1].pos;
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
          point.isFlying = true;
          const mouseWorld = getMouseWorld();
          const force = p5.Vector.sub(point.pos, mouseWorld);
          // arbitrarily decrease point step - divided by 50!
          point.step = Math.round(force.mag() / 50);
          // if point.step is less than 1, set it to 1
          point.step = point.step < 1 ? 1 : point.step;
          point.vel = force.mult(0.02);
          const dragVector = p5.Vector.sub(mouseWorld, point.pos);
          point.type = dragVector.x > 0 ? "red" : "blue";
          currentColor = point.type === "red" ? p.color(255, 0, 0) : p.color(0, 0, 255);
          const coordinate = `${Math.round(point.pos.x)},${Math.round(point.pos.y)}`;
          const stepString = point.step.toString();
          await createImageDoc(coordinate, point.type, stepString);
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
        canvasWidth = p.windowWidth - 40;
        canvasHeight = p.windowHeight - 120;
        p.resizeCanvas(canvasWidth, canvasHeight);
      };

      function mouseInCanvas() {
        return p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height;
      }
    });

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
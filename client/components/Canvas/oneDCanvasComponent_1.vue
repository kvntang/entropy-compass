<script setup lang="ts">
import p5 from "p5";
import { onMounted, ref } from "vue";

const canvasContainer = ref(null);

onMounted(() => {
  if (canvasContainer.value) {
    new p5((p) => {
      // Variables
      interface Image {
        x: number;
        y: number;
        alpha: number;
        isNoisy: boolean;
        number: number;
        isAnimating: boolean;
        currentY: number;
        startY?: number;
        targetY?: number;
        animationStartTime?: number;
        animationDuration?: number;
      }

      let images: Image[] = [];
      let isDragging = false;
      let isPanning = false; // New variable to track panning
      let dragStartX = 0;
      let dragStartY = 0;
      let panStartX = 0; // Starting X position for panning
      let panStartY = 0; // Starting Y position for panning
      let panStartTranslateX = 0; // Starting translateX for panning
      let panStartTranslateY = 0; // Starting translateY for panning
      const gridSize = 40;
      const padding = 0;
      const stepDistance = 35;

      // Zoom and pan
      let scaleFactor = 1;
      const minScale = 0.5;
      const maxScale = 2;
      let translateX = 0; // New variable for horizontal panning
      let translateY = 0;

      p.setup = () => {
        const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent(canvasContainer.value);

        // Align initial position with the grid
        const cols = Math.floor(p.width / (gridSize + padding));
        const initialX = (cols - 1) * (gridSize + padding);
        const initialY = 0;

        // Add initial image
        images.push({
          x: initialX,
          y: initialY,
          alpha: 255,
          isNoisy: false,
          number: 0,
          isAnimating: false,
          currentY: initialY,
        });
      };

      p.draw = () => {
        p.background(20);

        p.push();
        p.scale(scaleFactor);
        p.translate(translateX, translateY); // Updated to include translateX

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

            img.currentY = p.lerp(img.startY, img.targetY, easeT);

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

          // Display the number on top of the image
          p.fill(255);
          p.text(img.number, img.x + gridSize / 2, img.currentY + gridSize / 2);
        }

        // Draw drag preview
        if (isDragging) {
          let dragDistanceX = (p.mouseX - dragStartX) / scaleFactor;
          let dragDistanceY = (p.mouseY - dragStartY) / scaleFactor;

          let lastImage = images[images.length - 1];

          if (Math.abs(dragDistanceY) > Math.abs(dragDistanceX) && dragDistanceY > 0) {
            // Vertical dragging (editing)
            let lineX = lastImage.x + gridSize / 2;
            let lineStartY = lastImage.y + gridSize / 2;

            // Draw drag line centered on the square
            p.stroke(255);
            p.strokeWeight(2 / scaleFactor);
            p.line(lineX, lineStartY, lineX, p.mouseY / scaleFactor - translateY);

            // Calculate steps (number of grid units dragged)
            let steps = Math.floor((p.mouseY / scaleFactor - translateY - lineStartY) / (gridSize + padding));
            steps = Math.max(1, steps); // Ensure at least one step

            // Image follows the mouse vertically
            p.noStroke();
            p.fill(lastImage.isNoisy ? p.color(255, 0, 0) : p.color(0, 0, 255));
            p.rect(lastImage.x, lastImage.y + dragDistanceY, gridSize, gridSize);

            // Display number (incremented by steps)
            p.fill(255);
            p.text(lastImage.number + steps, lastImage.x + gridSize / 2, lastImage.y + dragDistanceY + gridSize / 2);

            // Display numbers along the drag line
            for (let i = 1; i <= steps; i++) {
              let posY = lineStartY + i * (gridSize + padding);
              p.fill(255);
              p.textSize(14 / scaleFactor);
              p.text(i, lineX + gridSize / 2 + 5 / scaleFactor, posY);
            }
          } else if (Math.abs(dragDistanceX) > 0) {
            // Horizontal dragging
            let steps = Math.floor(Math.abs(dragDistanceX) / stepDistance);
            let direction = dragDistanceX < 0 ? "noise" : "denoise";

            // Draw preview line
            p.stroke(255);
            p.strokeWeight(2 / scaleFactor);
            p.line(dragStartX / scaleFactor - translateX, dragStartY / scaleFactor - translateY, p.mouseX / scaleFactor - translateX, dragStartY / scaleFactor - translateY);

            // Draw preview square
            p.noFill();
            p.stroke(dragDistanceX < 0 ? p.color(255, 0, 0) : p.color(0, 0, 255)); // Red for left, Blue for right
            p.strokeWeight(1 / scaleFactor);
            let previewX = lastImage.x;
            if (direction === "noise") {
              previewX = Math.max(padding, lastImage.x - steps * (gridSize + padding));
            } else {
              previewX = Math.min(p.width / scaleFactor - gridSize - padding, lastImage.x + steps * (gridSize + padding));
            }
            p.rect(previewX, lastImage.y, gridSize, gridSize);

            // Display number on preview
            p.fill(255);
            p.text(lastImage.number, previewX + gridSize / 2, lastImage.y + gridSize / 2);
          }
        }

        p.pop();
      };

      p.mousePressed = () => {
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
            dragStartX = p.mouseX;
            dragStartY = p.mouseY;
            isDragging = true;
          }
        }
      };

      p.mouseDragged = () => {
        if (isPanning) {
          // Calculate the amount of movement
          let dx = (p.mouseX - panStartX) / scaleFactor;
          let dy = (p.mouseY - panStartY) / scaleFactor;

          // Update the translation
          translateX = panStartTranslateX + dx;
          translateY = panStartTranslateY + dy;

          // Prevent default behavior
          return false;
        }
      };

      p.mouseReleased = () => {
        if (isPanning) {
          isPanning = false;
        } else if (isDragging) {
          let dragDistanceX = (p.mouseX - dragStartX) / scaleFactor;
          let dragDistanceY = (p.mouseY - dragStartY) / scaleFactor;

          if (Math.abs(dragDistanceY) > Math.abs(dragDistanceX) && dragDistanceY > 0) {
            // Vertical dragging (editing)
            let lastImage = images[images.length - 1];

            // Calculate steps
            let lineStartY = lastImage.y + gridSize / 2;
            let steps = Math.floor((p.mouseY / scaleFactor - translateY - lineStartY) / (gridSize + padding));
            steps = Math.max(1, steps);

            // The image snaps back to just the next row
            let targetY = lastImage.y + gridSize + padding;

            // Create new image state with elastic animation
            let newImage = {
              x: lastImage.x,
              y: lastImage.y,
              alpha: 255,
              isNoisy: lastImage.isNoisy,
              number: lastImage.number + steps,
              isAnimating: true,
              startY: lastImage.y + dragDistanceY,
              targetY: targetY,
              animationStartTime: p.millis(),
              animationDuration: 500,
              currentY: lastImage.y + dragDistanceY,
            };

            images.push(newImage);

            // Fade older images
            for (let img of images) {
              if (img !== newImage) {
                img.alpha = Math.max(100, img.alpha - 20);
              }
            }
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
                newX = Math.min(p.width / scaleFactor - gridSize - padding, lastImage.x + steps * (gridSize + padding));
              }

              // Add new image state
              images.push({
                x: newX,
                y: lastImage.y,
                alpha: 255,
                isNoisy: isNoisy,
                number: lastImage.number,
                isAnimating: false,
                currentY: lastImage.y,
              });

              // Fade older images
              for (let img of images) {
                if (img !== images[images.length - 1]) {
                  img.alpha = Math.max(100, img.alpha - 20);
                }
              }
            }
          }
          isDragging = false;
        }
      };

      p.mouseWheel = (event: WheelEvent) => {
        if (mouseInCanvas()) {
          // Zooming
          let zoomAmount = event.deltaY * -0.001;
          scaleFactor += zoomAmount;
          scaleFactor = p.constrain(scaleFactor, minScale, maxScale);

          // Adjust translateX and translateY to keep the focus on the mouse position
          let mouseXWorld = (p.mouseX - translateX) / scaleFactor;
          let mouseYWorld = (p.mouseY - translateY) / scaleFactor;
          translateX -= mouseXWorld * zoomAmount;
          translateY -= mouseYWorld * zoomAmount;

          // Prevent default scrolling behavior
          return false;
        }
      };

      p.keyPressed = () => {
        // Vertical scrolling with arrow keys
        let scrollAmount = 20 / scaleFactor;
        if (p.keyCode === p.UP_ARROW) {
          translateY += scrollAmount;
        } else if (p.keyCode === p.DOWN_ARROW) {
          translateY -= scrollAmount;
        }
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
      };

      function mouseInCanvas() {
        return p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height;
      }

      // Easing function for elastic effect
      function easeOutElastic(t: number) {
        const c4 = (2 * Math.PI) / 3;

        if (t === 0) return 0;
        if (t === 1) return 1;
        return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
      }
    });
  }
});
</script>

<template>
  <div ref="canvasContainer"></div>
</template>

<style scoped>
body,
html {
  margin: 0;
  padding: 0;
  font-family: "Helvetica Neue", Arial, sans-serif;
  background-color: #181818;
  color: #fff;
  overflow: hidden;
}

div {
  width: 100vw;
  height: 100vh;
}

canvas {
  display: block;
}
</style>

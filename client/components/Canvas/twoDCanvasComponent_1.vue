<script setup lang="ts">
import p5 from 'p5';
import { onMounted, ref } from 'vue';

// Reference to the canvas container
const canvasContainer = ref(null);

onMounted(() => {
  if (canvasContainer.value) {
    new p5((p) => {
      // Variables
      let ball: any;
      let isDragging = false;
      let launchDirection: p5.Vector;
      let staticPositions: { pos: p5.Vector; color: p5.Color }[] = [];
      let hasMoved = false;

      p.setup = () => {
        const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent(canvasContainer.value);

        // Ball properties
        ball = {
          pos: p.createVector(p.width / 2, p.height / 2),
          radius: 10,
          vel: p.createVector(0, 0),
          isFlying: false,
          color: p.color(240), // Default color
        };

        // Launch direction vector
        launchDirection = p.createVector(0, 0);
      };

      p.draw = () => {
        p.background(10);

        // Draw all recorded static positions with reduced opacity
        p.noStroke();
        for (let sp of staticPositions) {
          p.fill(
            p.red(sp.color),
            p.green(sp.color),
            p.blue(sp.color),
            50
          ); // Reduced opacity
          // Draw squares instead of circles
          p.rect(
            sp.pos.x - ball.radius,
            sp.pos.y - ball.radius,
            ball.radius * 2,
            ball.radius * 2
          );
        }

        // Draw a dotted line connecting the history squares dynamically
        if (staticPositions.length > 1) {
          p.stroke(150);
          p.strokeWeight(1);
          (p.drawingContext as CanvasRenderingContext2D).setLineDash([5, 5]); // Dotted line
          for (let i = 0; i < staticPositions.length - 1; i++) {
            p.line(
              staticPositions[i].pos.x,
              staticPositions[i].pos.y,
              staticPositions[i + 1].pos.x,
              staticPositions[i + 1].pos.y
            );
          }
          (p.drawingContext as CanvasRenderingContext2D).setLineDash([]); // Reset line dash
        }

        // Draw the current square
        p.fill(ball.color);
        p.rect(
          ball.pos.x - ball.radius,
          ball.pos.y - ball.radius,
          ball.radius * 2,
          ball.radius * 2
        );

        if (isDragging) {
          // Calculate the dynamic circle radius based on the distance to the mouse
          let dragDistance = p.dist(p.mouseX, p.mouseY, ball.pos.x, ball.pos.y);

          // Remove the maximum limit on the radius
          let dynamicRadius = Math.max(dragDistance, 50); // Ensure minimum radius of 50

          // Draw a circle around the square to show the drag range
          p.stroke(100);
          p.noFill();
          p.ellipse(ball.pos.x, ball.pos.y, dynamicRadius * 2);

          // Draw a horizontal line from the square to the edge of the circle
          p.stroke(150);
          p.line(
            ball.pos.x - dynamicRadius,
            ball.pos.y,
            ball.pos.x + dynamicRadius,
            ball.pos.y
          );

          // Calculate the launch direction (opposite of the drag direction)
          launchDirection = p
            .createVector(ball.pos.x, ball.pos.y)
            .sub(p.createVector(p.mouseX, p.mouseY))
            .normalize()
            .mult(dynamicRadius);

          // Draw the launch line indicating the angle
          p.stroke(255);
          p.strokeWeight(2);
          p.line(
            ball.pos.x,
            ball.pos.y,
            ball.pos.x + launchDirection.x,
            ball.pos.y + launchDirection.y
          );

          // Draw the launch arrow indicating the angle
          p.push();
          p.fill(255);
          p.noStroke();

          // Calculate the angle of the arrow direction
          let angle = p.atan2(launchDirection.y, launchDirection.x);

          // Define the size of the arrowhead
          let arrowSize = 10;

          // Use the endpoint of the line as the base for the arrowhead
          let arrowX = ball.pos.x + launchDirection.x;
          let arrowY = ball.pos.y + launchDirection.y;

          // Draw the triangle for the arrowhead
          p.translate(arrowX, arrowY);
          p.rotate(angle);
          p.triangle(
            0,
            0,
            -arrowSize,
            arrowSize / 2,
            -arrowSize,
            -arrowSize / 2
          );
          p.pop();

          // Draw the dotted line from the square to the mouse position
          p.stroke(150);
          p.strokeWeight(1);
          (p.drawingContext as CanvasRenderingContext2D).setLineDash([5, 5]); // Dotted line
          p.line(ball.pos.x, ball.pos.y, p.mouseX, p.mouseY);
          (p.drawingContext as CanvasRenderingContext2D).setLineDash([]); // Reset line dash
        }

        // Handle square movement if released
        if (ball.isFlying) {
          ball.pos.add(ball.vel);

          // Dynamically add the square's current position to the static positions
          if (p.frameCount % 10 === 0) {
            staticPositions.push({ pos: ball.pos.copy(), color: ball.color });
          }

          // Apply friction to gradually slow down the square
          ball.vel.mult(0.98);

          // Check if the square has completely stopped
          if (ball.vel.mag() < 0.01) {
            ball.vel.set(0, 0); // Ensure the velocity is exactly zero
            ball.isFlying = false;

            // Record the final position as a static position
            staticPositions.push({ pos: ball.pos.copy(), color: ball.color });
          }

          // Bounce off the edges
          if (ball.pos.x - ball.radius < 0 || ball.pos.x + ball.radius > p.width) {
            ball.vel.x *= -0.8;
          }
          if (ball.pos.y - ball.radius < 0 || ball.pos.y + ball.radius > p.height) {
            ball.vel.y *= -0.8;
          }
        }
      };

      p.mousePressed = () => {
        let d = p.dist(p.mouseX, p.mouseY, ball.pos.x, ball.pos.y);
        // Only allow dragging if the square is not flying and velocity is zero
        if (d < ball.radius && !ball.isFlying && ball.vel.mag() === 0) {
          isDragging = true;
        }
      };

      p.mouseReleased = () => {
        if (isDragging) {
          isDragging = false;
          ball.isFlying = true;

          // Calculate the velocity vector based on the opposite of the drag direction
          let force = p5.Vector.sub(ball.pos, p.createVector(p.mouseX, p.mouseY));
          force.mult(0.02);
          ball.vel = force;

          // Determine drag direction
          let dragVector = p
            .createVector(p.mouseX, p.mouseY)
            .sub(ball.pos);
          if (dragVector.x > 0) {
            // Dragged to the right (launching left), make squares red
            ball.color = p.color(255, 0, 0); // Red
          } else {
            // Dragged to the left (launching right), make squares blue
            ball.color = p.color(0, 0, 255); // Blue
          }
        }
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        // Optionally, adjust the ball position if necessary
        ball.pos.set(p.width / 2, p.height / 2);
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

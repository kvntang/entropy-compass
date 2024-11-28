<script lang="ts">
import p5 from "p5";

/**
 * Determine type, color, and promptIndex based on snapped angle degrees.
 *
 * @param snappedAngleDegrees - The snapped angle in degrees.
 * @param angleIncrement - The snapping increment for angles.
 * @returns An object containing type, color, promptIndex, and logMessage.
 */
export function getMovementDetails(snappedAngleDegrees: number, angleIncrement: number) {
  let type = "";
  let currentColor: p5.Color;
  let promptIndex = 0;
  let logMessage = "";

  const p = new p5(() => {}); // Create a p5 instance for color creation

  if (snappedAngleDegrees === 0 || snappedAngleDegrees === 180) {
    // Pure horizontal movement
    promptIndex = 0;
    if (snappedAngleDegrees === 0) {
      // Moving right
      type = "noise";
      currentColor = p.color(255, 0, 0); // Red
      logMessage = `Noised, promptIndex: ${promptIndex}`;
    } else {
      // Moving left
      type = "denoise";
      currentColor = p.color(0, 0, 255); // Blue
      logMessage = `Denoised, promptIndex: ${promptIndex}`;
    }
  } else {
    // Angled movement
    if (snappedAngleDegrees > 90 && snappedAngleDegrees < 270) {
      // Moving left at an angle
      type = "denoise";
      currentColor = p.color(0, 0, 255); // Blue
      logMessage = `Denoised, promptIndex: `;
    } else {
      // Moving right at an angle
      type = "noise";
      currentColor = p.color(255, 0, 0); // Red
      logMessage = `Noised, promptIndex: `;
    }

    // Calculate prompt index based on angle deviation from horizontal
    let deviation = snappedAngleDegrees % 180; // 0 to 180
    deviation = deviation > 90 ? 180 - deviation : deviation; // 0 to 90
    promptIndex = Math.floor(deviation / angleIncrement); // 0 to 9

    // Ensure promptIndex is at least 1 for angled moves
    promptIndex = Math.max(promptIndex, 1);

    logMessage += `${promptIndex}`;
  }

  return { type, currentColor, promptIndex, logMessage };
}
</script>

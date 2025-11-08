#!/usr/bin/env python3
"""
RemBG - AI-powered background removal
Uses U2-Net deep learning model to intelligently detect foreground vs background
"""
import sys
from rembg import remove
from PIL import Image

def remove_background(input_path, output_path):
    """
    Remove background from an image using AI with maximum precision
    Args:
        input_path: Path to input image
        output_path: Path to save output image with transparent background
    """
    try:
        # Open input image
        input_image = Image.open(input_path)

        # Get the dominant background color (top-left corner pixel)
        bg_color = input_image.getpixel((0, 0))

        # Remove background using AI
        output_image = remove(input_image)

        # Post-process: Aggressively remove any remaining background bleed
        # Convert to RGBA if not already
        if output_image.mode != 'RGBA':
            output_image = output_image.convert('RGBA')

        # Get pixel data
        pixels = output_image.load()
        width, height = output_image.size

        # Determine if background is black or white
        is_black_bg = sum(bg_color[:3]) < 128 * 3  # Black if sum of RGB < 384

        # Clean up bleeding pixels
        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]

                if is_black_bg:
                    # Black background: Remove dark pixels with low alpha
                    if (r + g + b) < 100 and a < 255:  # Dark and semi-transparent = bleed
                        pixels[x, y] = (r, g, b, 0)  # Make fully transparent
                    elif (r + g + b) < 50:  # Very dark pixels = likely background
                        pixels[x, y] = (r, g, b, 0)
                else:
                    # White background: Remove bright pixels with low alpha
                    if (r + g + b) > 650 and a < 255:  # Bright and semi-transparent = bleed
                        pixels[x, y] = (r, g, b, 0)  # Make fully transparent
                    elif (r + g + b) > 700:  # Very bright pixels = likely background
                        pixels[x, y] = (r, g, b, 0)

        # Save with transparent background at maximum quality
        output_image.save(output_path, format='PNG', compress_level=1)

        print(f"✅ Background removed: {output_path}")
        return 0

    except Exception as e:
        print(f"❌ Error removing background: {str(e)}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 remove_bg.py <input_path> <output_path>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    sys.exit(remove_background(input_path, output_path))

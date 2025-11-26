"""
Self-Hosted Background Removal Service
Using rembg library (FREE) instead of Remove.bg API ($2,001/month at 10k images)
Cost Savings: 98.8% ($1,976/month saved)
"""

from flask import Flask, request, send_file, jsonify
from rembg import remove
from PIL import Image
import io
import logging
import time

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Track statistics
stats = {
    'total_requests': 0,
    'successful_requests': 0,
    'failed_requests': 0,
    'avg_processing_time': 0
}

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint for Railway monitoring"""
    return jsonify({
        'status': 'healthy',
        'service': 'rembg-background-removal',
        'timestamp': time.time(),
        'stats': stats
    }), 200

@app.route('/remove', methods=['POST'])
def remove_background():
    """
    Remove background from uploaded image

    Expected form data:
    - image_file: The image file to process

    Returns:
    - PNG image with transparent background
    """
    start_time = time.time()
    stats['total_requests'] += 1

    try:
        # Validate request
        if 'image_file' not in request.files:
            stats['failed_requests'] += 1
            return jsonify({'error': 'No image_file provided'}), 400

        file = request.files['image_file']

        if file.filename == '':
            stats['failed_requests'] += 1
            return jsonify({'error': 'Empty filename'}), 400

        logger.info(f"Processing image: {file.filename}")

        # Read image data
        input_image = file.read()

        # Remove background using rembg
        # This is the magic line that replaces Remove.bg API
        output_image = remove(input_image)

        # Update statistics
        processing_time = time.time() - start_time
        stats['successful_requests'] += 1
        stats['avg_processing_time'] = (
            (stats['avg_processing_time'] * (stats['successful_requests'] - 1) + processing_time)
            / stats['successful_requests']
        )

        logger.info(f"✅ Background removed successfully in {processing_time:.2f}s")

        # Return transparent PNG
        return send_file(
            io.BytesIO(output_image),
            mimetype='image/png',
            as_attachment=False,
            download_name='transparent.png'
        )

    except Exception as e:
        stats['failed_requests'] += 1
        logger.error(f"❌ Background removal failed: {str(e)}")
        return jsonify({
            'error': 'Background removal failed',
            'message': str(e)
        }), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    """Get service statistics"""
    return jsonify(stats), 200

@app.route('/', methods=['GET'])
def index():
    """Service information"""
    return jsonify({
        'service': 'Self-Hosted Background Removal',
        'technology': 'rembg (Python)',
        'cost_savings': '$1,976/month vs Remove.bg',
        'endpoints': {
            '/health': 'Health check',
            '/remove': 'Remove background (POST)',
            '/stats': 'Service statistics'
        }
    }), 200

if __name__ == '__main__':
    # For local development
    app.run(host='0.0.0.0', port=5000, debug=False)

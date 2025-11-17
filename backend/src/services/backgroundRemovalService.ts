import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

interface RemovalResult {
  success: boolean;
  transparentBuffer?: Buffer;
  error?: string;
}

/**
 * BackgroundRemovalService - Removes background from images using Remove.bg API
 */
class BackgroundRemovalService {
  private apiKey: string = '';
  private creditsExhausted: boolean = false; // Track if credits are exhausted

  /**
   * Initialize the service by fetching the Remove.bg API key from environment
   */
  async initialize(): Promise<void> {
    try {
      this.apiKey = process.env.REMOVEBG_API_KEY || '';

      if (!this.apiKey) {
        console.warn('⚠️ Remove.bg API key not configured - background removal will be skipped');
      } else {
        console.log('✅ Remove.bg service initialized');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Remove.bg service:', error);
      throw error;
    }
  }

  /**
   * Remove background from an image using Remove.bg API
   * @param imagePath - Path to the image file
   * @returns Promise with the transparent PNG buffer
   */
  async removeBackground(imagePath: string): Promise<RemovalResult> {
    if (!this.apiKey || this.apiKey === 'YOUR_API_KEY_HERE') {
      await this.initialize();
    }

    // Skip API call if we know credits are exhausted
    if (this.creditsExhausted) {
      console.log('⚠️ Remove.bg credits exhausted - skipping API call');
      return {
        success: false,
        error: 'Remove.bg API credits exhausted. Please add more credits.'
      };
    }

    try {
      console.log(`🔄 Starting Remove.bg background removal for: ${imagePath}`);

      // Create form data with the image
      const formData = new FormData();
      formData.append('image_file', fs.createReadStream(imagePath));
      formData.append('size', 'full'); // Full resolution - maximum quality
      formData.append('format', 'png'); // PNG format for transparency

      // Call Remove.bg API
      const response = await axios.post(
        'https://api.remove.bg/v1.0/removebg',
        formData,
        {
          headers: {
            'X-Api-Key': this.apiKey,
            ...formData.getHeaders()
          },
          responseType: 'arraybuffer', // Get image as buffer
          timeout: 60000 // 60 second timeout
        }
      );

      const transparentBuffer = Buffer.from(response.data);

      console.log('✅ Remove.bg background removal completed');

      return {
        success: true,
        transparentBuffer,
        error: undefined
      };

    } catch (error: any) {
      console.error('❌ Remove.bg API failed:', error.message);

      // Better error messages
      if (error.response) {
        const statusCode = error.response.status;

        if (statusCode === 403) {
          return {
            success: false,
            error: 'Remove.bg API key is invalid or expired. Please update your API key in settings.'
          };
        } else if (statusCode === 402) {
          // Mark credits as exhausted to prevent further API calls
          this.creditsExhausted = true;
          console.log('🚫 Remove.bg credits exhausted - future calls will be skipped until reset');
          return {
            success: false,
            error: 'Remove.bg API credits exhausted. Please add more credits or upgrade your plan.'
          };
        } else {
          // Try to parse error message
          let errorMsg = error.message;
          try {
            const errorData = JSON.parse(error.response.data.toString());
            errorMsg = errorData?.errors?.[0]?.title || error.message;
          } catch (e) {
            // Ignore parse error
          }

          return {
            success: false,
            error: `Remove.bg API error (${statusCode}): ${errorMsg}`
          };
        }
      }

      // Fallback: return original image if Remove.bg fails
      try {
        const imageBuffer = fs.readFileSync(imagePath);
        return {
          success: true,
          transparentBuffer: imageBuffer,
          error: `Background removal failed: ${error.message}`
        };
      } catch (readError) {
        return {
          success: false,
          error: error.message || 'Unknown error during background removal'
        };
      }
    }
  }

  /**
   * Reset the credits exhausted flag (call this after upgrading plan)
   */
  resetCreditsFlag(): void {
    this.creditsExhausted = false;
    console.log('✅ Remove.bg credits flag reset - API calls will resume');
  }
}

export default new BackgroundRemovalService();

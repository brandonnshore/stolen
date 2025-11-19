"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const fs_1 = __importDefault(require("fs"));
/**
 * BackgroundRemovalService - Removes background from images using Remove.bg API
 */
class BackgroundRemovalService {
    constructor() {
        this.apiKey = '';
        this.creditsExhausted = false; // Track if credits are exhausted
    }
    /**
     * Initialize the service by fetching the Remove.bg API key from environment
     */
    async initialize() {
        try {
            this.apiKey = process.env.REMOVEBG_API_KEY || '';
            if (!this.apiKey) {
                console.warn('⚠️ Remove.bg API key not configured - background removal will be skipped');
            }
            else {
                console.log('✅ Remove.bg service initialized');
            }
        }
        catch (error) {
            console.error('❌ Failed to initialize Remove.bg service:', error);
            throw error;
        }
    }
    /**
     * Remove background from an image using Remove.bg API
     * @param imagePath - Path to the image file
     * @returns Promise with the transparent PNG buffer
     */
    async removeBackground(imagePath) {
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
            const formData = new form_data_1.default();
            formData.append('image_file', fs_1.default.createReadStream(imagePath));
            formData.append('size', 'full'); // Full resolution - maximum quality
            formData.append('format', 'png'); // PNG format for transparency
            // Call Remove.bg API
            const response = await axios_1.default.post('https://api.remove.bg/v1.0/removebg', formData, {
                headers: {
                    'X-Api-Key': this.apiKey,
                    ...formData.getHeaders()
                },
                responseType: 'arraybuffer', // Get image as buffer
                timeout: 60000 // 60 second timeout
            });
            const transparentBuffer = Buffer.from(response.data);
            console.log('✅ Remove.bg background removal completed');
            return {
                success: true,
                transparentBuffer,
                error: undefined
            };
        }
        catch (error) {
            console.error('❌ Remove.bg API failed:', error.message);
            // Better error messages
            if (error.response) {
                const statusCode = error.response.status;
                if (statusCode === 403) {
                    return {
                        success: false,
                        error: 'Remove.bg API key is invalid or expired. Please update your API key in settings.'
                    };
                }
                else if (statusCode === 402) {
                    // Mark credits as exhausted to prevent further API calls
                    this.creditsExhausted = true;
                    console.log('🚫 Remove.bg credits exhausted - future calls will be skipped until reset');
                    return {
                        success: false,
                        error: 'Remove.bg API credits exhausted. Please add more credits or upgrade your plan.'
                    };
                }
                else {
                    // Try to parse error message
                    let errorMsg = error.message;
                    try {
                        const errorData = JSON.parse(error.response.data.toString());
                        errorMsg = errorData?.errors?.[0]?.title || error.message;
                    }
                    catch (e) {
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
                const imageBuffer = fs_1.default.readFileSync(imagePath);
                return {
                    success: true,
                    transparentBuffer: imageBuffer,
                    error: `Background removal failed: ${error.message}`
                };
            }
            catch (readError) {
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
    resetCreditsFlag() {
        this.creditsExhausted = false;
        console.log('✅ Remove.bg credits flag reset - API calls will resume');
    }
}
exports.default = new BackgroundRemovalService();
//# sourceMappingURL=backgroundRemovalService.js.map
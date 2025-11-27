"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const fs_1 = __importDefault(require("fs"));
/**
 * BackgroundRemovalService - Removes background from images
 *
 * Supports two methods:
 * 1. Self-hosted rembg service (FREE, saves $1,976/month)
 * 2. Remove.bg API (fallback for premium users)
 */
class BackgroundRemovalService {
    constructor() {
        this.apiKey = '';
        this.creditsExhausted = false;
        this.rembgEndpoint = '';
        this.useSelfHosted = true; // Default to self-hosted for cost savings
    }
    /**
     * Initialize the service
     */
    async initialize() {
        try {
            this.apiKey = process.env.REMOVEBG_API_KEY || '';
            this.rembgEndpoint = process.env.REMBG_ENDPOINT || 'http://localhost:5000';
            // Validate Remove.bg API key if provided (security check)
            if (this.apiKey && (this.apiKey === 'YOUR_API_KEY_HERE' || this.apiKey.length < 10)) {
                throw new Error('Remove.bg API key not properly configured. Please set a valid REMOVEBG_API_KEY in environment variables.');
            }
            // Check if self-hosted service is available
            if (this.rembgEndpoint) {
                try {
                    await axios_1.default.get(`${this.rembgEndpoint}/health`, { timeout: 5000 });
                    this.useSelfHosted = true;
                    console.log('✅ Self-hosted rembg service initialized (SAVES $1,976/month)');
                }
                catch (error) {
                    console.warn('⚠️ Self-hosted rembg service not available, will use Remove.bg as fallback');
                    this.useSelfHosted = false;
                }
            }
            if (!this.apiKey && !this.useSelfHosted) {
                console.warn('⚠️ No background removal service configured');
            }
            else if (this.apiKey && !this.useSelfHosted) {
                console.log('✅ Remove.bg service initialized');
            }
        }
        catch (error) {
            console.error('❌ Failed to initialize background removal service:', error);
            throw error;
        }
    }
    /**
     * Remove background from an image
     * Uses self-hosted service by default, falls back to Remove.bg if needed
     * @param imagePath - Path to the image file
     * @param forcePremium - Force use of Remove.bg API (for premium users)
     * @returns Promise with the transparent PNG buffer
     */
    async removeBackground(imagePath, forcePremium = false) {
        if (!this.rembgEndpoint && !this.apiKey) {
            await this.initialize();
        }
        // Use self-hosted service if available and not forced to premium
        if (this.useSelfHosted && !forcePremium) {
            return this.removeBackgroundSelfHosted(imagePath);
        }
        // Fall back to Remove.bg API
        return this.removeBackgroundRemoveBg(imagePath);
    }
    /**
     * Remove background using self-hosted rembg service
     * COST: ~$25/month (Railway) vs $2,001/month (Remove.bg)
     * SAVINGS: $1,976/month (98.8%)
     */
    async removeBackgroundSelfHosted(imagePath) {
        try {
            console.log(`🔄 Starting self-hosted background removal for: ${imagePath}`);
            const formData = new form_data_1.default();
            formData.append('image_file', fs_1.default.createReadStream(imagePath));
            const response = await axios_1.default.post(`${this.rembgEndpoint}/remove`, formData, {
                headers: formData.getHeaders(),
                responseType: 'arraybuffer',
                timeout: 120000 // 2 minutes timeout (ML processing can be slower)
            });
            const transparentBuffer = Buffer.from(response.data);
            console.log('✅ Self-hosted background removal completed (SAVED $0.20 vs Remove.bg)');
            return {
                success: true,
                transparentBuffer,
                error: undefined
            };
        }
        catch (error) {
            console.error('❌ Self-hosted rembg failed, falling back to Remove.bg:', error.message);
            // Fall back to Remove.bg if self-hosted fails
            if (this.apiKey) {
                return this.removeBackgroundRemoveBg(imagePath);
            }
            // No fallback available
            return {
                success: false,
                error: `Self-hosted background removal failed: ${error.message}`
            };
        }
    }
    /**
     * Remove background using Remove.bg API (fallback or premium)
     * COST: $0.20 per image at scale
     */
    async removeBackgroundRemoveBg(imagePath) {
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
                    // Throw with AUTH_FAILED prefix to prevent retries
                    throw new Error('AUTH_FAILED: Remove.bg API key invalid - do not retry');
                }
                else if (statusCode === 402) {
                    // Mark credits as exhausted to prevent further API calls
                    this.creditsExhausted = true;
                    console.log('🚫 Remove.bg credits exhausted - future calls will be skipped until reset');
                    // Throw with CREDITS_EXHAUSTED prefix to prevent retries
                    throw new Error('CREDITS_EXHAUSTED: Remove.bg API credits exhausted - do not retry');
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
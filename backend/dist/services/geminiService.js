"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const generative_ai_1 = require("@google/generative-ai");
const database_1 = __importDefault(require("../config/database"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
/**
 * GeminiService - Handles AI-powered logo extraction using Google Gemini
 */
class GeminiService {
    constructor() {
        this.genAI = null;
        this.prompt = '';
    }
    /**
     * Initialize the Gemini client with API key from settings
     */
    async initialize() {
        try {
            // Fetch API key and prompt from database settings
            const apiKeyResult = await database_1.default.query("SELECT value FROM settings WHERE key = 'gemini_api_key'");
            const promptResult = await database_1.default.query("SELECT value FROM settings WHERE key = 'gemini_extraction_prompt'");
            if (!apiKeyResult.rows[0]?.value?.api_key) {
                throw new Error('Gemini API key not configured in settings');
            }
            const apiKey = apiKeyResult.rows[0].value.api_key;
            this.prompt = promptResult.rows[0]?.value?.prompt || this.getDefaultPrompt();
            this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
            console.log('✅ Gemini service initialized');
        }
        catch (error) {
            console.error('❌ Failed to initialize Gemini service:', error);
            throw error;
        }
    }
    /**
     * Get the default extraction prompt (locked to user's specific requirements)
     */
    getDefaultPrompt() {
        return `You are a professional design extraction tool. Extract and ENLARGE the printed design from this shirt photo. CRITICAL REQUIREMENTS: 1) MASSIVE SIZE - Minimum 3000x3000px, ideally 4000x4000+. FILL 95%+ of frame, zoom in close, tight crop. 2) PRESERVE ALL LAYERS & EFFECTS - If design has STROKES/OUTLINES around text or shapes, you MUST recreate them EXACTLY. If it has SHADOWS or GLOWS, keep them. If it has MULTIPLE LAYERS, recreate ALL layers. Do NOT flatten or simplify multi-layered designs. 3) ALL COLORS & ACCENTS - Recreate EVERY color exactly. If there are light blue, teal, or any accent colors, keep them ALL. Match gradients, color variations, and effects perfectly. 4) STROKES ARE CRITICAL - Many designs have colored outlines/strokes around letters or shapes. You MUST preserve these strokes with exact thickness, color, and style. Do NOT remove strokes. 5) EXTRACT DESIGN ONLY - Extract ONLY the graphic/logo/text. NEVER recreate the shirt, fabric, or garment. Just the artwork, massively enlarged. 6) INTELLIGENT BACKGROUND - WHITE/LIGHT designs → SOLID BLACK background (#000000). DARK/BLACK designs → SOLID WHITE background (#FFFFFF). MULTICOLOR → Choose maximum contrast. Background must be perfectly uniform. 7) PERFECT ACCURACY - Pixel-perfect recreation. Keep all complexity, text, effects, shadows, strokes, outlines, and layers. Do NOT simplify ANYTHING. Output: MASSIVE PNG (3000px+ min) of ONLY the design, tightly cropped to fill 95%+ of frame, with ALL strokes/outlines/effects/layers preserved, on solid contrasting background.`;
    }
    /**
     * Extract logo from shirt photo using Gemini
     * @param imagePath - Path to the uploaded shirt photo
     * @returns Promise with extraction result containing the white-background PNG
     */
    async extractLogo(imagePath) {
        if (!this.genAI) {
            await this.initialize();
        }
        try {
            console.log(`🔄 Starting Gemini extraction for: ${imagePath}`);
            // Read the image file (handle both local paths and Supabase URLs)
            let imageBuffer;
            if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                // Download from Supabase
                console.log(`📥 Downloading image from Supabase: ${imagePath}`);
                const response = await axios_1.default.get(imagePath, { responseType: 'arraybuffer' });
                imageBuffer = Buffer.from(response.data);
            }
            else {
                // Read from local filesystem
                imageBuffer = fs_1.default.readFileSync(imagePath);
            }
            const base64Image = imageBuffer.toString('base64');
            // Determine MIME type based on file extension
            const ext = path_1.default.extname(imagePath).toLowerCase();
            const mimeTypeMap = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
            };
            const mimeType = mimeTypeMap[ext] || 'image/jpeg';
            // Get Nano Banana model (Gemini 2.5 Flash Image - image generation/editing model)
            const model = this.genAI.getGenerativeModel({
                model: 'gemini-2.5-flash-image-preview',
            });
            // Generate content with the image and prompt for image editing
            const result = await model.generateContent({
                contents: [{
                        role: 'user',
                        parts: [
                            { text: this.prompt },
                            {
                                inlineData: {
                                    mimeType,
                                    data: base64Image
                                }
                            }
                        ]
                    }]
            });
            const response = result.response;
            // Nano Banana returns images in the response parts
            // Look for inline image data in the response
            const candidates = response.candidates;
            if (!candidates || candidates.length === 0) {
                throw new Error('No image generated from Nano Banana');
            }
            const parts = candidates[0].content.parts;
            let generatedImageBuffer = null;
            for (const part of parts) {
                if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
                    // Convert base64 image data to buffer
                    generatedImageBuffer = Buffer.from(part.inlineData.data, 'base64');
                    console.log('✅ Nano Banana image extraction completed');
                    break;
                }
            }
            if (!generatedImageBuffer) {
                // Fallback: if no image in response, log the text and use original
                const text = response.text ? response.text() : 'No text response';
                console.log('⚠️ No image in Nano Banana response, using original. Response:', text.substring(0, 200));
                generatedImageBuffer = imageBuffer;
            }
            return {
                success: true,
                imageBuffer: generatedImageBuffer,
                error: undefined
            };
        }
        catch (error) {
            console.error('❌ Gemini extraction failed:', error);
            return {
                success: false,
                error: error.message || 'Unknown error during extraction'
            };
        }
    }
    /**
     * Update the extraction prompt in settings
     */
    async updatePrompt(newPrompt) {
        await database_1.default.query(`UPDATE settings SET value = $1 WHERE key = 'gemini_extraction_prompt'`, [JSON.stringify({ prompt: newPrompt })]);
        this.prompt = newPrompt;
    }
}
exports.default = new GeminiService();
//# sourceMappingURL=geminiService.js.map
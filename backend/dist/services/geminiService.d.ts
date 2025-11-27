interface GeminiExtractionResult {
    success: boolean;
    imageBuffer?: Buffer;
    error?: string;
}
/**
 * GeminiService - Handles AI-powered logo extraction using Google Gemini
 */
declare class GeminiService {
    private genAI;
    private prompt;
    /**
     * Initialize the Gemini client with API key from environment
     * SECURITY: API key is now stored in environment variables instead of database
     */
    initialize(): Promise<void>;
    /**
     * Get the default extraction prompt (locked to user's specific requirements)
     */
    private getDefaultPrompt;
    /**
     * Extract logo from shirt photo using Gemini
     * @param imagePath - Path to the uploaded shirt photo
     * @returns Promise with extraction result containing the white-background PNG
     */
    extractLogo(imagePath: string): Promise<GeminiExtractionResult>;
    /**
     * Update the extraction prompt in settings
     */
    updatePrompt(newPrompt: string): Promise<void>;
}
declare const _default: GeminiService;
export default _default;
//# sourceMappingURL=geminiService.d.ts.map
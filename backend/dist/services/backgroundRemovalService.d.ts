interface RemovalResult {
    success: boolean;
    transparentBuffer?: Buffer;
    error?: string;
}
/**
 * BackgroundRemovalService - Removes background from images using Remove.bg API
 */
declare class BackgroundRemovalService {
    private apiKey;
    private creditsExhausted;
    /**
     * Initialize the service by fetching the Remove.bg API key from environment
     */
    initialize(): Promise<void>;
    /**
     * Remove background from an image using Remove.bg API
     * @param imagePath - Path to the image file
     * @returns Promise with the transparent PNG buffer
     */
    removeBackground(imagePath: string): Promise<RemovalResult>;
    /**
     * Reset the credits exhausted flag (call this after upgrading plan)
     */
    resetCreditsFlag(): void;
}
declare const _default: BackgroundRemovalService;
export default _default;
//# sourceMappingURL=backgroundRemovalService.d.ts.map
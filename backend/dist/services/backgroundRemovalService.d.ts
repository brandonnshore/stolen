interface RemovalResult {
    success: boolean;
    transparentBuffer?: Buffer;
    error?: string;
}
/**
 * BackgroundRemovalService - Removes background from images
 *
 * Supports two methods:
 * 1. Self-hosted rembg service (FREE, saves $1,976/month)
 * 2. Remove.bg API (fallback for premium users)
 */
declare class BackgroundRemovalService {
    private apiKey;
    private creditsExhausted;
    private rembgEndpoint;
    private useSelfHosted;
    /**
     * Initialize the service
     */
    initialize(): Promise<void>;
    /**
     * Remove background from an image
     * Uses self-hosted service by default, falls back to Remove.bg if needed
     * @param imagePath - Path to the image file
     * @param forcePremium - Force use of Remove.bg API (for premium users)
     * @returns Promise with the transparent PNG buffer
     */
    removeBackground(imagePath: string, forcePremium?: boolean): Promise<RemovalResult>;
    /**
     * Remove background using self-hosted rembg service
     * COST: ~$25/month (Railway) vs $2,001/month (Remove.bg)
     * SAVINGS: $1,976/month (98.8%)
     */
    private removeBackgroundSelfHosted;
    /**
     * Remove background using Remove.bg API (fallback or premium)
     * COST: $0.20 per image at scale
     */
    private removeBackgroundRemoveBg;
    /**
     * Reset the credits exhausted flag (call this after upgrading plan)
     */
    resetCreditsFlag(): void;
}
declare const _default: BackgroundRemovalService;
export default _default;
//# sourceMappingURL=backgroundRemovalService.d.ts.map
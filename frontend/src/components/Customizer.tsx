import { useState, useEffect, useRef } from 'react';
import { Product, Variant } from '../types';
import { uploadAPI, designAPI, jobAPI } from '../services/api';
import { useCartStore } from '../stores/cartStore';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Upload, ArrowDownToLine, Save } from 'lucide-react';
import TShirtCanvas from './TShirtCanvas';
import HoodieCanvas from './HoodieCanvas';
import { useAuth } from '../contexts/AuthContext';
import SaveDesignModal from './SaveDesignModal';
import Toast from './Toast';
import { trackCustomizationStarted, trackDesignSaved } from '../utils/analytics';
import { TSHIRT_BASE_PRICE, calculateUnitCost } from '../constants/pricing';
import { SIZES, MAX_ARTWORKS_PER_VIEW } from '../constants/products';
import { getFullAssetUrl } from '../utils/urlHelpers';

interface CustomizerProps {
  product: Product;
  variants: Variant[];
}

// Rotating disclaimer messages for progress bar
const DISCLAIMER_MESSAGES = [
  "This is AI-powered extraction. Multiple attempts may be needed for perfect results.",
  "Brand names may be altered due to copyright restrictions and AI safety filters.",
  "Complex designs with multiple layers may require several tries to extract perfectly.",
  "Trademarked logos and brand text might be regenerated differently by the AI."
];

export default function Customizer({ product, variants }: CustomizerProps) {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const updateItem = useCartStore((state) => state.updateItem);
  const getItem = useCartStore((state) => state.getItem);
  const canvasRef = useRef<any>(null);
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [loadedDesignId, setLoadedDesignId] = useState<string | null>(null);
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const hasLoadedDesignRef = useRef<string | null>(null);

  // Selection state
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Customization state - separate for each view
  const [view, setView] = useState<'front' | 'back'>('front');

  const [frontArtworks, setFrontArtworks] = useState<Array<{url: string, position: any, assetId?: string}>>([]);
  const [backArtworks, setBackArtworks] = useState<Array<{url: string, position: any, assetId?: string}>>([]);
  const [neckArtwork, setNeckArtwork] = useState<{url: string, position: any, assetId?: string} | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [uploadTargetView, setUploadTargetView] = useState<'front' | 'back'>('front'); // Track where to place uploaded image
  const [jobStatus, setJobStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle');
  const [jobError, setJobError] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<{message: string, percent: number}>({message: '', percent: 0});
  const [disclaimerIndex, setDisclaimerIndex] = useState(0);

  // Track uploaded and extracted artwork files for display
  const [extractedArtworkUrl, setExtractedArtworkUrl] = useState<string | null>(null);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savedDesignName, setSavedDesignName] = useState('');

  // Toast notification state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Track customization started
  useEffect(() => {
    trackCustomizationStarted(product.title);
  }, []); // Run only once on mount

  // Rotate disclaimer messages during processing
  useEffect(() => {
    if (jobStatus === 'uploading' || jobStatus === 'processing') {
      const interval = setInterval(() => {
        setDisclaimerIndex((prev) => (prev + 1) % DISCLAIMER_MESSAGES.length);
      }, 4000); // Rotate every 4 seconds
      return () => clearInterval(interval);
    }
  }, [jobStatus]);

  // Current view's artwork
  const getCurrentArtworks = () => {
    if (view === 'front') return frontArtworks;
    if (view === 'back') return backArtworks;
    return [];
  };

  const currentArtwork = getCurrentArtworks()[0] || null;

  const unitCost = calculateUnitCost(
    frontArtworks.length > 0,
    backArtworks.length > 0,
    false, // No neck artwork
    TSHIRT_BASE_PRICE
  );

  const dbColors = [...new Set(variants.map((v) => v.color))];
  const colors = dbColors.includes('Navy') ? dbColors : [...dbColors, 'Navy'];
  const sizes = [...new Set(variants.map((v) => v.size))].sort((a, b) => {
    return SIZES.indexOf(a as any) - SIZES.indexOf(b as any);
  });

  // Update selected variant when color/size changes
  useEffect(() => {
    if (selectedColor && selectedSize) {
      const variant = variants.find((v) => v.color === selectedColor && v.size === selectedSize);
      setSelectedVariant(variant || null);
    }
  }, [selectedColor, selectedSize, variants]);

  // Load design from URL param if present
  useEffect(() => {
    const designId = searchParams.get('designId');
    if (designId && isAuthenticated && variants.length > 0 && hasLoadedDesignRef.current !== designId) {
      hasLoadedDesignRef.current = designId;
      loadDesign(designId);
    }
  }, [searchParams, isAuthenticated, variants]);

  // Load cart item for editing if present
  useEffect(() => {
    const cartItemId = searchParams.get('editCartItem');
    if (cartItemId) {
      const cartItem = getItem(cartItemId);
      if (cartItem) {
        setEditingCartItemId(cartItemId);
        // Load the design state from cart item
        setSelectedColor(cartItem.variantColor);
        setSelectedSize(cartItem.variantSize);
        setQuantity(cartItem.quantity);

        // Load customization data if available
        if (cartItem.customization) {
          if (cartItem.customization.frontArtworks) {
            setFrontArtworks(cartItem.customization.frontArtworks);
          }
          if (cartItem.customization.backArtworks) {
            setBackArtworks(cartItem.customization.backArtworks);
          }
          if (cartItem.customization.neckArtwork) {
            setNeckArtwork(cartItem.customization.neckArtwork);
          }
        }
      }
    }
  }, [searchParams, getItem]);

  // Poll for job status when processing
  useEffect(() => {
    if (!currentJobId || jobStatus !== 'processing') {
      return;
    }

    let targetPercent = 15; // Start at 15% after upload

    const pollInterval = setInterval(async () => {
      try {
        const job = await jobAPI.getStatus(currentJobId);
        console.log('Job status:', job);

        // Calculate target progress based on step
        if (job.status === 'running' && job.logs) {
          const logs = job.logs.toLowerCase();

          if (logs.includes('step 1') || logs.includes('gemini')) {
            targetPercent = 35;
          } else if (logs.includes('step 2') || logs.includes('background')) {
            targetPercent = 60;
          } else if (logs.includes('step 3') || logs.includes('dpi')) {
            targetPercent = 80;
          } else if (logs.includes('step 4') || logs.includes('verifying')) {
            targetPercent = 95;
          }
        }

        if (job.status === 'done') {
          setJobStatus('done');
          setJobProgress({ message: 'Complete!', percent: 100 });
          clearInterval(pollInterval);

          // Extract the transparent logo asset from the assets array
          const transparentAsset = job.assets?.find((asset: any) => asset.kind === 'transparent');

          if (transparentAsset) {
            const logoUrl = getFullAssetUrl(transparentAsset.file_url);

            // Store the extracted artwork URL for display
            setExtractedArtworkUrl(logoUrl);

            const newArtwork = {
              url: logoUrl,
              position: null, // Will be positioned by user
              assetId: transparentAsset.id
            };

            // Add the extracted logo to the view that was selected at upload time
            if (uploadTargetView === 'back') {
              // Check if we can add more artworks to this view
              if (backArtworks.length >= MAX_ARTWORKS_PER_VIEW) {
                setJobError(`Maximum ${MAX_ARTWORKS_PER_VIEW} artworks per view. Remove one first.`);
              } else {
                setBackArtworks(prev => [...prev, newArtwork]);
              }
            } else {
              // Default to front view
              if (frontArtworks.length >= MAX_ARTWORKS_PER_VIEW) {
                setJobError(`Maximum ${MAX_ARTWORKS_PER_VIEW} artworks per view. Remove one first.`);
              } else {
                setFrontArtworks(prev => [...prev, newArtwork]);
              }
            }
            // Keep the user on their selected view
          }
        } else if (job.status === 'failed') {
          setJobStatus('error');
          setJobError(job.errorMessage || 'Extraction failed');
          clearInterval(pollInterval);
        }
      } catch (error: any) {
        console.error('Failed to poll job status:', error);
        console.error('Error details:', error.response?.data || error.message);
        setJobStatus('error');
        setJobError(error.response?.data?.message || error.message || 'Failed to check extraction status');
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds

    // Smooth progress animation - gradually increase to target
    const animationInterval = setInterval(() => {
      setJobProgress((prev) => {
        if (prev.percent < targetPercent) {
          // Increment by 1-2% every 100ms for smooth animation
          const increment = Math.min(2, targetPercent - prev.percent);
          return { message: 'Stealing your t-shirt', percent: prev.percent + increment };
        }
        return prev;
      });
    }, 100);

    // Cleanup on unmount
    return () => {
      clearInterval(pollInterval);
      clearInterval(animationInterval);
    };
  }, [currentJobId, jobStatus]);

  const loadDesign = async (designId: string) => {
    try {
      const design = await designAPI.getById(designId);
      console.log('[LOAD] Full design object:', JSON.stringify(design, null, 2));
      setLoadedDesignId(design.id);
      setSavedDesignName(design.name); // Set the saved design name

      // Create array of all artwork IDs in order (front, back, neck)
      const allArtworkIds = design.artwork_ids || [];
      const artworkUrls = design.artwork_urls || {};


      // Track which artwork ID we're currently processing
      let artworkIndex = 0;

      // Load the design data with actual artwork URLs
      if (design.design_data) {
        if (design.design_data.front && design.design_data.front.length > 0) {
          const frontArtworkData = design.design_data.front.map((pos: any) => {
            const assetId = allArtworkIds[artworkIndex];
            const url = assetId ? getFullAssetUrl(artworkUrls[assetId]) : '';
            artworkIndex++;
            return {
              url: url || '',
              position: pos,
              assetId: assetId
            };
          });
          setFrontArtworks(frontArtworkData);
        }

        if (design.design_data.back && design.design_data.back.length > 0) {
          const backArtworkData = design.design_data.back.map((pos: any) => {
            const assetId = allArtworkIds[artworkIndex];
            const url = assetId ? getFullAssetUrl(artworkUrls[assetId]) : '';
            artworkIndex++;
            return {
              url: url || '',
              position: pos,
              assetId: assetId
            };
          });
          setBackArtworks(backArtworkData);
        }

        if (design.design_data.neck && design.design_data.neck.length > 0) {
          const assetId = allArtworkIds[artworkIndex];
          const url = assetId ? getFullAssetUrl(artworkUrls[assetId]) : '';
          setNeckArtwork({
            url: url || '',
            position: design.design_data.neck[0],
            assetId: assetId
          });
        }
      }

      // Set color/size/variant if available
      console.log('[LOAD] Design variant_id:', design.variant_id);
      console.log('[LOAD] Design variant_color:', design.variant_color);
      console.log('[LOAD] Design variant_size:', design.variant_size);
      console.log('[LOAD] Design data color/size:', design.design_data?.selectedColor, design.design_data?.selectedSize);

      // PRIORITY: design_data.selectedColor takes precedence over variant_color
      // This is because Navy (and other UI-only colors) are stored in design_data
      let colorToSet: string | null = null;
      let sizeToSet: string | null = null;

      // First: Check design_data for the most recent color selection
      if (design.design_data?.selectedColor) {
        console.log('[LOAD] Using color from design_data (highest priority):', design.design_data.selectedColor);
        colorToSet = design.design_data.selectedColor;
        sizeToSet = design.design_data.selectedSize || 'M';

        // Try to find a matching variant for this color
        const variant = variants.find(v => v.color === colorToSet && v.size === sizeToSet);
        if (variant) {
          console.log('[LOAD] Found matching variant for design_data color:', variant);
          setSelectedVariant(variant);
        } else {
          console.log('[LOAD] No variant found for color:', colorToSet, '(UI-only color like Navy)');
        }
      }
      // Second: Fall back to variant_id/variant_color if no design_data
      else if (design.variant_id) {
        let variant = variants.find(v => v.id === design.variant_id);
        console.log('[LOAD] Found variant by ID:', variant);

        // If variant not found by ID, try to find by color and size from JOIN
        if (!variant && design.variant_color && design.variant_size) {
          console.log('[LOAD] Variant ID not found, trying color/size lookup:', design.variant_color, design.variant_size);
          variant = variants.find(v => v.color === design.variant_color && v.size === design.variant_size);
          console.log('[LOAD] Found variant by color/size:', variant);
        }

        if (variant) {
          console.log('[LOAD] Setting color/size/variant from variant:', variant.color, variant.size);
          colorToSet = variant.color;
          sizeToSet = variant.size;
          setSelectedVariant(variant);
        } else if (design.variant_color) {
          // No variant found, but we have color info from JOIN
          console.log('[LOAD] No variant found, using color from JOIN:', design.variant_color);
          colorToSet = design.variant_color;
          sizeToSet = design.variant_size;
        }
      }

      // Apply the color and size
      if (colorToSet) {
        setSelectedColor(colorToSet);
        setSelectedSize(sizeToSet || 'M');
      }
    } catch (error) {
      console.error('Error loading design:', error);
      alert('Failed to load design');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset any previous errors
    setJobError(null);

    try {
      // Capture the current view for placement when job completes
      setUploadTargetView(view);

      // Set status to uploading
      setJobStatus('uploading');
      setJobProgress({ message: 'Uploading your image...', percent: 5 });

      // Upload shirt photo and start extraction job
      const { asset, jobId, message } = await uploadAPI.uploadShirtPhoto(file);

      console.log('Shirt photo uploaded:', { asset, jobId, message });

      // Set the job ID and status to processing
      setCurrentJobId(jobId);
      setJobStatus('processing');
      setJobProgress({ message: 'Starting extraction process...', percent: 15 });

      // Reset file input
      e.target.value = '';
    } catch (error: any) {
      console.error('Shirt photo upload failed:', error);
      setJobStatus('error');
      setJobError(error.response?.data?.message || 'Failed to upload shirt photo');
      e.target.value = '';
    }
  };

  const handleDownloadDesign = async () => {
    if (canvasRef.current && canvasRef.current.downloadImage) {
      await canvasRef.current.downloadImage();
    }
  };

  const handleSaveDesign = async () => {
    if (!isAuthenticated) {
      // Redirect to login, then back to this page
      navigate('/login', { state: { from: window.location.pathname + window.location.search } });
      return;
    }

    // If updating existing design, save directly without modal
    if (loadedDesignId && savedDesignName) {
      try {
        await performSaveDesign(savedDesignName);
        setToastMessage('Design updated successfully!');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } catch (error) {
        console.error('Error updating design:', error);
        alert('Failed to update design');
      }
      return;
    }

    // Otherwise, open the modal for new design
    setShowSaveModal(true);
  };

  const performSaveDesign = async (designName: string) => {
    try {
      const designData = {
        front: frontArtworks.map(a => a.position),
        back: backArtworks.map(a => a.position),
        neck: neckArtwork ? [neckArtwork.position] : [],
        // Store color and size in design_data for colors without variants (like Navy)
        selectedColor: selectedColor,
        selectedSize: selectedSize || 'M'
      };

      // Collect all artwork asset IDs from all views
      const artworkIds: string[] = [
        ...frontArtworks.filter(a => a.assetId).map(a => a.assetId!),
        ...backArtworks.filter(a => a.assetId).map(a => a.assetId!),
        ...(neckArtwork?.assetId ? [neckArtwork.assetId] : [])
      ];

      // Capture thumbnail
      let thumbnailUrl = '';
      if (canvasRef.current && canvasRef.current.getThumbnailBlob) {
        try {
          const thumbnailBlob = await canvasRef.current.getThumbnailBlob();
          if (thumbnailBlob) {
            // Convert blob to file
            const thumbnailFile = new File([thumbnailBlob], 'thumbnail.png', { type: 'image/png' });
            // Upload thumbnail
            const uploadedAsset = await uploadAPI.uploadFile(thumbnailFile);
            thumbnailUrl = uploadedAsset.file_url;
          }
        } catch (err) {
          console.error('Failed to capture thumbnail:', err);
          // Continue without thumbnail
        }
      }

      if (loadedDesignId) {
        // Update existing design
        // Make sure we have the latest variant based on current color/size
        // Use 'M' as default size if no size selected
        const variantSize = selectedSize || 'M';
        const currentVariant = selectedVariant ||
          (selectedColor
            ? variants.find(v => v.color === selectedColor && v.size === variantSize)
            : null);

        console.log('[SAVE] Updating design with variant:', {
          variantId: currentVariant?.id,
          color: selectedColor,
          size: selectedSize,
          variant: currentVariant
        });

        await designAPI.update(loadedDesignId, {
          name: designName,
          variantId: currentVariant?.id,
          designData,
          artworkIds,
          thumbnailUrl
        });
        setSavedDesignName(designName);
      } else {
        // Save new design
        // Make sure we have the latest variant based on current color/size
        // Use 'M' as default size if no size selected
        const variantSize = selectedSize || 'M';
        const currentVariant = selectedVariant ||
          (selectedColor
            ? variants.find(v => v.color === selectedColor && v.size === variantSize)
            : null);

        console.log('[SAVE] Saving new design with variant:', {
          variantId: currentVariant?.id,
          color: selectedColor,
          size: selectedSize,
          variant: currentVariant
        });

        const saved = await designAPI.save({
          name: designName,
          productId: product.id,
          variantId: currentVariant?.id,
          designData,
          artworkIds,
          thumbnailUrl
        });
        setLoadedDesignId(saved.id);
        setSavedDesignName(designName);

        // Track design saved in Google Analytics
        trackDesignSaved(designName);
      }
    } catch (error: any) {
      console.error('Error saving design:', error);
      throw error; // Re-throw so the modal can handle it
    }
  };

  const handleAddToCart = () => {
    if (!selectedColor || !selectedSize) {
      setToastMessage('Please select a color and size');
      setShowToast(true);
      return;
    }

    // Capture mockup image from canvas
    let mockupUrl;
    try {
      if (canvasRef.current && canvasRef.current.captureImage) {
        mockupUrl = canvasRef.current.captureImage();
      }
    } catch (error) {
      console.error('Error capturing mockup:', error);
    }

    // Use selected variant or create a temporary one for Navy
    const variant = selectedVariant || {
      id: `temp-${selectedColor}-${selectedSize}`,
      color: selectedColor,
      size: selectedSize,
      base_price: 12.98
    };

    const cartItem = {
      id: editingCartItemId || `${variant.id}-${Date.now()}`,
      variantId: variant.id,
      productTitle: product.title,
      variantColor: selectedColor,
      variantSize: selectedSize,
      quantity,
      unitPrice: unitCost,
      customization: {
        method: 'dtg',
        frontArtworks,
        backArtworks,
        neckArtwork,
      },
      mockupUrl, // Include the mockup image
    };

    if (editingCartItemId) {
      // Update existing cart item
      updateItem(editingCartItemId, cartItem);
      setToastMessage('Cart item updated successfully!');
    } else {
      // Add new item to cart
      addItem(cartItem);
      setToastMessage('Added to cart successfully!');
    }

    setShowToast(true);

    // Navigate to cart after showing toast
    setTimeout(() => {
      navigate('/cart');
    }, 1500);
  };

  // Auto-open appropriate section when view changes
  // Note: View switching functionality for front/back views

  return (
    <div className="min-h-screen bg-white">
      {/* Custom Compact Header for Customizer */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="relative px-3 sm:px-6 py-3 sm:py-1.5 flex items-center justify-between">
          {/* Product Title - Left (hide on mobile, use as spacer) */}
          <div className="hidden sm:block text-sm font-bold min-w-0">
            {product.title}
          </div>

          {/* Mobile: Left back button */}
          <Link to="/" className="sm:hidden text-sm font-medium text-gray-600 hover:text-gray-900">
            ← Back
          </Link>

          {/* Stolen Tee Logo - Center (desktop only) */}
          <Link to="/" className="hidden sm:block absolute left-1/2 -translate-x-1/2 text-lg font-bold hover:text-gray-600 transition-colors">
            Stolen Tee
          </Link>

          {/* Save Design Button and Price - Right */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleDownloadDesign}
              disabled={!currentArtwork}
              title="Download Design"
              className={`hidden sm:flex p-2 rounded-md transition-colors ${
                currentArtwork
                  ? 'text-gray-700 hover:bg-gray-100'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
            >
              <ArrowDownToLine size={18} />
            </button>
            <button
              onClick={handleSaveDesign}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-1.5 text-xs font-medium rounded-md transition-colors bg-black text-white hover:bg-gray-800"
            >
              <Save size={14} />
              <span className="hidden sm:inline">{loadedDesignId ? 'Update' : 'Save'}</span>
              <span className="sm:hidden">{loadedDesignId ? 'Update' : 'Save'}</span>
            </button>
            <div className="hidden md:block text-sm font-normal whitespace-nowrap">
              from ${TSHIRT_BASE_PRICE.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-60px)]">
        {/* Left - Upload Section (1/4 width) */}
        <div className="w-1/4 bg-gray-50 border-r border-gray-200 overflow-y-auto p-6">
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-2">Upload Shirt Photo</h2>
            <p className="text-gray-600 text-sm mb-4">Upload a photo of your shirt and we'll extract the design automatically</p>

            {/* AI Disclaimer */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-900">
                This is done using AI, and sometimes it requires multiple tries to get your perfect, desired result.
              </p>
            </div>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer bg-white">
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileUpload}
                className="hidden"
                id="shirt-photo-upload"
                disabled={jobStatus === 'uploading' || jobStatus === 'processing'}
              />
              <label htmlFor="shirt-photo-upload" className="cursor-pointer">
                <Upload className="mx-auto mb-3 text-gray-400" size={36} />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  JPG or PNG up to 25MB
                </p>
              </label>
            </div>

            {/* Status Indicator - Progress Bar */}
            {(jobStatus === 'uploading' || jobStatus === 'processing') && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-blue-900">
                      Stealing your t-shirt
                    </p>
                    <p className="text-xs font-semibold text-blue-700">
                      {jobProgress.percent}%
                    </p>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${jobProgress.percent}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-xs text-blue-700 transition-opacity duration-300">
                  {DISCLAIMER_MESSAGES[disclaimerIndex]}
                </p>
              </div>
            )}

            {/* Success Message */}
            {jobStatus === 'done' && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-900">
                  Logo extracted successfully! You can now position it on the shirt.
                </p>
              </div>
            )}

            {/* Error Message */}
            {jobStatus === 'error' && jobError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-900">
                  Error: {jobError}
                </p>
                <button
                  onClick={() => {
                    setJobStatus('idle');
                    setJobError(null);
                    setCurrentJobId(null);
                  }}
                  className="mt-2 text-xs text-red-700 underline hover:text-red-900"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Artwork Files Display */}
            {extractedArtworkUrl && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Artwork File</h3>

                {/* Extracted Artwork */}
                <div className="bg-white border-2 border-green-300 rounded-lg p-3 hover:border-green-400 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded border border-gray-200 overflow-hidden" style={{
                      backgroundImage: 'repeating-conic-gradient(#f0f0f0 0% 25%, transparent 0% 50%) 50% / 10px 10px'
                    }}>
                      <img
                        src={extractedArtworkUrl}
                        alt="Extracted artwork"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">Print-Ready Artwork</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          300 DPI
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">Transparent PNG · Ready for printing</p>
                      <a
                        href={extractedArtworkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View Full Size
                      </a>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 italic mt-2">
                  💡 Click "View Full Size" to inspect the print file that will be sent to production
                </p>
              </div>
            )}

            {/* Garment Color */}
            <div className="mt-8 border-t border-gray-200 pt-6">
              <label className="block text-sm font-semibold mb-4">Garment Color</label>
              <div className="grid grid-cols-2 gap-3">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                      selectedColor === color
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full border border-gray-300"
                      style={{
                        backgroundColor:
                          color === 'White' ? '#FFFFFF' :
                          color === 'Black' ? '#000000' :
                          color === 'Navy' ? '#001f3f' :
                          color.toLowerCase()
                      }}
                    ></div>
                    <span className="text-sm font-medium">{color}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div className="mt-6 border-t border-gray-200 pt-6">
              <label className="block text-sm font-semibold mb-4">Size</label>
              <div className="grid grid-cols-3 gap-3">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-3 border-2 rounded-lg text-sm font-medium transition-all ${
                      selectedSize === size
                        ? 'border-black bg-black text-white'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="mt-6 border-t border-gray-200 pt-6">
              <label className="block text-sm font-semibold mb-4">Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black"
              />
            </div>

            {/* Price Summary */}
            <div className="mt-6 border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Unit Price</span>
                <span className="text-lg font-semibold">${unitCost.toFixed(2)}</span>
              </div>
              {quantity >= 2 && (
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span>${(unitCost * quantity).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Add to Cart Button */}
            <div className="pt-6">
              <button
                onClick={handleAddToCart}
                disabled={!selectedColor || !selectedSize}
                className="w-full py-3.5 sm:py-3 bg-black text-white text-base sm:text-sm font-medium rounded-full hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {editingCartItemId ? 'Update Cart' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>

        {/* Right - Canvas Area (3/4 width) */}
        <div className="w-3/4 bg-white flex flex-col relative overflow-hidden">
          {/* Interactive Canvas Preview */}
          <div className="h-full flex items-center justify-center pt-2 pb-16 px-6">
            {product.slug === 'classic-hoodie' ? (
              <HoodieCanvas
                ref={canvasRef}
                artworks={getCurrentArtworks()}
                view={view}
                onArtworkPositionChange={(pos, index) => {
                  if (view === 'front') {
                    const updated = [...frontArtworks];
                    updated[index] = { ...updated[index], position: pos };
                    setFrontArtworks(updated);
                  } else if (view === 'back') {
                    const updated = [...backArtworks];
                    updated[index] = { ...updated[index], position: pos };
                    setBackArtworks(updated);
                  }
                }}
                onArtworkDelete={(index) => {
                  if (view === 'front') {
                    const updated = frontArtworks.filter((_, i) => i !== index);
                    setFrontArtworks(updated);
                  } else if (view === 'back') {
                    const updated = backArtworks.filter((_, i) => i !== index);
                    setBackArtworks(updated);
                  }
                }}
              />
            ) : (
              <TShirtCanvas
                ref={canvasRef}
                tshirtColor={selectedColor}
                artworks={getCurrentArtworks()}
                view={view}
                onArtworkPositionChange={(pos, index) => {
                // Save position to current view's artwork at specific index
                if (view === 'front') {
                  const updated = [...frontArtworks];
                  updated[index] = { ...updated[index], position: pos };
                  setFrontArtworks(updated);
                } else if (view === 'back') {
                  const updated = [...backArtworks];
                  updated[index] = { ...updated[index], position: pos };
                  setBackArtworks(updated);
                }
              }}
              onArtworkDelete={(index) => {
                // Delete artwork from current view
                if (view === 'front') {
                  const updated = frontArtworks.filter((_, i) => i !== index);
                  setFrontArtworks(updated);
                } else if (view === 'back') {
                  const updated = backArtworks.filter((_, i) => i !== index);
                  setBackArtworks(updated);
                }
              }}
            />
            )}
          </div>

          {/* View Switcher - Minimal */}
          <div className="absolute bottom-4 lg:bottom-8 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-lg px-1.5 sm:px-2 py-1.5 sm:py-2 flex gap-1">
            <button
              onClick={() => setView('front')}
              className={`px-4 sm:px-5 py-2.5 sm:py-2 rounded-full text-sm font-medium transition-colors ${
                view === 'front'
                  ? 'bg-black text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Front
            </button>
            <button
              onClick={() => setView('back')}
              className={`px-4 sm:px-5 py-2.5 sm:py-2 rounded-full text-sm font-medium transition-colors ${
                view === 'back'
                  ? 'bg-black text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Save Design Modal */}
      <SaveDesignModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={performSaveDesign}
        isUpdating={!!loadedDesignId}
        currentName={savedDesignName}
      />

      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}

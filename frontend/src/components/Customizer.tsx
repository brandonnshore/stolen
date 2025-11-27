import { useState, useEffect, useRef, useMemo } from 'react';
import { Product, Variant } from '../types';
import { uploadAPI, designAPI, jobAPI } from '../services/api';
import { useCartStore } from '../stores/cartStore';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, Save, ArrowUp, Minus, Plus, Info, Check } from 'lucide-react';
import toast from 'react-hot-toast';
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

  const [frontArtworks, setFrontArtworks] = useState<Array<{ url: string, position: any, assetId?: string }>>([]);
  const [backArtworks, setBackArtworks] = useState<Array<{ url: string, position: any, assetId?: string }>>([]);
  const [neckArtwork, setNeckArtwork] = useState<{ url: string, position: any, assetId?: string } | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [uploadTargetView, setUploadTargetView] = useState<'front' | 'back'>('front'); // Track where to place uploaded image
  const [jobStatus, setJobStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle');
  const [jobError, setJobError] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<{ message: string, percent: number }>({ message: '', percent: 0 });
  const [disclaimerIndex, setDisclaimerIndex] = useState(0);

  // Track uploaded and extracted artwork files for display

  // Auto-save state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savedDesignName, setSavedDesignName] = useState('');

  // Toast notification state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Add to cart loading state for debouncing
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addToCartSuccess, setAddToCartSuccess] = useState(false);

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
    // Always return cleanup function to prevent React warnings
    return () => {};
  }, [jobStatus]);

  // Current view's artwork
  const getCurrentArtworks = () => {
    if (view === 'front') return frontArtworks;
    if (view === 'back') return backArtworks;
    return [];
  };

  const currentArtwork = getCurrentArtworks()[0] || null;

  // Memoize expensive unitCost calculation
  const unitCost = useMemo(() => calculateUnitCost(
    frontArtworks.length > 0,
    backArtworks.length > 0,
    false, // No neck artwork
    TSHIRT_BASE_PRICE
  ), [frontArtworks.length, backArtworks.length]);

  // Memoize color list computation
  const colors = useMemo(() => {
    const dbColors = [...new Set(variants.map((v) => v.color))];
    return dbColors.includes('Navy') ? dbColors : [...dbColors, 'Navy'];
  }, [variants]);

  // Memoize sizes computation
  const sizes = useMemo(() => {
    return [...new Set(variants.map((v) => v.size))].sort((a, b) => {
      return SIZES.indexOf(a as any) - SIZES.indexOf(b as any);
    });
  }, [variants]);

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
    let pollInterval: NodeJS.Timeout | null = null;
    let animationInterval: NodeJS.Timeout | null = null;
    let isActive = true; // Track if this effect is still active

    // Cleanup function that ensures intervals are cleared
    const cleanup = () => {
      isActive = false;
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
      }
    };

    pollInterval = setInterval(async () => {
      if (!isActive) {
        cleanup();
        return;
      }

      try {
        const job = await jobAPI.getStatus(currentJobId);
        if (import.meta.env.DEV) console.log('Job status:', job);

        // Handle null response (job not found)
        if (!job) {
          console.error('Job not found:', currentJobId);
          setJobStatus('error');
          setJobError('Job not found. Please try uploading again.');
          cleanup();
          return;
        }

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
          if (!isActive) return; // Prevent setState on unmounted component

          setJobStatus('done');
          setJobProgress({ message: 'Complete!', percent: 100 });
          cleanup(); // Stop polling immediately

          // Extract the transparent logo asset from the assets array
          const transparentAsset = job.assets?.find((asset: any) => asset.kind === 'transparent');

          if (transparentAsset) {
            const logoUrl = getFullAssetUrl(transparentAsset.file_url);



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
          if (!isActive) return; // Prevent setState on unmounted component

          setJobStatus('error');
          setJobError(job.errorMessage || 'Extraction failed');
          cleanup(); // Stop polling immediately
        }
      } catch (error: any) {
        console.error('Failed to poll job status:', error);
        console.error('Error details:', error.response?.data || error.message);
        setJobStatus('error');
        setJobError(error.response?.data?.message || error.message || 'Failed to check extraction status');
        cleanup(); // Stop polling immediately
      }
    }, 2000); // Poll every 2 seconds

    // Smooth progress animation - gradually increase to target
    animationInterval = setInterval(() => {
      if (!isActive) {
        cleanup();
        return;
      }

      setJobProgress((prev) => {
        if (prev.percent < targetPercent) {
          // Increment by 1-2% every 100ms for smooth animation
          const increment = Math.min(2, targetPercent - prev.percent);
          return { message: 'Stealing your t-shirt', percent: prev.percent + increment };
        }
        return prev;
      });
    }, 100);

    // Cleanup on unmount or when dependencies change
    return cleanup;
  }, [currentJobId, jobStatus]);

  // AUTO-SAVE: Save design state to localStorage every 30 seconds
  useEffect(() => {
    const hasDesignContent = frontArtworks.length > 0 || backArtworks.length > 0 || neckArtwork !== null;

    if (!hasDesignContent) {
      return; // Don't save empty designs
    }

    const autoSaveInterval = setInterval(() => {
      setIsSaving(true);

      const designDraft = {
        frontArtworks,
        backArtworks,
        neckArtwork,
        selectedColor,
        selectedSize,
        productSlug: product.slug,
        timestamp: Date.now(),
      };

      localStorage.setItem('design-draft', JSON.stringify(designDraft));
      setLastSaved(new Date());

      setTimeout(() => setIsSaving(false), 500);
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [frontArtworks, backArtworks, neckArtwork, selectedColor, selectedSize, product.slug]);

  // RESTORE: Check for design draft on mount
  useEffect(() => {
    const draftJson = localStorage.getItem('design-draft');
    if (!draftJson) return;

    try {
      const draft = JSON.parse(draftJson);

      // Only restore if it's for the same product and recent (< 24 hours)
      const age = Date.now() - draft.timestamp;
      const isRecent = age < 24 * 60 * 60 * 1000; // 24 hours
      const isSameProduct = draft.productSlug === product.slug;

      if (isRecent && isSameProduct && !loadedDesignId) {
        // Show toast asking to restore with custom action buttons
        toast(
          (t) => (
            <div className="flex flex-col gap-2">
              <p className="font-medium">Found unsaved design from {new Date(draft.timestamp).toLocaleString()}.</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    if (draft.frontArtworks) setFrontArtworks(draft.frontArtworks);
                    if (draft.backArtworks) setBackArtworks(draft.backArtworks);
                    if (draft.neckArtwork) setNeckArtwork(draft.neckArtwork);
                    if (draft.selectedColor) setSelectedColor(draft.selectedColor);
                    if (draft.selectedSize) setSelectedSize(draft.selectedSize);
                    toast.success('Design restored successfully!');
                    toast.dismiss(t.id);
                  }}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                  Restore
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('design-draft');
                    toast.dismiss(t.id);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ),
          {
            duration: 10000,
            position: 'top-center',
          }
        );
      } else if (!isRecent) {
        // Clean up old drafts
        localStorage.removeItem('design-draft');
      }
    } catch (error) {
      console.error('Error restoring design draft:', error);
      localStorage.removeItem('design-draft');
    }
  }, [product.slug]); // Only run once per product

  // UPLOAD RECOVERY: Save job state to localStorage
  useEffect(() => {
    if (currentJobId && (jobStatus === 'uploading' || jobStatus === 'processing')) {
      const uploadState = {
        jobId: currentJobId,
        view: uploadTargetView,
        status: jobStatus,
        timestamp: Date.now(),
      };
      localStorage.setItem('pendingUpload', JSON.stringify(uploadState));
    } else if (jobStatus === 'done' || jobStatus === 'error') {
      localStorage.removeItem('pendingUpload');
    }
  }, [currentJobId, jobStatus, uploadTargetView]);

  // RESTORE UPLOAD: Check for interrupted upload on mount
  useEffect(() => {
    const pendingUploadJson = localStorage.getItem('pendingUpload');
    if (!pendingUploadJson) return;

    try {
      const pendingUpload = JSON.parse(pendingUploadJson);

      // Only resume if upload was recent (< 10 minutes)
      const age = Date.now() - pendingUpload.timestamp;
      const isRecent = age < 10 * 60 * 1000; // 10 minutes

      if (isRecent && pendingUpload.jobId) {
        setToastMessage('Resuming previous upload...');
        setShowToast(true);

        setCurrentJobId(pendingUpload.jobId);
        setUploadTargetView(pendingUpload.view || 'front');
        setJobStatus('processing');
        setJobProgress({ message: 'Resuming extraction...', percent: 15 });
      } else {
        // Clean up old pending uploads
        localStorage.removeItem('pendingUpload');
      }
    } catch (error) {
      console.error('Error resuming upload:', error);
      localStorage.removeItem('pendingUpload');
    }
  }, []); // Run only once on mount

  // BEFOREUNLOAD: Warn user before leaving if they have unsaved work
  useEffect(() => {
    const hasUnsavedWork = frontArtworks.length > 0 || backArtworks.length > 0 || neckArtwork !== null;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedWork && !loadedDesignId) {
        e.preventDefault();
        e.returnValue = 'You have unsaved design work. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    if (hasUnsavedWork) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [frontArtworks, backArtworks, neckArtwork, loadedDesignId]);

  const loadDesign = async (designId: string) => {
    try {
      const design = await designAPI.getById(designId);
      if (import.meta.env.DEV) console.log('[LOAD] Full design object:', JSON.stringify(design, null, 2));
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
      if (import.meta.env.DEV) console.log('[LOAD] Design variant_id:', design.variant_id);
      if (import.meta.env.DEV) console.log('[LOAD] Design variant_color:', design.variant_color);
      if (import.meta.env.DEV) console.log('[LOAD] Design variant_size:', design.variant_size);
      if (import.meta.env.DEV) console.log('[LOAD] Design data color/size:', design.design_data?.selectedColor, design.design_data?.selectedSize);

      // PRIORITY: design_data.selectedColor takes precedence over variant_color
      // This is because Navy (and other UI-only colors) are stored in design_data
      let colorToSet: string | null = null;
      let sizeToSet: string | null = null;

      // First: Check design_data for the most recent color selection
      if (design.design_data?.selectedColor) {
        if (import.meta.env.DEV) console.log('[LOAD] Using color from design_data (highest priority):', design.design_data.selectedColor);
        colorToSet = design.design_data.selectedColor;
        sizeToSet = design.design_data.selectedSize || 'M';

        // Try to find a matching variant for this color
        const variant = variants.find(v => v.color === colorToSet && v.size === sizeToSet);
        if (variant) {
          if (import.meta.env.DEV) console.log('[LOAD] Found matching variant for design_data color:', variant);
          setSelectedVariant(variant);
        } else {
          if (import.meta.env.DEV) console.log('[LOAD] No variant found for color:', colorToSet, '(UI-only color like Navy)');
        }
      }
      // Second: Fall back to variant_id/variant_color if no design_data
      else if (design.variant_id) {
        let variant = variants.find(v => v.id === design.variant_id);
        if (import.meta.env.DEV) console.log('[LOAD] Found variant by ID:', variant);

        // If variant not found by ID, try to find by color and size from JOIN
        if (!variant && design.variant_color && design.variant_size) {
          if (import.meta.env.DEV) console.log('[LOAD] Variant ID not found, trying color/size lookup:', design.variant_color, design.variant_size);
          variant = variants.find(v => v.color === design.variant_color && v.size === design.variant_size);
          if (import.meta.env.DEV) console.log('[LOAD] Found variant by color/size:', variant);
        }

        if (variant) {
          if (import.meta.env.DEV) console.log('[LOAD] Setting color/size/variant from variant:', variant.color, variant.size);
          colorToSet = variant.color;
          sizeToSet = variant.size;
          setSelectedVariant(variant);
        } else if (design.variant_color) {
          // No variant found, but we have color info from JOIN
          if (import.meta.env.DEV) console.log('[LOAD] No variant found, using color from JOIN:', design.variant_color);
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
      setJobError('Failed to load design. Please try again.');
      setJobStatus('error');
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

      if (import.meta.env.DEV) console.log('Shirt photo uploaded:', { asset, jobId, message });

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
      setToastMessage('Download started!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
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
        setJobError('Failed to update design. Please try again.');
        setJobStatus('error');
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

        if (import.meta.env.DEV) console.log('[SAVE] Updating design with variant:', {
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

        if (import.meta.env.DEV) console.log('[SAVE] Saving new design with variant:', {
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
    // Prevent rapid clicking
    if (isAddingToCart) {
      return;
    }

    if (!selectedColor || !selectedSize) {
      setToastMessage('Please select a color and size');
      setShowToast(true);
      return;
    }

    setIsAddingToCart(true);

    try {
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

      // Show success state briefly before navigating
      setAddToCartSuccess(true);
      setTimeout(() => {
        setIsAddingToCart(false);
        setAddToCartSuccess(false);
        navigate('/cart');
      }, 1500);
    } catch (error) {
      console.error('Error adding to cart:', error);
      setToastMessage('Failed to add to cart. Please try again.');
      setShowToast(true);
      setIsAddingToCart(false);
    }
  };

  // Auto-open appropriate section when view changes
  // Note: View switching functionality for front/back views

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-0">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="relative px-4 py-3 flex items-center justify-between md:justify-center">
          {/* Mobile: Back button */}
          <Link to="/" className="md:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </Link>

          {/* Product Title */}
          <div className="text-base font-bold text-center md:absolute md:left-6 md:text-sm">
            {product.title}
          </div>

          {/* Desktop Logo */}
          <Link to="/" className="hidden md:block absolute left-1/2 -translate-x-1/2 text-lg font-bold hover:text-gray-600 transition-colors">
            Stolen Tee
          </Link>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3 absolute right-6">
            {/* Auto-save indicator */}
            {(isSaving || lastSaved) && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-500"></div>
                    <span>Saving...</span>
                  </>
                ) : lastSaved ? (
                  <span>Saved {new Date(lastSaved).toLocaleTimeString()}</span>
                ) : null}
              </div>
            )}
            <button
              onClick={handleDownloadDesign}
              disabled={!currentArtwork}
              title="Download Design"
              className={`p-2 rounded-md transition-colors ${currentArtwork ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
                }`}
            >
              <ArrowDownToLine size={18} />
            </button>
            <button
              onClick={handleSaveDesign}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md transition-colors bg-black text-white hover:bg-gray-800"
            >
              <Save size={14} />
              <span>{loadedDesignId ? 'Update' : 'Save'}</span>
            </button>
            <div className="text-sm font-normal whitespace-nowrap">
              from ${TSHIRT_BASE_PRICE.toFixed(2)}
            </div>
          </div>

          {/* Mobile: Spacer */}
          <div className="md:hidden w-10"></div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-60px)]">
        {/* Canvas Area */}
        <div className="w-full md:w-3/4 bg-gray-50 md:bg-white flex flex-col relative overflow-hidden order-1 md:order-2 h-[60vh] md:h-auto shrink-0">
          <div className="h-full flex items-center justify-center pt-4 pb-12 px-4">
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

          {/* View Switcher */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm border border-gray-200 p-1 flex gap-1 z-10">
            <button
              onClick={() => setView('front')}
              className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${view === 'front' ? 'bg-black text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Front
            </button>
            <button
              onClick={() => setView('back')}
              className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${view === 'back' ? 'bg-black text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Back
            </button>
          </div>
        </div>

        {/* Controls Area */}
        <div className="w-full md:w-1/4 bg-white border-r border-gray-200 overflow-y-auto order-2 md:order-1">
          <div className="p-6 space-y-8 pb-32 md:pb-6">

            {/* Upload Section */}
            <div>
              <h2 className="text-lg font-bold mb-2">Upload & Extract Design</h2>
              <p className="text-gray-500 text-sm mb-4">Upload a photo and we'll extract the design using AI</p>

              <div className="mb-4 p-3 bg-blue-50 rounded-lg flex gap-2 items-start">
                <div className="text-blue-500 mt-0.5"><Info size={16} /></div>
                <p className="text-xs text-blue-600 font-medium">
                  AI extraction may require multiple tries for best results
                </p>
              </div>

              <div className="border-2 border-dashed border-blue-300 bg-blue-50/30 rounded-xl p-8 text-center hover:bg-blue-50 transition-colors cursor-pointer relative group">
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={jobStatus === 'uploading' || jobStatus === 'processing'}
                />
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 text-white shadow-lg shadow-blue-200">
                  <ArrowUp size={24} />
                </div>
                <p className="text-base font-bold text-gray-900">Tap to Upload Photo</p>
                <p className="text-xs text-gray-500 mt-1">JPG or PNG up to 25MB</p>
              </div>

              {/* Status Indicators */}
              {(jobStatus === 'uploading' || jobStatus === 'processing') && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-blue-900">Stealing your t-shirt</p>
                    <p className="text-xs font-semibold text-blue-700">{jobProgress.percent}%</p>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${jobProgress.percent}%` }}></div>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">{DISCLAIMER_MESSAGES[disclaimerIndex]}</p>
                </div>
              )}

              {jobStatus === 'error' && jobError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-900">Error: {jobError}</p>
                  <button onClick={() => { setJobStatus('idle'); setJobError(null); setCurrentJobId(null); }} className="mt-2 text-xs text-red-700 underline">Try again</button>
                </div>
              )}

              {/* Extracted Artwork Preview */}
              {jobStatus === 'done' && currentJobId && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-900 mb-3">Extraction Complete!</p>
                  <p className="text-xs text-green-700 mb-3">Your extracted logo (click to open in new tab):</p>
                  <div className="flex gap-3">
                    {/* Show the extracted transparent artwork */}
                    {(() => {
                      const targetArtworks = uploadTargetView === 'back' ? backArtworks : frontArtworks;
                      const latestArtwork = targetArtworks[targetArtworks.length - 1];
                      if (latestArtwork) {
                        return (
                          <a
                            href={latestArtwork.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-24 h-24 border-2 border-green-300 rounded-lg overflow-hidden bg-white hover:border-green-500 transition-all hover:scale-105"
                          >
                            <img
                              src={latestArtwork.url}
                              alt="Extracted artwork"
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          </a>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <button
                    onClick={() => { setJobStatus('idle'); setJobError(null); setCurrentJobId(null); }}
                    className="mt-3 text-xs text-green-700 underline"
                  >
                    Upload another image
                  </button>
                </div>
              )}
            </div>

            {/* Color Selector */}
            <div>
              <h3 className="text-lg font-bold mb-4">T-Shirt Color</h3>
              <div className="flex gap-6">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div
                      className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${selectedColor === color ? 'border-blue-500 scale-110' : 'border-gray-200'
                        }`}
                    >
                      <div
                        className="w-10 h-10 rounded-full border border-gray-100 shadow-sm"
                        style={{
                          backgroundColor: color === 'White' ? '#FFFFFF' : color === 'Black' ? '#000000' : color === 'Navy' ? '#001f3f' : color.toLowerCase()
                        }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${selectedColor === color ? 'text-black' : 'text-gray-500'}`}>
                      {color}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selector */}
            <div>
              <h3 className="text-lg font-bold mb-4">Size</h3>
              <div className="grid grid-cols-4 gap-3">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`py-3 rounded-lg text-sm font-medium transition-all ${selectedSize === size
                      ? 'bg-black text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
              <span className="font-bold text-gray-900">Quantity</span>
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-300 transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="font-bold text-lg w-4 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Price */}
            <div className="flex justify-between items-center px-2 py-2 border-t border-gray-100">
              <span className="text-gray-500">Unit Price</span>
              <span className="text-xl font-bold">${unitCost.toFixed(2)}</span>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleAddToCart}
                disabled={!selectedColor || !selectedSize || isAddingToCart}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg shadow-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  addToCartSuccess
                    ? 'bg-green-600 text-white'
                    : 'bg-black text-white hover:bg-gray-900'
                }`}
              >
                {addToCartSuccess ? (
                  <>
                    <Check size={20} /> Added!
                  </>
                ) : isAddingToCart ? (
                  'Adding...'
                ) : (
                  editingCartItemId ? 'Update Cart' : 'Add to Cart'
                )}
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleDownloadDesign}
                  disabled={!currentArtwork}
                  className="py-3 rounded-xl border border-gray-200 font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowDownToLine size={18} /> Download
                </button>
                <button
                  onClick={handleSaveDesign}
                  className="py-3 rounded-xl border border-gray-200 font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                >
                  <Save size={18} /> Save
                </button>
              </div>
            </div>

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

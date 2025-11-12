import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer } from 'react-konva';
import Konva from 'konva';
import { CANVAS_CONFIG, TSHIRT_BOUNDS } from '../constants/canvas';

interface TShirtCanvasProps {
  tshirtColor?: string;
  artworks?: Array<{url: string, position: any}>;
  onArtworkPositionChange?: (data: any, index: number) => void;
  onArtworkDelete?: (index: number) => void;
  view?: 'front' | 'neck' | 'back';
}

const TShirtCanvas = forwardRef(({
  tshirtColor = 'white',
  artworks = [],
  onArtworkPositionChange,
  onArtworkDelete,
  view = 'front',
}: TShirtCanvasProps, ref) => {
  const [tshirtImage, setTshirtImage] = useState<HTMLImageElement | null>(null);
  const [artworkImages, setArtworkImages] = useState<HTMLImageElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const imageRefs = useRef<(Konva.Image | null)[]>([]);
  const trRef = useRef<Konva.Transformer>(null);
  const stageRef = useRef<Konva.Stage>(null);

  // Cache for t-shirt images ONLY
  const cachedImages = useRef<{
    front: HTMLImageElement | null;
    back: HTMLImageElement | null;
    neck: HTMLImageElement | null;
  }>({
    front: null,
    back: null,
    neck: null,
  });

  const activeView = useRef<'front' | 'back' | 'neck'>('front');

  // Load t-shirt image and calculate proper dimensions
  const [tshirtDimensions, setTshirtDimensions] = useState({ width: 550, height: 650 });

  // Expose download function to parent component
  useImperativeHandle(ref, () => ({
    downloadImage: async () => {
      if (!stageRef.current) return;
      setSelectedId(null);

      const stage = stageRef.current;
      const stageWidth = stage.width();
      const stageHeight = stage.height();

      // Create watermark layer
      const watermarkLayer = new Konva.Layer();

      // Load Stolen Tee logo
      const logoImg = new window.Image();
      logoImg.crossOrigin = 'anonymous';

      await new Promise<void>((resolve) => {
        logoImg.onload = () => {
          // Logo dimensions (very small size)
          const logoWidth = 40;
          const logoHeight = (logoImg.height / logoImg.width) * logoWidth;

          // Position: right at the bottom, 5px from edge
          const logoX = (stageWidth - logoWidth) / 2;
          const logoY = stageHeight - logoHeight - 20; // 5px + text height

          // Add logo
          const logo = new Konva.Image({
            image: logoImg,
            x: logoX,
            y: logoY,
            width: logoWidth,
            height: logoHeight,
            opacity: 1.0,
          });
          watermarkLayer.add(logo);

          // Add stolentee.com text below logo
          const text = new Konva.Text({
            x: 0,
            y: logoY + logoHeight + 3,
            width: stageWidth,
            text: 'stolentee.com',
            fontSize: 8,
            fontFamily: 'Arial, sans-serif',
            fill: '#000000',
            align: 'center',
            opacity: 1.0,
          });
          watermarkLayer.add(text);

          resolve();
        };
        logoImg.src = '/assets/stolentee-logo.png';
      });

      // Add watermark layer to stage
      stage.add(watermarkLayer);
      watermarkLayer.moveToTop();

      // Export with watermark
      const uri = stage.toDataURL({
        pixelRatio: CANVAS_CONFIG.EXPORT_PIXEL_RATIO_HIGH,
        mimeType: 'image/png',
        quality: CANVAS_CONFIG.EXPORT_QUALITY_HIGH
      });

      // Remove watermark layer
      watermarkLayer.destroy();

      // Download
      const link = document.createElement('a');
      link.download = 'tshirt-design.png';
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    getThumbnail: () => {
      if (!stageRef.current) return null;
      return stageRef.current.toDataURL({
        pixelRatio: CANVAS_CONFIG.EXPORT_PIXEL_RATIO_LOW,
        mimeType: 'image/png',
        quality: CANVAS_CONFIG.EXPORT_QUALITY_LOW
      });
    },
    captureImage: () => {
      if (!stageRef.current) return null;
      setSelectedId(null);
      return stageRef.current.toDataURL({
        pixelRatio: CANVAS_CONFIG.EXPORT_PIXEL_RATIO_MEDIUM,
        mimeType: 'image/png',
        quality: CANVAS_CONFIG.EXPORT_QUALITY_MEDIUM
      });
    },
    getThumbnailBlob: async (): Promise<Blob | null> => {
      if (!stageRef.current) return null;
      const dataUrl = stageRef.current.toDataURL({
        pixelRatio: CANVAS_CONFIG.EXPORT_PIXEL_RATIO_LOW,
        mimeType: 'image/png',
        quality: CANVAS_CONFIG.EXPORT_QUALITY_LOW
      });
      const response = await fetch(dataUrl);
      return await response.blob();
    },
    deselect: () => {
      setSelectedId(null);
    }
  }));

  // Helper function to get image paths based ONLY on t-shirt color
  const getImagePaths = (color: string) => {
    const colorLower = color.toLowerCase();

    // T-shirt images ONLY
    if (colorLower === 'navy') {
      return {
        front: '/assets/navy-front.png',
        back: '/assets/navy-back.png',
        neck: '/assets/navy-neck.png',
      };
    } else if (colorLower === 'black') {
      return {
        front: '/assets/black-front.png',
        back: '/assets/black-back.png',
        neck: '/assets/black-neck.png',
      };
    } else {
      // Default to white/blank
      return {
        front: '/assets/blank-tshirt.png',
        back: '/assets/back-tshirt.jpeg',
        neck: '/assets/neck-tshirt.jpeg',
      };
    }
  };

  // Preload all images on mount and when color OR product changes
  useEffect(() => {
    const preloadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve) => {
        const img = new window.Image();
        img.src = src;
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(img); // Still resolve on error
      });
    };

    const paths = getImagePaths(tshirtColor);

    // Preload all t-shirt views for current color
    Promise.all([
      preloadImage(paths.front),
      preloadImage(paths.back),
      preloadImage(paths.neck),
    ]).then(([frontImg, backImg, neckImg]) => {
      // Update cache with t-shirt images
      cachedImages.current = {
        front: frontImg,
        back: backImg,
        neck: neckImg
      };

      // Use the current view instead of always defaulting to front
      const currentViewImg = view === 'neck' ? neckImg : view === 'back' ? backImg : frontImg;

      // Calculate dimensions based on current view
      if (view === 'neck') {
        const aspectRatio = currentViewImg.width / currentViewImg.height;
        const containerWidth = 1600;
        const containerHeight = 950;

        let width = containerWidth;
        let height = width / aspectRatio;

        if (height < containerHeight) {
          height = containerHeight;
          width = height * aspectRatio;
        }

        setTshirtDimensions({ width, height });
      } else {
        const aspectRatio = currentViewImg.width / currentViewImg.height;
        const containerMaxWidth = 600;
        const containerMaxHeight = 700;

        let width = containerMaxWidth;
        let height = containerMaxWidth / aspectRatio;

        if (height > containerMaxHeight) {
          height = containerMaxHeight;
          width = containerMaxHeight * aspectRatio;
        }

        // Apply t-shirt color-specific scaling
        if (view === 'back') {
          const colorLower = tshirtColor?.toLowerCase() || '';

          if (colorLower === 'white' || colorLower === '') {
            // White back needs scaling to match front size
            width = width * 1.10;
            height = height * 1.10;
          } else if (colorLower === 'navy') {
            // Navy needs slight scaling adjustment
            width = width * 1.02;
            height = height * 1.02;
          }
          // Black front and back are already same size - no scaling needed
        }

        setTshirtDimensions({ width, height });
      }

      setTshirtImage(currentViewImg);
    });
  }, [tshirtColor, view]);

  // Instant view switching - no transition
  useEffect(() => {
    if (view === activeView.current) return;

    const cache = cachedImages.current;
    const nextImg = view === 'neck'
      ? cache.neck
      : view === 'back'
      ? cache.back
      : cache.front;

    if (!nextImg) return;

    // Calculate dimensions for new view
    if (view === 'neck') {
      const aspectRatio = nextImg.width / nextImg.height;
      const containerWidth = 1600;
      const containerHeight = 950;

      let width = containerWidth;
      let height = width / aspectRatio;

      if (height < containerHeight) {
        height = containerHeight;
        width = height * aspectRatio;
      }

      setTshirtDimensions({ width, height });
    } else {
      const aspectRatio = nextImg.width / nextImg.height;

      let width = CANVAS_CONFIG.CONTAINER_MAX_WIDTH;
      let height = CANVAS_CONFIG.CONTAINER_MAX_WIDTH / aspectRatio;

      if (height > CANVAS_CONFIG.CONTAINER_MAX_HEIGHT) {
        height = CANVAS_CONFIG.CONTAINER_MAX_HEIGHT;
        width = CANVAS_CONFIG.CONTAINER_MAX_HEIGHT * aspectRatio;
      }

      // Apply color-specific back view scaling to match front/back sizes
      if (view === 'back') {
        const colorLower = tshirtColor?.toLowerCase() || '';

        if (colorLower === 'white' || colorLower === '') {
          // White back needs scaling to match front size
          width = width * 1.10;
          height = height * 1.10;
        } else if (colorLower === 'navy') {
          // Navy needs slight scaling adjustment
          width = width * 1.02;
          height = height * 1.02;
        }
        // Black front and back are already same size - no scaling needed
      }

      setTshirtDimensions({ width, height });
    }

    // Instant swap - no animation
    setTshirtImage(nextImg);
    activeView.current = view;
  }, [view]);

  // Handle keyboard delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && onArtworkDelete) {
        // Extract index from selectedId (format: "artwork-0", "artwork-1", etc.)
        const index = parseInt(selectedId.split('-')[1]);
        if (!isNaN(index)) {
          onArtworkDelete(index);
          setSelectedId(null); // Deselect after deleting
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, onArtworkDelete]);

  // Cache for loaded artwork images by URL
  const artworkImageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // Function to auto-crop transparent areas from image
  const autoCropImage = (sourceImage: HTMLImageElement): HTMLImageElement => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return sourceImage;

    // Draw source image to canvas
    canvas.width = sourceImage.width;
    canvas.height = sourceImage.height;
    ctx.drawImage(sourceImage, 0, 0);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Find bounds of non-transparent pixels
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = 0;
    let maxY = 0;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const alpha = pixels[(y * canvas.width + x) * 4 + 3];
        if (alpha > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // If no opaque pixels found, return original
    if (minX > maxX || minY > maxY) {
      return sourceImage;
    }

    // Add small padding (5px) around the design
    const padding = 5;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(canvas.width - 1, maxX + padding);
    maxY = Math.min(canvas.height - 1, maxY + padding);

    // Calculate cropped dimensions
    const croppedWidth = maxX - minX + 1;
    const croppedHeight = maxY - minY + 1;

    // Create cropped canvas
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = croppedWidth;
    croppedCanvas.height = croppedHeight;
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) return sourceImage;

    // Draw cropped region
    croppedCtx.drawImage(
      sourceImage,
      minX, minY, croppedWidth, croppedHeight,
      0, 0, croppedWidth, croppedHeight
    );

    // Convert to image
    const croppedImage = new window.Image();
    croppedImage.src = croppedCanvas.toDataURL('image/png');
    return croppedImage;
  };

  // Load all artworks with caching and auto-cropping
  useEffect(() => {
    if (artworks.length === 0) {
      setArtworkImages([]);
      setSelectedId(null);
      imageRefs.current = [];
      return;
    }

    const loadNewArtworks = async () => {
      const promises = artworks.map((artwork) => {
        // Check cache first
        const cached = artworkImageCache.current.get(artwork.url);
        if (cached) {
          return Promise.resolve(cached);
        }

        // Load new image and cache it
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new window.Image();
          image.src = artwork.url;
          image.crossOrigin = 'anonymous';
          image.onload = () => {
            // Auto-crop the image to remove transparent padding
            const croppedImage = autoCropImage(image);

            // Wait for cropped image to load
            if (croppedImage.complete) {
              artworkImageCache.current.set(artwork.url, croppedImage);
              resolve(croppedImage);
            } else {
              croppedImage.onload = () => {
                artworkImageCache.current.set(artwork.url, croppedImage);
                resolve(croppedImage);
              };
              croppedImage.onerror = () => {
                // Fallback to original if cropping fails
                artworkImageCache.current.set(artwork.url, image);
                resolve(image);
              };
            }
          };
          image.onerror = reject;
        });
      });

      try {
        const loadedImages = await Promise.all(promises);
        setArtworkImages(loadedImages);
        imageRefs.current = new Array(loadedImages.length).fill(null);

        // Auto-select newly uploaded artwork (no position saved)
        const lastArtwork = artworks[artworks.length - 1];
        if (lastArtwork && !lastArtwork.position) {
          setSelectedId(`artwork-${artworks.length - 1}`);
        }
      } catch (err) {
        console.error('Failed to load artworks:', err);
      }
    };

    loadNewArtworks();
  }, [artworks]);

  // Update transformer when selection changes
  useEffect(() => {
    if (selectedId && trRef.current) {
      const index = parseInt(selectedId.split('-')[1]);
      const node = imageRefs.current[index];
      if (node) {
        trRef.current.nodes([node]);
        trRef.current.getLayer()?.batchDraw();
      }
    }
  }, [selectedId]);

  const handleTransformEnd = (index: number) => {
    const node = imageRefs.current[index];
    if (node && onArtworkPositionChange) {
      onArtworkPositionChange({
        x: node.x(),
        y: node.y(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
        rotation: node.rotation(),
      }, index);
    }
  };

  const checkDeselect = (e: any) => {
    // Check if clicked on empty canvas or the t-shirt image (not the artwork)
    const clickedOnStage = e.target === e.target.getStage();
    const clickedOnTshirt = e.target.image === tshirtImage;

    if (clickedOnStage || clickedOnTshirt) {
      setSelectedId(null);
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div
        className="relative flex items-center justify-center"
        style={{
          transform: typeof window !== 'undefined' && window.innerWidth < 640
            ? `scale(${Math.min(window.innerWidth / 600, 1)})`
            : 'scale(1)',
          transformOrigin: 'center center'
        }}
      >
        {/* Instructions overlay - Absolutely positioned above shirt */}
      {artworkImages.length > 0 && selectedId && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-4 py-2 rounded-full z-10">
          Drag to move • Corners to resize • Rotate to spin • Click away to finish
        </div>
      )}

      {/* Simple "Click to edit" hint when not selected */}
      {artworkImages.length > 0 && !selectedId && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-gray-800/60 text-white text-xs px-4 py-2 rounded-full z-10">
          Click artwork to edit position and size
        </div>
      )}

      {/* @ts-ignore - React-Konva types don't properly support children, but it works at runtime */}
      <Stage
        ref={stageRef}
        width={tshirtDimensions.width}
        height={tshirtDimensions.height}
        onMouseDown={checkDeselect}
        onTouchStart={checkDeselect}
      >
        {/* @ts-ignore - React-Konva types don't properly support children, but it works at runtime */}
        <Layer>
          {/* T-shirt background */}
          {tshirtImage && (
            <KonvaImage
              image={tshirtImage}
              x={0}
              y={0}
              width={tshirtDimensions.width}
              height={tshirtDimensions.height}
              onClick={() => setSelectedId(null)}
              onTap={() => setSelectedId(null)}
              {...(view === 'neck' ? {
                crop: {
                  x: 0,
                  y: 0,
                  width: tshirtImage.width,
                  height: tshirtImage.height
                }
              } : {})}
            />
          )}

          {/* Uploaded artworks */}
          {artworkImages.map((artworkImg, index) => {
            const artwork = artworks[index];
            if (!artwork) return null;

            const aspectRatio = artworkImg.width / artworkImg.height;

            let width = CANVAS_CONFIG.ARTWORK_MAX_WIDTH;
            let height = CANVAS_CONFIG.ARTWORK_MAX_WIDTH / aspectRatio;

            if (height > CANVAS_CONFIG.ARTWORK_MAX_HEIGHT) {
              height = CANVAS_CONFIG.ARTWORK_MAX_HEIGHT;
              width = CANVAS_CONFIG.ARTWORK_MAX_HEIGHT * aspectRatio;
            }

            return (
              <React.Fragment key={`artwork-${index}`}>
                <KonvaImage
                  ref={(el) => { imageRefs.current[index] = el; }}
                  image={artworkImg}
                  x={artwork.position?.x ?? (view === 'neck' ? 750 : 200 + index * 20)}
                  y={artwork.position?.y ?? (view === 'neck' ? 500 : 250 + index * 20)}
                  width={width}
                  height={height}
                  scaleX={artwork.position?.scaleX ?? 1}
                  scaleY={artwork.position?.scaleY ?? 1}
                  rotation={artwork.position?.rotation ?? 0}
                  draggable
                dragBoundFunc={(pos) => {
                  const shirtBounds = view === 'neck'
                    ? TSHIRT_BOUNDS.NECK
                    : view === 'back'
                    ? TSHIRT_BOUNDS.BACK
                    : TSHIRT_BOUNDS.FRONT;

                  // Get the actual bounding box of the image (includes rotation)
                  const node = imageRefs.current[index];
                  if (!node) return pos;

                  const box = node.getClientRect();
                  const boxWidth = box.width;
                  const boxHeight = box.height;

                  // Constrain position to keep artwork within bounds
                  let newX = pos.x;
                  let newY = pos.y;

                  // Calculate the offset from the node position to the bounding box
                  const offsetX = box.x - node.x();
                  const offsetY = box.y - node.y();

                  // Prevent artwork from going beyond left edge
                  if (newX + offsetX < shirtBounds.minX) {
                    newX = shirtBounds.minX - offsetX;
                  }
                  // Prevent artwork from going beyond right edge
                  if (newX + offsetX + boxWidth > shirtBounds.maxX) {
                    newX = shirtBounds.maxX - boxWidth - offsetX;
                  }
                  // Prevent artwork from going beyond top edge
                  if (newY + offsetY < shirtBounds.minY) {
                    newY = shirtBounds.minY - offsetY;
                  }
                  // Prevent artwork from going beyond bottom edge
                  if (newY + offsetY + boxHeight > shirtBounds.maxY) {
                    newY = shirtBounds.maxY - boxHeight - offsetY;
                  }

                  return {
                    x: newX,
                    y: newY
                  };
                }}
                onClick={() => setSelectedId(`artwork-${index}`)}
                onTap={() => setSelectedId(`artwork-${index}`)}
                onDragEnd={() => handleTransformEnd(index)}
                onTransformEnd={() => handleTransformEnd(index)}
              />
              {selectedId === `artwork-${index}` && (
                <Transformer
                  ref={trRef}
                  keepRatio={true}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < CANVAS_CONFIG.ARTWORK_MIN_SIZE || newBox.height < CANVAS_CONFIG.ARTWORK_MIN_SIZE) {
                      return oldBox;
                    }
                    if (newBox.width > CANVAS_CONFIG.ARTWORK_MAX_RESIZE || newBox.height > CANVAS_CONFIG.ARTWORK_MAX_RESIZE) {
                      return oldBox;
                    }
                    return newBox;
                  }}
                  enabledAnchors={[
                    'top-left',
                    'top-right',
                    'bottom-left',
                    'bottom-right',
                  ]}
                  rotateEnabled={true}
                  borderStroke="#000000"
                  borderStrokeWidth={2}
                  anchorSize={12}
                  anchorStroke="#000000"
                  anchorFill="#ffffff"
                  anchorCornerRadius={6}
                />
              )}
              </React.Fragment>
            );
          })}
        </Layer>
      </Stage>
      </div>
    </div>
  );
});

TShirtCanvas.displayName = 'TShirtCanvas';

export default TShirtCanvas;

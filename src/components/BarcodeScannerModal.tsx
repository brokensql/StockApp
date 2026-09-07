import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Upload,
  Check,
  FlipHorizontal,
  Zap,
  ZapOff,
  ZoomIn,
  ZoomOut,
  ScanLine,
  AlertCircle,
  Keyboard,
  ShoppingCart,
  ChevronRight,
  Undo2,
  Redo2,
  Plus,
  Trash2,
} from 'lucide-react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Product, SaleItem, SaleTransaction } from '../types';

// Web standard Native BarcodeDetector interface
interface DetectedBarcode {
  rawValue: string;
  format: string;
  boundingBox?: DOMRectReadOnly;
  cornerPoints?: Array<{ x: number; y: number }>;
}

interface NativeBarcodeDetector {
  detect: (image: ImageBitmapSource) => Promise<DetectedBarcode[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats: string[] }): NativeBarcodeDetector;
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

export interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (barcode: string) => void;
  onProceedToActiveSale?: (items: SaleItem[], unrecognizedBarcode?: string | null) => void;
  title?: string;
  products?: Product[];
  onItemScanned?: (product: Product) => void;
  mode?: 'sale' | 'inventory' | 'single';
  // Deprecated legacy props kept for type compatibility
  allowMultiScan?: boolean;
  defaultMode?: 'single' | 'multi';
  onCompleteMultiSale?: (
    newTransaction: SaleTransaction,
    updatedProducts: Product[]
  ) => void;
}

interface HistorySnapshot {
  cart: SaleItem[];
  unrecognizedBarcode: string | null;
  actionTitle?: string;
}

// Target high-frequency retail barcode formats for maximum speed & accuracy
const RETAIL_ZXING_FORMATS: BarcodeFormat[] = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.QR_CODE,
];

const RETAIL_NATIVE_FORMATS: string[] = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'qr_code',
];

// Helper to safely apply advanced video constraints
const applyTrackConstraint = async (track: MediaStreamTrack, constraints: Record<string, unknown>) => {
  try {
    const capabilities = track.getCapabilities?.() as unknown as Record<string, unknown> | undefined;
    if (!capabilities) return;
    const filteredConstraints: Record<string, unknown> = {};
    for (const key of Object.keys(constraints)) {
      if (key in capabilities) {
        filteredConstraints[key] = constraints[key];
      }
    }
    if (Object.keys(filteredConstraints).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await track.applyConstraints({ advanced: [filteredConstraints as any] });
    }
  } catch {
    // Constraint not accepted by camera hardware
  }
};

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  onProceedToActiveSale,
  products = [],
  onItemScanned,
  mode,
  title,
}) => {
  const isInventoryMode =
    mode === 'inventory' || mode === 'single' || (!onProceedToActiveSale && Boolean(onScanSuccess));
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const frameCallbackIdRef = useRef<number | null>(null);

  // Input Method: 'barcode' (camera live scanner) vs 'key' (manual code typing)
  const [inputMethod, setInputMethod] = useState<'barcode' | 'key'>('barcode');
  const [manualBarcodes, setManualBarcodes] = useState<string[]>(['']);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Undo / Redo history state
  const [cartHistory, setCartHistory] = useState<HistorySnapshot[]>([
    { cart: [], unrecognizedBarcode: null },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const currentSnapshot = cartHistory[historyIndex] || { cart: [], unrecognizedBarcode: null };
  const scannedCart = currentSnapshot.cart;
  const unrecognizedBarcode = currentSnapshot.unrecognizedBarcode;

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < cartHistory.length - 1;

  // Camera & hardware states
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [, setCameraError] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomAvailable, setZoomAvailable] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [maxZoom, setMaxZoom] = useState<number>(1);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [focusTapPos, setFocusTapPos] = useState<{ x: number; y: number } | null>(null);

  // 5-second scan window state & refs
  const [isScanningActive, setIsScanningActive] = useState<boolean>(false);
  const isScanningActiveRef = useRef<boolean>(false);
  const scanTimeoutRef = useRef<number | null>(null);

  // Snug Navy Blue in-modal toast
  const [scanToast, setScanToast] = useState<{
    id: number;
    type: 'success' | 'warning' | 'info';
    title: string;
    subtitle?: string;
  } | null>(null);
  const toastDismissTimerRef = useRef<number | null>(null);

  // Computed counts
  const totalQuantity = scannedCart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = scannedCart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  // Keep latest props in ref so scan callbacks never cause camera pipeline effect re-triggers
  const propsRef = useRef({
    products,
    onScanSuccess,
    onProceedToActiveSale,
    onClose,
    onItemScanned,
  });
  propsRef.current = {
    products,
    onScanSuccess,
    onProceedToActiveSale,
    onClose,
    onItemScanned,
  };

  const handleScanResultRef = useRef<(text: string) => void>(() => {});

  // Push new history state
  const pushHistory = useCallback(
    (newCart: SaleItem[], newUnrecognized: string | null, actionTitle?: string) => {
      setCartHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        return [
          ...next,
          {
            cart: newCart,
            unrecognizedBarcode: newUnrecognized,
            actionTitle,
          },
        ];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const targetIdx = historyIndex - 1;
    const targetSnapshot = cartHistory[targetIdx];
    setHistoryIndex(targetIdx);

    if (toastDismissTimerRef.current) {
      clearTimeout(toastDismissTimerRef.current);
    }
    const remainingCount = targetSnapshot.cart.reduce((s, i) => s + i.quantity, 0);
    setScanToast({
      id: Date.now(),
      type: 'info',
      title: 'Action Undone',
      subtitle: remainingCount > 0 ? `${remainingCount} item${remainingCount > 1 ? 's' : ''} in cart` : 'Cart is empty',
    });
    toastDismissTimerRef.current = window.setTimeout(() => {
      setScanToast(null);
    }, 2500);
  }, [canUndo, historyIndex, cartHistory]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    const targetIdx = historyIndex + 1;
    const targetSnapshot = cartHistory[targetIdx];
    setHistoryIndex(targetIdx);

    if (toastDismissTimerRef.current) {
      clearTimeout(toastDismissTimerRef.current);
    }
    const count = targetSnapshot.cart.reduce((s, i) => s + i.quantity, 0);
    setScanToast({
      id: Date.now(),
      type: 'info',
      title: 'Action Redone',
      subtitle: `${count} item${count > 1 ? 's' : ''} in cart`,
    });
    toastDismissTimerRef.current = window.setTimeout(() => {
      setScanToast(null);
    }, 2500);
  }, [canRedo, historyIndex, cartHistory]);

  // Play crisp POS beep audio on scan detection
  const playBeep = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1500, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(2100, ctx.currentTime + 0.07);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.07);
      }
    } catch {
      // AudioContext blocked or not supported
    }

    if (navigator.vibrate) {
      try {
        navigator.vibrate([40, 30, 50]);
      } catch {
        // vibration not allowed
      }
    }
  }, []);

  // Main scan result handler - updates history & shows pure toaster (no middle popup)
  const handleScanResult = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      // Only accept detections when the 5-second scan window is active
      if (!isScanningActiveRef.current) return;

      // Stop scanning session for this trigger and clear 5s timeout
      isScanningActiveRef.current = false;
      setIsScanningActive(false);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }

      playBeep();

      const {
        products: currentProducts,
        onItemScanned: currentOnItemScanned,
        onScanSuccess: currentOnScanSuccess,
        onClose: currentOnClose,
      } = propsRef.current;

      const matched = currentProducts.find(
        (p) =>
          (p.sku && p.sku.trim().toLowerCase() === clean.toLowerCase()) ||
          p.id.toLowerCase() === clean.toLowerCase() ||
          p.name.trim().toLowerCase() === clean.toLowerCase()
      );

      // --- INVENTORY MODE LOGIC (Add/Update Product in Inventory) ---
      if (isInventoryMode) {
        if (matched) {
          if (currentOnItemScanned) {
            currentOnItemScanned(matched);
          }
          setScanToast({
            id: Date.now(),
            type: 'success',
            title: matched.name,
            subtitle: `Barcode: ${clean} • Existing product`,
          });
        } else {
          setScanToast({
            id: Date.now(),
            type: 'success',
            title: 'Barcode Scanned',
            subtitle: clean,
          });
        }

        if (currentOnScanSuccess) {
          currentOnScanSuccess(clean);
        }

        if (toastDismissTimerRef.current) {
          clearTimeout(toastDismissTimerRef.current);
        }

        // Auto close to return to product details form with barcode
        window.setTimeout(() => {
          currentOnClose();
        }, 320);
        return;
      }

      // --- SALES MODE LOGIC (Add to Customer Sales Cart) ---
      if (matched) {
        if (currentOnItemScanned) {
          currentOnItemScanned(matched);
        }

        const existingIdx = scannedCart.findIndex((item) => item.productId === matched.id);
        let updatedCart: SaleItem[];
        if (existingIdx >= 0) {
          updatedCart = [...scannedCart];
          updatedCart[existingIdx] = {
            ...updatedCart[existingIdx],
            quantity: updatedCart[existingIdx].quantity + 1,
          };
        } else {
          updatedCart = [
            ...scannedCart,
            {
              productId: matched.id,
              name: matched.name,
              unitPrice: matched.price,
              quantity: 1,
              category: matched.category,
            },
          ];
        }

        pushHistory(updatedCart, unrecognizedBarcode, matched.name);

        setScanToast({
          id: Date.now(),
          type: 'success',
          title: matched.name,
          subtitle: `₱${matched.price.toFixed(2)} • Added to cart`,
        });
      } else {
        // Unrecognized barcode in sales mode: Show accurate warning toast
        pushHistory(scannedCart, clean, 'Unrecognized');

        setScanToast({
          id: Date.now(),
          type: 'warning',
          title: 'Unrecognized Barcode',
          subtitle: `Barcode: ${clean}`,
        });
      }

      if (toastDismissTimerRef.current) {
        clearTimeout(toastDismissTimerRef.current);
      }
      toastDismissTimerRef.current = window.setTimeout(() => {
        setScanToast(null);
      }, 3000);
    },
    [playBeep, scannedCart, unrecognizedBarcode, pushHistory]
  );

  handleScanResultRef.current = handleScanResult;

  // Checkout handler: only goes to sales checkout when Checkout is clicked
  const handleCheckout = useCallback(() => {
    if (scannedCart.length === 0 && !unrecognizedBarcode) return;

    const {
      onProceedToActiveSale: currentOnProceedToActiveSale,
      onScanSuccess: currentOnScanSuccess,
      onClose: currentOnClose,
    } = propsRef.current;

    if (currentOnProceedToActiveSale) {
      currentOnProceedToActiveSale(scannedCart, unrecognizedBarcode);
    } else if (currentOnScanSuccess) {
      const firstCode = scannedCart[0]?.productId || unrecognizedBarcode || '';
      currentOnScanSuccess(firstCode);
    }
    currentOnClose();
  }, [scannedCart, unrecognizedBarcode]);

  // Trigger a maximum 5-second scan session on button click
  const triggerScanSession = useCallback(() => {
    // Clear any previous timer
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    if (toastDismissTimerRef.current) {
      clearTimeout(toastDismissTimerRef.current);
      toastDismissTimerRef.current = null;
    }

    if (navigator.vibrate) {
      try {
        navigator.vibrate(40);
      } catch {
        // ignore
      }
    }

    // Activate scanning window
    setIsScanningActive(true);
    isScanningActiveRef.current = true;

    // Show toaster: "Scanning for barcode" (strictly NO countdown)
    setScanToast({
      id: Date.now(),
      type: 'info',
      title: 'Scanning for barcode',
    });

    // Check if a barcode is already sharp and visible in front of lens
    if (videoRef.current && typeof window !== 'undefined' && 'BarcodeDetector' in window && window.BarcodeDetector) {
      try {
        const detector = new window.BarcodeDetector({ formats: RETAIL_NATIVE_FORMATS });
        if (videoRef.current.readyState >= 2) {
          detector
            .detect(videoRef.current)
            .then((barcodes) => {
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                handleScanResultRef.current(barcodes[0].rawValue);
              }
            })
            .catch(() => {});
        }
      } catch {
        // Handled by continuous loop
      }
    }

    // 5-second maximum scan duration
    scanTimeoutRef.current = window.setTimeout(() => {
      setIsScanningActive(false);
      isScanningActiveRef.current = false;
      scanTimeoutRef.current = null;

      setScanToast({
        id: Date.now(),
        type: 'warning',
        title: 'No barcode found',
        subtitle: 'Click the scan button to scan again',
      });

      toastDismissTimerRef.current = window.setTimeout(() => {
        setScanToast(null);
      }, 3500);
    }, 5000);
  }, []);

  // Modal lifecycle & cleanup
  useEffect(() => {
    if (isOpen) {
      setInputMethod('barcode');
      setManualBarcodes(['']);
      setCartHistory([{ cart: [], unrecognizedBarcode: null }]);
      setHistoryIndex(0);
      setIsScanningActive(false);
      isScanningActiveRef.current = false;
      setScanToast(null);
    } else {
      setIsScanningActive(false);
      isScanningActiveRef.current = false;
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      if (toastDismissTimerRef.current) {
        clearTimeout(toastDismissTimerRef.current);
        toastDismissTimerRef.current = null;
      }
      setScanToast(null);
    }
  }, [isOpen]);

  const handleSwitchInputMethod = (method: 'barcode' | 'key') => {
    setInputMethod(method);
    if (method === 'key') {
      setIsScanningActive(false);
      isScanningActiveRef.current = false;
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      setScanToast(null);
      setTimeout(() => inputRefs.current[0]?.focus(), 80);
    }
  };

  const wasOpenRef = useRef<boolean>(false);

  // Lifecycle & Camera Setup
  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        isScanningActiveRef.current = false;
        if (controlsRef.current) {
          controlsRef.current.stop();
          controlsRef.current = null;
        }
        if (frameCallbackIdRef.current !== null) {
          cancelAnimationFrame(frameCallbackIdRef.current);
          frameCallbackIdRef.current = null;
        }
        setCameraError(null);
        setFocusTapPos(null);
        setScanToast(null);
      }
      return;
    }

    wasOpenRef.current = true;
    let isMounted = true;

    async function startScannerPipeline() {
      setCameraError(null);
      setHasCamera(null);

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported by your browser.');
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 60, min: 30 },
          },
          audio: false,
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facingMode } },
            audio: false,
          });
        }

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setHasCamera(true);

        const videoEl = videoRef.current;
        if (!videoEl) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        videoEl.srcObject = stream;
        await videoEl.play();

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = videoTrack.getCapabilities?.() as unknown as Record<string, unknown> | undefined;
          if (capabilities) {
            if ('torch' in capabilities) {
              setTorchAvailable(true);
            }
            if ('zoom' in capabilities) {
              setZoomAvailable(true);
              const zoomCap = capabilities.zoom as { max?: number; min?: number } | undefined;
              if (zoomCap && typeof zoomCap.max === 'number') {
                setMaxZoom(Math.min(zoomCap.max, 4));
              }
            }
          }
          await applyTrackConstraint(videoTrack, {
            focusMode: 'continuous',
            exposureMode: 'continuous',
            whiteBalanceMode: 'continuous',
          });
        }

        // Dual Engine Detection: Native BarcodeDetector (Hardware-Accelerated) or ZXing
        let useNativeEngine = false;
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window && window.BarcodeDetector) {
          try {
            const detector = new window.BarcodeDetector({ formats: RETAIL_NATIVE_FORMATS });
            useNativeEngine = true;

            let lastFrameTime = 0;
            const processNativeFrame = async (timestamp: number) => {
              if (!isMounted) return;

              // Only perform active detection while isScanningActive is true
              if (isScanningActiveRef.current && timestamp - lastFrameTime >= 33) {
                lastFrameTime = timestamp;
                try {
                  if (videoEl.readyState >= 2) {
                    const barcodes = await detector.detect(videoEl);
                    if (barcodes && barcodes.length > 0) {
                      for (const b of barcodes) {
                        if (b.rawValue && b.rawValue.trim().length >= 3) {
                          handleScanResultRef.current(b.rawValue);
                          break;
                        }
                      }
                    }
                  }
                } catch {
                  // Frame fallback
                }
              }

              if (isMounted) {
                frameCallbackIdRef.current = requestAnimationFrame(processNativeFrame);
              }
            };

            frameCallbackIdRef.current = requestAnimationFrame(processNativeFrame);
          } catch {
            useNativeEngine = false;
          }
        }

        if (!useNativeEngine) {
          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, RETAIL_ZXING_FORMATS);
          hints.set(DecodeHintType.TRY_HARDER, true);

          const codeReader = new BrowserMultiFormatReader(hints);

          const controls = await codeReader.decodeFromStream(
            stream,
            videoEl,
            (result) => {
              if (!isMounted || !isScanningActiveRef.current) return;
              if (result) {
                const text = result.getText();
                if (text && text.trim().length >= 3) {
                  handleScanResultRef.current(text);
                }
              }
            }
          );

          controlsRef.current = controls;
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setHasCamera(false);
        const e = err as { name?: string; message?: string };
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
          setCameraError('Camera access was denied. Please allow camera permissions or upload a barcode image.');
        } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
          setCameraError('No camera found on this device. You can upload a photo of the barcode below.');
        } else {
          setCameraError(e.message || 'Unable to access camera.');
        }
      }
    }

    startScannerPipeline();

    return () => {
      isMounted = false;
      isScanningActiveRef.current = false;
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
      if (frameCallbackIdRef.current !== null) {
        cancelAnimationFrame(frameCallbackIdRef.current);
        frameCallbackIdRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [isOpen, facingMode]);

  const toggleTorch = async () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    const nextState = !torchOn;
    await applyTrackConstraint(track, { torch: nextState });
    setTorchOn(nextState);
  };

  const toggleZoom = async () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    const nextZoom = zoomLevel === 1 ? Math.min(2, maxZoom) : 1;
    await applyTrackConstraint(track, { zoom: nextZoom });
    setZoomLevel(nextZoom);
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleViewfinderTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFocusTapPos({ x, y });
    setTimeout(() => setFocusTapPos(null), 900);

    // Also trigger scan session on tap
    triggerScanSession();
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window && window.BarcodeDetector) {
        try {
          const detector = new window.BarcodeDetector({ formats: RETAIL_NATIVE_FORMATS });
          const imgBitmap = await createImageBitmap(file);
          const barcodes = await detector.detect(imgBitmap);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            isScanningActiveRef.current = true;
            handleScanResult(barcodes[0].rawValue);
            return;
          }
        } catch {
          // fallback
        }
      }

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const imgUrl = reader.result as string;
          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, RETAIL_ZXING_FORMATS);
          hints.set(DecodeHintType.TRY_HARDER, true);

          const multiReader = new BrowserMultiFormatReader(hints);
          const result = await multiReader.decodeFromImageUrl(imgUrl);
          if (result && result.getText()) {
            isScanningActiveRef.current = true;
            handleScanResult(result.getText());
          } else {
            setCameraError('No clear barcode detected in photo. Please ensure barcode is sharp.');
          }
        } catch {
          setCameraError('No barcode found in this image. Try taking a closer, sharper photo.');
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setCameraError('Could not process selected image.');
    }
  };

  const handleBarcodeChange = (index: number, value: string) => {
    setManualBarcodes((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleAddLine = () => {
    setManualBarcodes((prev) => {
      const next = [...prev, ''];
      setTimeout(() => {
        const nextIdx = next.length - 1;
        inputRefs.current[nextIdx]?.focus();
      }, 50);
      return next;
    });
  };

  const handleRemoveLine = (index: number) => {
    setManualBarcodes((prev) => {
      if (prev.length <= 1) return [''];
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleClearLine = (index: number) => {
    setManualBarcodes((prev) => {
      const copy = [...prev];
      copy[index] = '';
      return copy;
    });
    inputRefs.current[index]?.focus();
  };

  const handleKeySubmit = (singleCode?: string) => {
    const codes = (singleCode !== undefined
      ? [singleCode.trim()]
      : manualBarcodes.map((b) => b.trim())
    ).filter((b) => b.length > 0);

    if (codes.length === 0) return;

    playBeep();

    const {
      products: currentProducts,
      onItemScanned: currentOnItemScanned,
      onScanSuccess: currentOnScanSuccess,
      onClose: currentOnClose,
    } = propsRef.current;

    // --- INVENTORY MODE KEY SUBMIT ---
    if (isInventoryMode) {
      const code = codes[0];
      const matched = currentProducts.find(
        (p) =>
          (p.sku && p.sku.trim().toLowerCase() === code.toLowerCase()) ||
          p.id.toLowerCase() === code.toLowerCase() ||
          p.name.trim().toLowerCase() === code.toLowerCase()
      );
      if (matched && currentOnItemScanned) {
        currentOnItemScanned(matched);
      }
      if (currentOnScanSuccess) {
        currentOnScanSuccess(code);
      }
      currentOnClose();
      return;
    }

    // --- SALES MODE KEY SUBMIT ---
    let updatedCart = [...scannedCart];
    let lastUnrecognized: string | null = unrecognizedBarcode;
    const matchedNames: string[] = [];
    const unrecognizedCodes: string[] = [];

    for (const code of codes) {
      const matched = currentProducts.find(
        (p) =>
          (p.sku && p.sku.trim().toLowerCase() === code.toLowerCase()) ||
          p.id.toLowerCase() === code.toLowerCase() ||
          p.name.trim().toLowerCase() === code.toLowerCase()
      );

      if (matched) {
        if (currentOnItemScanned) {
          currentOnItemScanned(matched);
        }
        const existingIdx = updatedCart.findIndex((item) => item.productId === matched.id);
        if (existingIdx >= 0) {
          updatedCart[existingIdx] = {
            ...updatedCart[existingIdx],
            quantity: updatedCart[existingIdx].quantity + 1,
          };
        } else {
          updatedCart = [
            ...updatedCart,
            {
              productId: matched.id,
              name: matched.name,
              unitPrice: matched.price,
              quantity: 1,
              category: matched.category,
            },
          ];
        }
        matchedNames.push(matched.name);
      } else {
        lastUnrecognized = code;
        unrecognizedCodes.push(code);
      }
    }

    const actionTitle = matchedNames.length > 0 ? matchedNames.join(', ') : 'Manual Entry';
    pushHistory(updatedCart, lastUnrecognized, actionTitle);

    if (toastDismissTimerRef.current) {
      clearTimeout(toastDismissTimerRef.current);
    }

    if (unrecognizedCodes.length > 0 && matchedNames.length === 0) {
      setScanToast({
        id: Date.now(),
        type: 'warning',
        title: unrecognizedCodes.length === 1 ? 'Unrecognized Barcode' : 'Unrecognized Barcodes',
        subtitle: unrecognizedCodes.join(', '),
      });
    } else if (matchedNames.length > 0) {
      setScanToast({
        id: Date.now(),
        type: 'success',
        title: matchedNames.length === 1 ? matchedNames[0] : `${matchedNames.length} Items Added`,
        subtitle: unrecognizedCodes.length > 0 ? `${unrecognizedCodes.length} unrecognized` : 'Added to cart',
      });
    }

    toastDismissTimerRef.current = window.setTimeout(() => {
      setScanToast(null);
    }, 3000);

    setManualBarcodes(['']);
    setTimeout(() => inputRefs.current[0]?.focus(), 60);
  };

  const validBarcodesCount = manualBarcodes.filter((b) => b.trim().length > 0).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="barcode-scanner-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 w-full h-full flex flex-col select-none bg-black overflow-hidden"
        >
          {/* Always-mounted Background Camera Video so stream is never interrupted */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />

          {/* In-Modal Toaster using Navy Blue Format, strictly hugging text width */}
          <AnimatePresence>
            {scanToast && (
              <motion.div
                key={scanToast.id}
                initial={{ opacity: 0, y: -14, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute top-4 sm:top-5 left-0 right-0 mx-auto z-50 pointer-events-none w-fit max-w-[calc(100vw-32px)] px-3.5 py-2 rounded-[14px] bg-[#0F172A] text-white shadow-[0_8px_24px_-4px_rgba(15,23,42,0.45)] border border-slate-700/50 flex items-center gap-2 select-none whitespace-nowrap"
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    scanToast.type === 'success'
                      ? 'text-[#4ADE80]'
                      : scanToast.type === 'warning'
                      ? 'text-[#FBBF24]'
                      : 'text-[#38BDF8]'
                  }`}
                >
                  {scanToast.type === 'success' ? (
                    <Check size={14} strokeWidth={2.8} />
                  ) : scanToast.type === 'warning' ? (
                    <AlertCircle size={14} strokeWidth={2.5} />
                  ) : (
                    <ScanLine size={14} strokeWidth={2.5} />
                  )}
                </div>
                <div className="w-fit flex flex-col leading-tight">
                  <span className="text-[13px] font-semibold text-white whitespace-nowrap">
                    {scanToast.title}
                  </span>
                  {scanToast.subtitle && (
                    <span className="text-[11px] font-medium text-[#CBD5E1] whitespace-nowrap mt-0.5">
                      {scanToast.subtitle}
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Smooth transition between Key and Barcode camera views */}
          <AnimatePresence mode="wait" initial={false}>
            {inputMethod === 'key' ? (
              /* MANUAL BARCODE "KEY" VIEW (Full Page) */
              <motion.div
                key="manual-key"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                className="relative z-10 w-full h-full flex-1 flex flex-col justify-between p-5 bg-white text-[#252825] overflow-y-auto select-none pt-[max(env(safe-area-inset-top),20px)] pb-[max(env(safe-area-inset-bottom),20px)]"
              >
                {/* Top header with close button & Checkout button */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-[#161816] flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Close"
                  >
                    <X size={18} strokeWidth={2.5} />
                  </button>

                  {/* Checkout Button in Key View Header (Sales Mode only) */}
                  {!isInventoryMode && (totalQuantity > 0 || unrecognizedBarcode) && (
                    <button
                      type="button"
                      onClick={handleCheckout}
                      className="h-10 px-4 rounded-full bg-[#4F8065] hover:bg-[#3D684F] text-white flex items-center gap-2 shadow-[0_3px_12px_rgba(79,128,101,0.35)] font-bold text-[13px] active:scale-95 transition-all cursor-pointer"
                    >
                      <ShoppingCart size={15} strokeWidth={2.4} />
                      <span>Checkout ({totalQuantity})</span>
                    </button>
                  )}
                </div>

                {/* Center Content */}
                <div className="my-auto flex flex-col items-center max-w-sm mx-auto w-full px-2">
                  <h2 className="text-[20px] font-bold text-[#252825] text-center mb-1">
                    {isInventoryMode ? 'Type product barcode' : 'Type product barcode'}
                  </h2>
                  <p className="text-[13px] text-[#717671] text-center mb-5">
                    {isInventoryMode
                      ? 'Enter the barcode digits to assign to this product in inventory'
                      : 'Enter the barcode digits or add multiple lines'}
                  </p>

                  {/* Barcode graphic for aesthetics */}
                  <div className="w-full flex items-center justify-center py-2.5 px-4 mb-3">
                    <svg
                      viewBox="0 0 190 56"
                      className="w-44 h-11 text-[#161816] fill-current opacity-85"
                      aria-hidden="true"
                    >
                      <rect x="0" y="0" width="3" height="56" />
                      <rect x="6" y="0" width="1.8" height="56" />
                      <rect x="11" y="0" width="5.5" height="56" />
                      <rect x="20" y="0" width="2.8" height="56" />
                      <rect x="26" y="0" width="6.5" height="56" />
                      <rect x="36" y="0" width="1.8" height="56" />
                      <rect x="41" y="0" width="4.5" height="56" />
                      <rect x="49" y="0" width="7" height="56" />
                      <rect x="60" y="0" width="2.8" height="56" />
                      <rect x="66" y="0" width="5.5" height="56" />
                      <rect x="75" y="0" width="1.8" height="56" />
                      <rect x="80" y="0" width="6.5" height="56" />
                      <rect x="90" y="0" width="3.8" height="56" />
                      <rect x="97" y="0" width="5.5" height="56" />
                      <rect x="106" y="0" width="1.8" height="56" />
                      <rect x="111" y="0" width="6.5" height="56" />
                      <rect x="121" y="0" width="2.8" height="56" />
                      <rect x="127" y="0" width="4.5" height="56" />
                      <rect x="135" y="0" width="6.5" height="56" />
                      <rect x="145" y="0" width="1.8" height="56" />
                      <rect x="150" y="0" width="4.5" height="56" />
                      <rect x="158" y="0" width="2.8" height="56" />
                      <rect x="164" y="0" width="5.5" height="56" />
                      <rect x="173" y="0" width="2.8" height="56" />
                      <rect x="179" y="0" width="4.5" height="56" />
                      <rect x="187" y="0" width="3" height="56" />
                    </svg>
                  </div>

                  {/* Multi-line minimal underline inputs (Single line in inventory mode) */}
                  <div className="w-full flex flex-col gap-3.5 mb-2 max-h-[260px] overflow-y-auto px-1 py-1">
                    {(isInventoryMode ? manualBarcodes.slice(0, 1) : manualBarcodes).map((code, idx) => (
                      <div key={idx} className="relative w-full group">
                        <input
                          ref={(el) => {
                            inputRefs.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoFocus={idx === 0}
                          placeholder={
                            isInventoryMode
                              ? 'e.g. 4800016644815'
                              : manualBarcodes.length > 1
                              ? `Barcode #${idx + 1}...`
                              : 'Click here to type barcode...'
                          }
                          value={code}
                          onChange={(e) => handleBarcodeChange(idx, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (!isInventoryMode && idx === manualBarcodes.length - 1 && code.trim().length > 0) {
                                handleAddLine();
                              } else {
                                handleKeySubmit();
                              }
                            }
                          }}
                          className="w-full h-11 bg-transparent text-center font-mono text-[20px] font-bold text-[#161816] placeholder:text-[#9CA3AF] placeholder:text-[14px] placeholder:font-normal outline-none transition-all pb-1.5 border-b-2 border-[#DEE3DE] focus:border-[#4F8065] px-8"
                        />

                        {/* Remove Line (if multiple lines exist and not inventory mode) */}
                        {!isInventoryMode && manualBarcodes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center cursor-pointer transition-colors"
                            aria-label={`Remove barcode line ${idx + 1}`}
                            title="Remove line"
                          >
                            <Trash2 size={14} strokeWidth={2.2} />
                          </button>
                        )}

                        {/* Clear text button */}
                        {code.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleClearLine(idx)}
                            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer transition-colors"
                            aria-label={`Clear line ${idx + 1}`}
                          >
                            <X size={13} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Option to add another barcode line (Only in sales multi-mode) */}
                  {!isInventoryMode && (
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="flex items-center gap-1.5 text-[13px] font-semibold text-[#161816] hover:text-black active:scale-95 transition-all py-1.5 px-3 rounded-lg hover:bg-black/5 cursor-pointer mb-3"
                    >
                      <Plus size={15} strokeWidth={2.5} />
                      <span>Add another barcode line</span>
                    </button>
                  )}

                  {/* Submit Button in project Green variant */}
                  <button
                    type="button"
                    onClick={() => handleKeySubmit()}
                    disabled={validBarcodesCount === 0}
                    className="w-full h-12 bg-[#4F8065] hover:bg-[#3D684F] active:scale-[0.99] disabled:opacity-35 disabled:cursor-not-allowed text-white rounded-full font-bold text-[15px] flex items-center justify-center shadow-[0_4px_14px_rgba(79,128,101,0.35)] transition-all cursor-pointer"
                  >
                    <span>
                      {isInventoryMode
                        ? 'Confirm Barcode'
                        : validBarcodesCount > 1
                        ? `Add ${validBarcodesCount} Barcodes`
                        : 'Add Barcode'}
                    </span>
                  </button>
                </div>

                {/* Bottom Bar: Summary & Checkout if items scanned (Sales mode only) */}
                <div className="flex flex-col items-center gap-3 pt-2">
                  {!isInventoryMode && totalQuantity > 0 && (
                    <div className="w-full max-w-sm flex items-center justify-between px-4 py-2.5 bg-[#F2F4F2] rounded-2xl border border-[#DEE3DE]">
                      <div className="flex flex-col leading-tight">
                        <span className="text-[12px] text-[#717671] font-medium">
                          {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'} in cart
                        </span>
                        <span className="text-[16px] font-bold text-[#161816]">
                          ₱{totalAmount.toFixed(2)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCheckout}
                        className="px-4 py-2 rounded-xl bg-[#4F8065] hover:bg-[#3D684F] text-white font-bold text-[13px] flex items-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer"
                      >
                        <span>Checkout</span>
                        <ChevronRight size={15} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}

                  {/* Switcher ("Barcode" & "Key") */}
                  <div className="flex items-center justify-center gap-3 pb-2">
                    <button
                      type="button"
                      onClick={() => handleSwitchInputMethod('barcode')}
                      className="w-28 h-14 rounded-2xl bg-[#F2F4F2] hover:bg-[#E5E9E5] text-[#4B524D] border border-[#DEE3DE]/60 flex flex-col items-center justify-center gap-1 font-semibold text-[13px] transition-all cursor-pointer select-none"
                    >
                      <ScanLine size={18} strokeWidth={2.3} />
                      <span>Barcode</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSwitchInputMethod('key')}
                      className="w-28 h-14 rounded-2xl bg-[#4F8065] text-white shadow-[0_4px_16px_rgba(79,128,101,0.38)] flex flex-col items-center justify-center gap-1 font-semibold text-[13px] transition-all cursor-pointer select-none"
                    >
                      <Keyboard size={18} strokeWidth={2.2} />
                      <span>Key</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* LIVE CAMERA BARCODE SCANNER VIEW (Full Page) */
              <motion.div
                key="camera-barcode"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                className="relative z-10 flex-1 w-full h-full bg-black/20 overflow-hidden flex flex-col justify-between cursor-pointer pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),16px)]"
                onClick={handleViewfinderTap}
              >
                {/* Floating Top Header (Close on left, Controls on right) */}
                <div
                  className="relative p-3.5 flex items-center justify-between z-30"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    {/* Circular Translucent Close Button matching upload button format */}
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
                      aria-label="Close scanner"
                    >
                      <X size={15} strokeWidth={2.4} />
                    </button>
                    {isInventoryMode && (
                      <span className="px-3 py-1 rounded-full bg-black/45 text-white/95 text-[12px] font-semibold backdrop-blur-md">
                        {title || 'Scan Product Barcode'}
                      </span>
                    )}
                  </div>

                  {/* Top Right Controls */}
                  <div className="flex items-center gap-2">
                    {torchAvailable && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer ${
                          torchOn ? 'bg-[#22C55E] text-white shadow-md' : 'bg-black/45 text-white hover:bg-black/65'
                        }`}
                        aria-label="Toggle Flash"
                      >
                        {torchOn ? <Zap size={15} /> : <ZapOff size={15} />}
                      </button>
                    )}
                    {zoomAvailable && (
                      <button
                        type="button"
                        onClick={toggleZoom}
                        className="w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
                        aria-label="Toggle Zoom"
                      >
                        {zoomLevel === 1 ? <ZoomIn size={15} /> : <ZoomOut size={15} />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
                      aria-label="Flip Camera"
                    >
                      <FlipHorizontal size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
                      aria-label="Upload Barcode Photo"
                    >
                      <Upload size={15} />
                    </button>
                  </div>
                </div>

                {/* Tap-to-Focus Indicator */}
                {focusTapPos && (
                  <div
                    className="absolute w-14 h-14 -ml-7 -mt-7 rounded-full border border-white/80 animate-ping pointer-events-none z-20"
                    style={{ left: focusTapPos.x, top: focusTapPos.y }}
                  />
                )}

                {/* Center Viewfinder Reticle with Reference Rounded White Corners */}
                <div className="relative z-20 flex items-center justify-center my-auto pointer-events-none">
                  <div className="relative w-64 h-80 sm:w-72 sm:h-92 flex items-center justify-center transition-all duration-200">
                    {/* 4 Floating Rounded Corner Brackets in Pure White (Layered on top with z-30) */}
                    <svg
                      className="absolute top-0 left-0 w-10 h-10 pointer-events-none z-30"
                      viewBox="0 0 40 40"
                      fill="none"
                    >
                      <path
                        d="M4 36V16C4 9.37 9.37 4 16 4H36"
                        stroke="white"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <svg
                      className="absolute top-0 right-0 w-10 h-10 pointer-events-none z-30"
                      viewBox="0 0 40 40"
                      fill="none"
                    >
                      <path
                        d="M4 4H24C30.63 4 36 9.37 36 16V36"
                        stroke="white"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <svg
                      className="absolute bottom-0 left-0 w-10 h-10 pointer-events-none z-30"
                      viewBox="0 0 40 40"
                      fill="none"
                    >
                      <path
                        d="M4 4V24C4 30.63 9.37 36 16 36H36"
                        stroke="white"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <svg
                      className="absolute bottom-0 right-0 w-10 h-10 pointer-events-none z-30"
                      viewBox="0 0 40 40"
                      fill="none"
                    >
                      <path
                        d="M4 36H24C30.63 36 36 30.63 36 24V4"
                        stroke="white"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </svg>

                    {/* Dedicated Inner Scan Chamber (Strictly contained within corners without overlapping) */}
                    <div className="absolute inset-y-3.5 inset-x-3.5 overflow-hidden pointer-events-none z-10">
                      {/* CamScanner Style Bidirectional Scan (Red Edition) */}
                      <div
                        className={`absolute inset-x-1 -translate-y-1/2 pointer-events-none ${
                          isScanningActive ? 'animate-camscanner-sweep-fast' : 'animate-camscanner-sweep'
                        }`}
                      >
                        {/* Downward Sweep Trailing Curtain (Separated cleanly ABOVE the red line) */}
                        <div
                          className={`absolute bottom-full mb-[2px] inset-x-0 h-28 sm:h-36 bg-gradient-to-t from-red-500/30 via-red-500/10 to-transparent overflow-hidden rounded-t-sm ${
                            isScanningActive ? 'animate-curtain-down-fast' : 'animate-curtain-down'
                          }`}
                        >
                          {/* Subtle Horizontal Digital Scanlines */}
                          <div
                            className="absolute inset-0 opacity-20"
                            style={{
                              backgroundImage:
                                'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(239, 68, 68, 0.4) 3px, rgba(239, 68, 68, 0.4) 4px)',
                            }}
                          />
                        </div>

                        {/* Upward Sweep Trailing Curtain (Separated cleanly BELOW the red line) */}
                        <div
                          className={`absolute top-full mt-[2px] inset-x-0 h-28 sm:h-36 bg-gradient-to-b from-red-500/30 via-red-500/10 to-transparent overflow-hidden rounded-b-sm ${
                            isScanningActive ? 'animate-curtain-up-fast' : 'animate-curtain-up'
                          }`}
                        >
                          {/* Subtle Horizontal Digital Scanlines */}
                          <div
                            className="absolute inset-0 opacity-20"
                            style={{
                              backgroundImage:
                                'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(239, 68, 68, 0.4) 3px, rgba(239, 68, 68, 0.4) 4px)',
                            }}
                          />
                        </div>

                        {/* Main Leading Red Laser Beam (Clean, solid, crisp with no overlapping haze) */}
                        <div className="relative w-full z-20 flex items-center justify-center">
                          <div className="h-[2.5px] w-full bg-[#EF4444] rounded-full shadow-[0_0_8px_#ef4444]" />
                        </div>
                      </div>

                      {/* CamScanner Digital Scan Particles (Scattered OCR Matrix Points) */}
                      <div className="absolute inset-2 pointer-events-none z-10 overflow-hidden">
                        {/* Particle Matrix Nodes */}
                        <div
                          className="absolute top-[18%] left-[15%] w-1.5 h-1.5 bg-red-400 shadow-[0_0_6px_#ef4444] rounded-[1px] animate-particle-flicker"
                          style={{ animationDelay: '0.1s' }}
                        />
                        <div
                          className="absolute top-[25%] right-[22%] w-1 h-1 bg-red-300 shadow-[0_0_4px_#ef4444] rounded-[1px] animate-particle-flicker"
                          style={{ animationDelay: '0.6s' }}
                        />
                        <div
                          className="absolute top-[38%] left-[28%] w-1 h-1 bg-red-400 shadow-[0_0_4px_#ef4444] rounded-[1px] animate-particle-flicker"
                          style={{ animationDelay: '1.2s' }}
                        />
                        <div
                          className="absolute top-[42%] right-[14%] w-1.5 h-1.5 bg-red-300 shadow-[0_0_6px_#ef4444] rounded-[1px] animate-particle-flicker"
                          style={{ animationDelay: '0.3s' }}
                        />
                        <div
                          className="absolute top-[55%] left-[18%] w-1 h-1 bg-red-400 shadow-[0_0_4px_#ef4444] rounded-[1px] animate-particle-flicker"
                          style={{ animationDelay: '0.9s' }}
                        />
                        <div
                          className="absolute top-[62%] right-[30%] w-1.5 h-1.5 bg-red-400 shadow-[0_0_6px_#ef4444] rounded-[1px] animate-particle-flicker"
                          style={{ animationDelay: '1.5s' }}
                        />
                        <div
                          className="absolute top-[75%] left-[32%] w-1 h-1 bg-red-300 shadow-[0_0_4px_#ef4444] rounded-[1px] animate-particle-flicker"
                          style={{ animationDelay: '0.4s' }}
                        />
                        <div
                          className="absolute top-[82%] right-[18%] w-1.5 h-1.5 bg-red-400 shadow-[0_0_6px_#ef4444] rounded-[1px] animate-particle-flicker"
                          style={{ animationDelay: '1.1s' }}
                        />
                        <div
                          className="absolute top-[48%] left-[60%] w-1 h-1 bg-red-300 shadow-[0_0_4px_#ef4444] rounded-[1px] animate-particle-flicker"
                          style={{ animationDelay: '0.7s' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Floating Bar */}
                <div
                  className="relative z-30 flex flex-col items-center gap-3 p-4 pt-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Floating Checkout Summary Bar if items have been scanned (Sales Mode only) */}
                  {!isInventoryMode && totalQuantity > 0 && (
                    <div className="w-full max-w-xs flex items-center justify-between px-4 py-2.5 bg-[#161816]/90 backdrop-blur-md rounded-2xl border border-white/15 shadow-2xl text-white">
                      <div className="flex flex-col text-left leading-tight">
                        <span className="text-[11px] text-gray-300 font-medium">
                          {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'} in cart
                        </span>
                        <span className="text-[15px] font-bold text-white">
                          ₱{totalAmount.toFixed(2)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCheckout}
                        className="px-4 py-2 rounded-xl bg-[#4F8065] hover:bg-[#3D684F] text-white font-bold text-[13px] flex items-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer"
                      >
                        <span>Checkout</span>
                        <ChevronRight size={15} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}

                  {/* Switcher Buttons: "Barcode" and "Key" with Sage Green Active Variant */}
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleSwitchInputMethod('barcode')}
                      className="w-28 h-14 rounded-2xl bg-[#4F8065] text-white shadow-[0_4px_16px_rgba(79,128,101,0.38)] flex flex-col items-center justify-center gap-1 font-semibold text-[13px] transition-all cursor-pointer select-none"
                    >
                      <ScanLine size={18} strokeWidth={2.3} />
                      <span>Barcode</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSwitchInputMethod('key')}
                      className="w-28 h-14 rounded-2xl bg-white/15 hover:bg-white/25 text-white/85 border border-white/15 backdrop-blur-md flex flex-col items-center justify-center gap-1 font-semibold text-[13px] transition-all cursor-pointer select-none"
                    >
                      <Keyboard size={18} strokeWidth={2.2} />
                      <span>Key</span>
                    </button>
                  </div>

                  {/* Center Circle with Scanner Icon */}
                  <div className="flex items-center justify-center gap-4 mt-1">
                    {/* Undo Button (Sales Mode only) */}
                    {!isInventoryMode && (
                      <button
                        type="button"
                        onClick={handleUndo}
                        disabled={!canUndo}
                        aria-label="Undo scan"
                        title="Undo scan"
                        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-150 cursor-pointer ${
                          canUndo
                            ? 'bg-white/20 hover:bg-white/30 text-white shadow-md active:scale-95 border border-white/25'
                            : 'bg-white/5 text-white/25 border border-white/5 cursor-not-allowed pointer-events-none'
                        }`}
                      >
                        <Undo2 size={20} strokeWidth={2.4} />
                      </button>
                    )}

                    {/* Center Scan Button with Scanner Icon */}
                    <div className="p-1.5 rounded-full bg-white shadow-[0_4px_20px_rgba(0,0,0,0.35)] border border-[#DEE3DE]/80">
                      <button
                        type="button"
                        onClick={triggerScanSession}
                        aria-label="Scan Barcode"
                        title="Scan Barcode"
                        className={`w-[58px] h-[58px] sm:w-[62px] sm:h-[62px] rounded-full text-white flex items-center justify-center shadow-[0_5px_16px_rgba(79,128,101,0.38)] active:scale-95 transition-all duration-150 cursor-pointer focus-visible:outline-none ${
                          isScanningActive
                            ? 'bg-[#3D684F] ring-4 ring-[#4F8065]/40 shadow-[0_0_20px_rgba(79,128,101,0.6)]'
                            : 'bg-[#4F8065] hover:bg-[#3D684F] hover:shadow-[0_6px_20px_rgba(79,128,101,0.48)]'
                        }`}
                      >
                        <ScanLine size={27} strokeWidth={2.3} className="sm:w-7 sm:h-7 text-white" />
                      </button>
                    </div>

                    {/* Redo Button (Sales Mode only) */}
                    {!isInventoryMode && (
                      <button
                        type="button"
                        onClick={handleRedo}
                        disabled={!canRedo}
                        aria-label="Redo scan"
                        title="Redo scan"
                        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-150 cursor-pointer ${
                          canRedo
                            ? 'bg-white/20 hover:bg-white/30 text-white shadow-md active:scale-95 border border-white/25'
                            : 'bg-white/5 text-white/25 border border-white/5 cursor-not-allowed pointer-events-none'
                        }`}
                      >
                        <Redo2 size={20} strokeWidth={2.4} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileScan}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};



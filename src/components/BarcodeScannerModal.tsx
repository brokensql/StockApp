import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CameraOff,
  X,
  Upload,
  Check,
  FlipHorizontal,
  Zap,
  ZapOff,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Layers,
  ScanLine,
  Plus,
  Minus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  AlertCircle,
  ShoppingBag,
  Banknote,
  Smartphone,
  CreditCard,
} from 'lucide-react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Product, SaleItem, SaleTransaction, PaymentMethod } from '../types';
import { formatPHTTimestamp } from '../utils/philippineDate';

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

export interface ScannedProductItem {
  product: Product;
  quantity: number;
}

export interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (barcode: string) => void;
  onProceedToActiveSale?: (items: SaleItem[], unrecognizedBarcode?: string | null) => void;
  title?: string;
  products?: Product[];
  onCompleteMultiSale?: (
    newTransaction: SaleTransaction,
    updatedProducts: Product[]
  ) => void;
  onItemScanned?: (product: Product) => void;
  allowMultiScan?: boolean;
  defaultMode?: 'single' | 'multi';
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
  title = 'Scan Barcode',
  products = [],
  onCompleteMultiSale,
  onItemScanned,
  allowMultiScan = true,
  defaultMode = 'multi',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const frameCallbackIdRef = useRef<number | null>(null);
  const isScanningActiveRef = useRef<boolean>(false);
  const lastScannedMapRef = useRef<Record<string, number>>({});
  const scanToastTimerRef = useRef<number | null>(null);

  // Scanner modes: 'multi' (continuous scanning of multiple items) vs 'single' (traditional 1-item capture)
  const [scanMode, setScanMode] = useState<'single' | 'multi'>(() => {
    if (defaultMode) return defaultMode;
    const saved = localStorage.getItem('pos_scanner_mode_pref');
    if (saved === 'single' || saved === 'multi') return saved;
    return allowMultiScan && products.length > 0 ? 'multi' : 'single';
  });

  // Camera & hardware states
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomAvailable, setZoomAvailable] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [maxZoom, setMaxZoom] = useState<number>(1);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [isEngineNative, setIsEngineNative] = useState<boolean>(false);
  const [focusTapPos, setFocusTapPos] = useState<{ x: number; y: number } | null>(null);

  // Multi-scan state
  const [scannedCart, setScannedCart] = useState<ScannedProductItem[]>([]);
  const [isCartExpanded, setIsCartExpanded] = useState<boolean>(false);
  const [isConfirmingOrder, setIsConfirmingOrder] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [reticleFlash, setReticleFlash] = useState<'green' | 'amber' | null>(null);
  const [scanToast, setScanToast] = useState<{
    id: number;
    type: 'success' | 'warning' | 'info';
    title: string;
    subtitle?: string;
  } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  const totalUnits = useMemo(
    () => scannedCart.reduce((sum, item) => sum + item.quantity, 0),
    [scannedCart]
  );
  const totalAmount = useMemo(
    () => scannedCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [scannedCart]
  );

  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - totalAmount);
  const isTenderValid = cashTendered === '' || tenderedNum >= totalAmount;

  const handleToggleMode = (newMode: 'single' | 'multi') => {
    setScanMode(newMode);
    try {
      localStorage.setItem('pos_scanner_mode_pref', newMode);
    } catch {
      // ignore
    }
  };

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

  const handleUpdateCartQty = (productId: string, delta: number) => {
    const item = scannedCart.find((it) => it.product.id === productId);
    if (!item) return;

    if (delta < 0 && item.quantity <= 1) {
      setItemToDelete({ id: productId, name: item.product.name });
      return;
    }

    setScannedCart((prev) =>
      prev
        .map((it) => {
          if (it.product.id !== productId) return it;
          const nextQty = it.quantity + delta;
          if (nextQty <= 0) return null;
          if (nextQty > it.product.stock) {
            setScanToast({
              id: Date.now(),
              type: 'warning',
              title: 'Max Stock Reached',
              subtitle: `Only ${it.product.stock} units available in inventory`,
            });
            return it;
          }
          return { ...it, quantity: nextQty };
        })
        .filter((it): it is ScannedProductItem => it !== null)
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setScannedCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setScannedCart([]);
    setIsCartExpanded(false);
  };

  // Keep latest props in ref so scan callbacks never cause camera pipeline effect re-triggers
  const propsRef = useRef({
    products,
    onScanSuccess,
    onProceedToActiveSale,
    onClose,
    onItemScanned,
    scanMode,
    allowMultiScan,
  });
  propsRef.current = {
    products,
    onScanSuccess,
    onProceedToActiveSale,
    onClose,
    onItemScanned,
    scanMode,
    allowMultiScan,
  };

  const handleScanResultRef = useRef<(text: string) => void>(() => {});

  // Main scan result handler supporting both Continuous Multi-Product and Single Scan
  const handleScanResult = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      const {
        products: currentProducts,
        onScanSuccess: currentOnScanSuccess,
        onProceedToActiveSale: currentOnProceedToActiveSale,
        onClose: currentOnClose,
        onItemScanned: currentOnItemScanned,
        scanMode: currentScanMode,
        allowMultiScan: currentAllowMultiScan,
      } = propsRef.current;

      // SINGLE SCAN MODE: Trigger callback and immediately transition to 1 whole page
      if (currentScanMode === 'single' || !currentAllowMultiScan) {
        if (!isScanningActiveRef.current) return;
        isScanningActiveRef.current = false;
        setDetectedCode(clean);
        playBeep();

        if (controlsRef.current) {
          controlsRef.current.stop();
          controlsRef.current = null;
        }
        if (frameCallbackIdRef.current !== null) {
          cancelAnimationFrame(frameCallbackIdRef.current);
          frameCallbackIdRef.current = null;
        }

        setTimeout(() => {
          if (currentOnProceedToActiveSale) {
            const matched = currentProducts.find(
              (p) =>
                (p.sku && p.sku.trim().toLowerCase() === clean.toLowerCase()) ||
                p.id.toLowerCase() === clean.toLowerCase() ||
                p.name.trim().toLowerCase() === clean.toLowerCase()
            );
            if (matched) {
              currentOnProceedToActiveSale(
                [
                  {
                    productId: matched.id,
                    name: matched.name,
                    unitPrice: matched.price,
                    quantity: 1,
                    category: matched.category,
                  },
                ],
                null
              );
            } else {
              currentOnProceedToActiveSale([], clean);
            }
          } else if (currentOnScanSuccess) {
            currentOnScanSuccess(clean);
          }
          currentOnClose();
        }, 200);
        return;
      }

      // CONTINUOUS MULTI-PRODUCT SCAN MODE:
      // Camera stays live and keeps decoding so customer's multiple items can be scanned consecutively
      const now = Date.now();
      const lastScanned = lastScannedMapRef.current[clean] || 0;
      // 1.25s debounce on the exact same barcode to prevent rapid duplicate bursts
      if (now - lastScanned < 1250) {
        return;
      }
      lastScannedMapRef.current[clean] = now;

      // Look up product in inventory
      const matched = currentProducts.find(
        (p) =>
          (p.sku && p.sku.trim().toLowerCase() === clean.toLowerCase()) ||
          p.id.toLowerCase() === clean.toLowerCase() ||
          p.name.trim().toLowerCase() === clean.toLowerCase()
      );

      if (matched) {
        playBeep();
        setReticleFlash('green');
        setTimeout(() => setReticleFlash(null), 380);

        setScannedCart((prev) => {
          const idx = prev.findIndex((i) => i.product.id === matched.id);
          if (idx >= 0) {
            const currentQty = prev[idx].quantity;
            if (currentQty >= matched.stock) {
              setScanToast({
                id: Date.now(),
                type: 'warning',
                title: `Max Stock Reached`,
                subtitle: `"${matched.name}" has no more available stock (${matched.stock})`,
              });
              return prev;
            }
            const updated = [...prev];
            updated[idx] = { ...updated[idx], quantity: currentQty + 1 };
            setScanToast({
              id: Date.now(),
              type: 'success',
              title: `${matched.name} (x${currentQty + 1})`,
              subtitle: `₱${(matched.price * (currentQty + 1)).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            });
            return updated;
          } else {
            if (matched.stock <= 0) {
              setScanToast({
                id: Date.now(),
                type: 'warning',
                title: 'Out of Stock',
                subtitle: `"${matched.name}" currently has 0 units in inventory`,
              });
              return prev;
            }
            setScanToast({
              id: Date.now(),
              type: 'success',
              title: `Added ${matched.name}`,
              subtitle: `₱${matched.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            });
            return [...prev, { product: matched, quantity: 1 }];
          }
        });

        if (currentOnItemScanned) {
          currentOnItemScanned(matched);
        }
      } else {
        // Unrecognized barcode
        setReticleFlash('amber');
        setTimeout(() => setReticleFlash(null), 380);
        setScanToast({
          id: Date.now(),
          type: 'warning',
          title: 'Product Not Found',
          subtitle: `Barcode "${clean}" is not in product catalog`,
        });
      }

      if (scanToastTimerRef.current) {
        clearTimeout(scanToastTimerRef.current);
      }
      scanToastTimerRef.current = window.setTimeout(() => {
        setScanToast(null);
      }, 2200);
    },
    [playBeep]
  );

  handleScanResultRef.current = handleScanResult;

  // Complete Order confirmation in multi-scan mode
  const handleCompleteOrder = () => {
    if (scannedCart.length === 0) return;

    const now = new Date();
    const nowEpoch = now.getTime();
    const timeStr = formatPHTTimestamp(now);
    const txNumber = `TX-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTx: SaleTransaction = {
      id: `tx-${nowEpoch}`,
      transactionNumber: txNumber,
      timestamp: timeStr,
      createdAt: nowEpoch,
      items: scannedCart.map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        unitPrice: i.product.price,
        quantity: i.quantity,
        category: i.product.category,
      })),
      subtotal: totalAmount,
      total: totalAmount,
      paymentMethod,
      itemCount: totalUnits,
      primaryItemName:
        scannedCart.length === 1
          ? scannedCart[0].product.name
          : `${scannedCart[0].product.name} +${scannedCart.length - 1} more`,
    };

    const updatedProducts = products.map((prod) => {
      const inCart = scannedCart.find((i) => i.product.id === prod.id);
      if (inCart) {
        return {
          ...prod,
          stock: Math.max(0, prod.stock - inCart.quantity),
        };
      }
      return prod;
    });

    if (onCompleteMultiSale) {
      onCompleteMultiSale(newTx, updatedProducts);
    }

    setScannedCart([]);
    setIsConfirmingOrder(false);
    setIsCartExpanded(false);
    onClose();
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
        setDetectedCode(null);
        setCameraError(null);
        setFocusTapPos(null);
        setIsConfirmingOrder(false);
        setIsCartExpanded(false);
        setReticleFlash(null);
        setScanToast(null);
        setScannedCart([]);
      }
      return;
    }

    wasOpenRef.current = true;
    let isMounted = true;
    isScanningActiveRef.current = true;

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
            setIsEngineNative(true);

            let lastFrameTime = 0;
            const processNativeFrame = async (timestamp: number) => {
              if (!isMounted || !isScanningActiveRef.current) return;

              // Run native scanning at up to 30fps
              if (timestamp - lastFrameTime >= 33) {
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
                  // Fallback frame handling
                }
              }

              if (isMounted && isScanningActiveRef.current) {
                frameCallbackIdRef.current = requestAnimationFrame(processNativeFrame);
              }
            };

            frameCallbackIdRef.current = requestAnimationFrame(processNativeFrame);
          } catch {
            useNativeEngine = false;
            setIsEngineNative(false);
          }
        }

        if (!useNativeEngine) {
          setIsEngineNative(false);
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
    setTorchOn(false);
    setZoomLevel(1);
  };

  const handleViewfinderTap = async (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFocusTapPos({ x, y });

    setTimeout(() => {
      setFocusTapPos(null);
    }, 1000);

    if (!videoRef.current || !videoRef.current.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    await applyTrackConstraint(track, { focusMode: 'continuous' });
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window && window.BarcodeDetector) {
        try {
          const detector = new window.BarcodeDetector({ formats: RETAIL_NATIVE_FORMATS });
          const imageBitmap = await createImageBitmap(file);
          const results = await detector.detect(imageBitmap);
          if (results && results.length > 0 && results[0].rawValue) {
            handleScanResult(results[0].rawValue);
            return;
          }
        } catch {
          // Fallback to ZXing
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

  const handleSampleBarcode = (sampleCode: string) => {
    handleScanResult(sampleCode);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="barcode-scanner-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (scannedCart.length === 0 || confirm('Close scanner and discard scanned products?')) {
                onClose();
              }
            }}
            className="absolute inset-0 bg-[#161816]/80 backdrop-blur-xs"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[420px] bg-[#161816] rounded-3xl overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.55)] z-10 flex flex-col select-none border border-white/10"
          >
            {/* Top Scanning Mode Switcher Bar */}
            <div className="flex items-center justify-between px-3.5 py-3 bg-[#1F2220] border-b border-white/10 z-30">
              {allowMultiScan ? (
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => handleToggleMode('multi')}
                    className={`h-7 px-2.5 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      scanMode === 'multi'
                        ? 'bg-[#16A34A] text-white shadow-xs'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <Layers size={13} />
                    <span>Multi-Product</span>
                    {scannedCart.length > 0 && (
                      <span className="ml-0.5 px-1.5 py-0.2 bg-white text-[#16A34A] rounded-full text-[10px] font-bold">
                        {totalUnits}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleMode('single')}
                    className={`h-7 px-2.5 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      scanMode === 'single'
                        ? 'bg-white text-[#252825] shadow-xs'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <ScanLine size={13} />
                    <span>Single Scan</span>
                  </button>
                </div>
              ) : (
                <span className="text-[14px] font-semibold text-white/90 pl-1">{title}</span>
              )}

              <button
                type="button"
                onClick={() => {
                  if (scannedCart.length === 0 || confirm('Close scanner and discard scanned products?')) {
                    onClose();
                  }
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* ORDER CONFIRMATION VIEW */}
            {isConfirmingOrder ? (
              <div className="bg-white text-[#252825] p-5 max-h-[82vh] overflow-y-auto flex flex-col">
                {/* Header with return button */}
                <div className="flex items-center justify-between pb-3 border-b border-[#DEE3DE]">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingOrder(false)}
                    className="flex items-center gap-1.5 text-[13px] font-semibold text-[#4F8065] hover:text-[#18392B] cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    <span>Scan More Products</span>
                  </button>
                  <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md bg-[#F2F4F2] text-[#4F8065]">
                    {totalUnits} items
                  </span>
                </div>

                <div className="py-3">
                  <h3 className="text-[19px] font-bold text-[#252825]">Confirm Order</h3>
                  <p className="text-[12.5px] text-[#717671]">Review scanned items before completing this sale.</p>
                </div>

                {/* Scanned Items Itemized Breakdown */}
                <div className="divide-y divide-[#F2F4F2] max-h-52 overflow-y-auto pr-1">
                  {scannedCart.map(({ product, quantity }) => (
                    <div
                      key={product.id}
                      className="py-2.5 px-1.5 rounded-lg flex items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[13.5px] font-semibold text-[#252825] truncate">{product.name}</h4>
                        <div className="text-[11.5px] text-[#717671]">
                          <span>₱{product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })} each</span>
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(product.id, -1)}
                          className="w-7 h-7 rounded-lg bg-[#F2F4F2] hover:bg-[#DEE3DE] text-[#252825] flex items-center justify-center cursor-pointer transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-6 text-center text-[13.5px] font-bold text-[#252825]">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(product.id, 1)}
                          disabled={quantity >= product.stock}
                          className="w-7 h-7 rounded-lg bg-[#F2F4F2] hover:bg-[#DEE3DE] text-[#252825] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <div className="w-18 text-right font-bold text-[13.5px] text-[#252825]">
                        ₱{(product.price * quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal & Total Summary Before Cash Received */}
                <div className="mt-4 pt-4 border-t border-[#DEE3DE] space-y-2.5">
                  <div className="flex justify-between text-[13.5px] text-[#717671]">
                    <span>Subtotal</span>
                    <span className="font-semibold text-[#252825] tabular-nums">
                      ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1.5 border-t border-[#DEE3DE]">
                    <span className="text-[15px] font-bold text-[#252825]">Total Due</span>
                    <span className="text-[22px] font-black text-[#252825] tabular-nums">
                      ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Cash Received Stacked Section */}
                <div className="mt-4 pt-3 space-y-2">
                  <label htmlFor="tender-amount-input" className="block text-[13px] font-bold text-[#252825]">
                    Cash received
                  </label>
                  <div className="flex items-center gap-1.5 pb-2 border-b border-[#DEE3DE] focus-within:border-[#252825] transition-colors">
                    <span className="text-[15px] font-bold text-[#252825]">₱</span>
                    <input
                      id="tender-amount-input"
                      type="number"
                      min="0"
                      step="any"
                      placeholder={totalAmount.toFixed(2)}
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-full text-[15px] font-bold bg-transparent focus:outline-none text-[#252825] placeholder:text-[#717671]/40"
                    />
                  </div>

                  {/* Real-time Change Due Display - Pure Black Text */}
                  {tenderedNum > 0 && (
                    <div className="pt-1.5 flex justify-between items-center text-[13.5px]">
                      <span className={tenderedNum < totalAmount && cashTendered !== '' ? 'font-medium text-red-600' : 'font-semibold text-[#252825]'}>
                        {tenderedNum < totalAmount && cashTendered !== '' ? 'Short by:' : 'Change due:'}
                      </span>
                      <span
                        className={`tabular-nums font-bold text-[15px] ${
                          tenderedNum < totalAmount && cashTendered !== '' ? 'text-red-600' : 'text-[#252825]'
                        }`}
                      >
                        {tenderedNum < totalAmount && cashTendered !== ''
                          ? `₱${(totalAmount - tenderedNum).toFixed(2)}`
                          : `₱${changeDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Sale Button without Price inside */}
                <div className="mt-5 pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleCompleteOrder}
                    disabled={!isTenderValid || scannedCart.length === 0}
                    className="w-full py-3 bg-[#4F8065] active:bg-[#3D684F] hover:bg-[#437258] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-[14.5px] font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <Check size={18} strokeWidth={2.5} />
                    <span>Confirm & Complete Sale</span>
                  </button>
                </div>
              </div>
            ) : (
              /* LIVE CAMERA VIEWPORT */
              <div
                className="relative aspect-[3/4] w-full bg-black overflow-hidden flex items-center justify-center cursor-pointer"
                onClick={handleViewfinderTap}
              >
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover"
                />

                {/* Floating Camera Controls Top Bar */}
                <div
                  className="absolute top-0 inset-x-0 p-3.5 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1.5">
                    {scanMode === 'multi' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#16A34A] text-white flex items-center gap-1 shadow-sm">
                        <Layers size={11} />
                        <span>Multi-scan</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white flex items-center gap-1">
                        <ScanLine size={11} />
                        <span>Single scan</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {zoomAvailable && (
                      <button
                        type="button"
                        onClick={toggleZoom}
                        className={`h-7 px-2 rounded-full text-white flex items-center justify-center gap-1 text-[11px] font-bold backdrop-blur-md transition-colors cursor-pointer ${
                          zoomLevel > 1 ? 'bg-[#16A34A]' : 'bg-black/50 hover:bg-black/70'
                        }`}
                        aria-label="Toggle zoom"
                      >
                        {zoomLevel > 1 ? <ZoomOut size={12} /> : <ZoomIn size={12} />}
                        <span>{zoomLevel}x</span>
                      </button>
                    )}

                    {torchAvailable && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`w-7 h-7 rounded-full text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer ${
                          torchOn ? 'bg-[#16A34A]' : 'bg-black/50 hover:bg-black/70'
                        }`}
                        aria-label="Toggle flash"
                      >
                        {torchOn ? <Zap size={13} /> : <ZapOff size={13} />}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                      aria-label="Switch camera"
                    >
                      <FlipHorizontal size={14} />
                    </button>
                  </div>
                </div>

                {/* Tap to focus reticle indicator */}
                {focusTapPos && (
                  <div
                    className="absolute w-14 h-14 -ml-7 -mt-7 rounded-full border border-white/80 animate-ping pointer-events-none z-20"
                    style={{ left: focusTapPos.x, top: focusTapPos.y }}
                  />
                )}

                {/* Central Target Reticle & Premium Scan Line */}
                {hasCamera && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6 z-10">
                    <div
                      className={`relative w-64 h-40 rounded-2xl flex items-center justify-center transition-all duration-200 overflow-hidden ${
                        reticleFlash === 'green' || detectedCode
                          ? 'border border-[#22C55E]/80 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                          : reticleFlash === 'amber'
                          ? 'border border-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                          : 'border border-white/30'
                      }`}
                    >
                      {/* Refined Corner Accent Brackets */}
                      <div
                        className={`absolute top-0 left-0 w-5 h-5 border-t-[2.5px] border-l-[2.5px] rounded-tl-xl transition-colors duration-200 ${
                          reticleFlash === 'green' || detectedCode
                            ? 'border-[#22C55E]'
                            : reticleFlash === 'amber'
                            ? 'border-amber-400'
                            : 'border-white/90'
                        }`}
                      />
                      <div
                        className={`absolute top-0 right-0 w-5 h-5 border-t-[2.5px] border-r-[2.5px] rounded-tr-xl transition-colors duration-200 ${
                          reticleFlash === 'green' || detectedCode
                            ? 'border-[#22C55E]'
                            : reticleFlash === 'amber'
                            ? 'border-amber-400'
                            : 'border-white/90'
                        }`}
                      />
                      <div
                        className={`absolute bottom-0 left-0 w-5 h-5 border-b-[2.5px] border-l-[2.5px] rounded-bl-xl transition-colors duration-200 ${
                          reticleFlash === 'green' || detectedCode
                            ? 'border-[#22C55E]'
                            : reticleFlash === 'amber'
                            ? 'border-amber-400'
                            : 'border-white/90'
                        }`}
                      />
                      <div
                        className={`absolute bottom-0 right-0 w-5 h-5 border-b-[2.5px] border-r-[2.5px] rounded-br-xl transition-colors duration-200 ${
                          reticleFlash === 'green' || detectedCode
                            ? 'border-[#22C55E]'
                            : reticleFlash === 'amber'
                            ? 'border-amber-400'
                            : 'border-white/90'
                        }`}
                      />

                      {/* Precision Center Target Markings */}
                      <div className="absolute inset-0 flex items-center justify-between px-2 opacity-25">
                        <div className="w-1.5 h-[1px] bg-white" />
                        <div className="w-1.5 h-[1px] bg-white" />
                      </div>

                      {/* Premium Luminous Laser Beam */}
                      {!detectedCode && (
                        <motion.div
                          animate={{ y: [-55, 55, -55] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                          className="absolute inset-x-0 flex flex-col items-center pointer-events-none"
                        >
                          {/* Soft Vertical Glow Aura */}
                          <div
                            className={`w-full h-8 -my-4 ${
                              reticleFlash === 'amber'
                                ? 'bg-gradient-to-b from-transparent via-amber-400/20 to-transparent'
                                : 'bg-gradient-to-b from-transparent via-[#22C55E]/20 to-transparent'
                            }`}
                          />
                          {/* Fine Laser Line */}
                          <div
                            className={`w-full h-[1.5px] ${
                              reticleFlash === 'amber'
                                ? 'bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_10px_rgba(251,191,36,0.9)]'
                                : 'bg-gradient-to-r from-transparent via-[#4ADE80] to-transparent shadow-[0_0_12px_rgba(74,222,128,0.95)]'
                            }`}
                          />
                          {/* Center Specular Glint */}
                          <div className="w-10 h-[2px] rounded-full bg-white/90 blur-[0.5px] mx-auto -mt-[1px] shadow-[0_0_6px_#ffffff]" />
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}

                {/* Instant Scan Toast HUD banner */}
                <AnimatePresence>
                  {scanToast && (
                    <motion.div
                      key={scanToast.id}
                      initial={{ opacity: 0, y: -16, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -12, scale: 0.95 }}
                      className={`absolute top-14 inset-x-4 py-2 px-3.5 rounded-2xl flex items-center justify-between gap-2 shadow-2xl z-30 border backdrop-blur-md ${
                        scanToast.type === 'success'
                          ? 'bg-[#142E20]/95 border-[#22C55E] text-white'
                          : 'bg-[#3A2209]/95 border-amber-400 text-amber-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            scanToast.type === 'success' ? 'bg-[#22C55E] text-[#142E20]' : 'bg-amber-400 text-[#3A2209]'
                          }`}
                        >
                          {scanToast.type === 'success' ? <Check size={13} strokeWidth={3} /> : <AlertCircle size={13} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-bold truncate leading-tight">{scanToast.title}</p>
                          {scanToast.subtitle && (
                            <p className="text-[11px] opacity-80 truncate leading-tight">{scanToast.subtitle}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold opacity-70 flex-shrink-0">
                        {scanToast.type === 'success' ? 'Scanned' : 'Notice'}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Single-Scan Immediate Detected Badge */}
                <AnimatePresence>
                  {detectedCode && scanMode === 'single' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-x-6 bottom-20 bg-[#142E20] text-white py-2.5 px-4 rounded-full flex items-center justify-center gap-2 shadow-2xl border border-[#22C55E] z-30"
                    >
                      <div className="w-5 h-5 rounded-full bg-[#22C55E] text-[#142E20] flex items-center justify-center flex-shrink-0 font-bold">
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <span className="text-[13.5px] font-mono font-bold tracking-wide truncate">{detectedCode}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Camera Unavailable Error State */}
                {cameraError && (
                  <div
                    className="absolute inset-0 bg-[#161816]/95 p-6 flex flex-col items-center justify-center text-center text-white z-20 space-y-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center">
                      <CameraOff size={20} />
                    </div>
                    <h4 className="text-[14px] font-semibold text-white">Camera Unavailable</h4>
                    <p className="text-[12px] text-white/70 max-w-xs leading-relaxed">{cameraError}</p>
                    <div className="flex flex-col gap-2 w-full max-w-xs pt-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2.5 bg-white text-[#252825] rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <Upload size={15} />
                        <span>Upload Photo of Barcode</span>
                      </button>
                      {products.length > 0 && products[0].sku && (
                        <button
                          type="button"
                          onClick={() => handleSampleBarcode(products[0].sku || '480001664421')}
                          className="w-full py-2 text-white/80 hover:text-white rounded-xl text-[12px] transition-colors cursor-pointer"
                        >
                          Scan Sample Product ({products[0].name})
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Docked Multi-Scan Cart Tray / Guide Bar */}
                {scanMode === 'multi' && allowMultiScan ? (
                  <div
                    className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/90 to-transparent p-3.5 z-30 flex flex-col gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Expandable items drawer if expanded */}
                    <AnimatePresence>
                      {isCartExpanded && scannedCart.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-[#1C1F1D] rounded-2xl p-3 border border-white/15 max-h-44 overflow-y-auto space-y-2 mb-1"
                        >
                          <div className="flex items-center justify-between pb-1.5 border-b border-white/10 text-[11.5px] text-white/70">
                            <span>Scanned Items ({scannedCart.length})</span>
                            <button
                              type="button"
                              onClick={handleClearCart}
                              className="text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                            >
                              Clear All
                            </button>
                          </div>
                          {scannedCart.map(({ product, quantity }) => (
                            <div key={product.id} className="flex items-center justify-between text-white text-[12px] py-1">
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="font-semibold truncate">{product.name}</p>
                                <p className="text-[10.5px] text-white/60">₱{product.price.toFixed(2)} each</p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQty(product.id, -1)}
                                  className="w-5 h-5 rounded-md bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer"
                                >
                                  <Minus size={11} />
                                </button>
                                <span className="font-bold w-4 text-center">{quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQty(product.id, 1)}
                                  disabled={quantity >= product.stock}
                                  className="w-5 h-5 rounded-md bg-white/15 hover:bg-white/25 disabled:opacity-30 flex items-center justify-center cursor-pointer"
                                >
                                  <Plus size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromCart(product.id)}
                                  className="w-5 h-5 text-red-400 hover:text-red-300 flex items-center justify-center ml-1 cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Scanned Cart Bottom Action Bar */}
                    {scannedCart.length > 0 ? (
                      <div className="bg-[#1C1F1D]/95 backdrop-blur-md rounded-2xl p-2.5 border border-white/20 flex items-center justify-between gap-2 shadow-2xl">
                        {/* Cart Summary & Drawer Toggle */}
                        <button
                          type="button"
                          onClick={() => setIsCartExpanded((prev) => !prev)}
                          className="flex items-center gap-2 text-left text-white px-2 py-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-xl bg-[#16A34A] text-white flex items-center justify-center flex-shrink-0">
                            <ShoppingBag size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-[12px] font-bold text-white">
                                {totalUnits} {totalUnits === 1 ? 'item' : 'items'}
                              </span>
                              {isCartExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                            </div>
                            <span className="text-[13px] font-black text-[#22C55E] block leading-tight">
                              ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </button>

                        {/* Primary Proceed to 1 Whole Page Sale Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onProceedToActiveSale) {
                              onProceedToActiveSale(
                                scannedCart.map((i) => ({
                                  productId: i.product.id,
                                  name: i.product.name,
                                  unitPrice: i.product.price,
                                  quantity: i.quantity,
                                  category: i.product.category,
                                })),
                                null
                              );
                              onClose();
                            } else {
                              setIsConfirmingOrder(true);
                            }
                          }}
                          className="h-10 px-4 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer"
                        >
                          <Check size={16} strokeWidth={2.5} />
                          <span>Proceed to Checkout</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[11.5px] text-white/70 px-1 py-0.5">
                        <span className="truncate">Scan products continuously • No repeats needed</span>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="hover:text-white underline underline-offset-2 transition-colors cursor-pointer flex-shrink-0 ml-2"
                        >
                          Upload photo
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Single scan mode footer */
                  <div
                    className="absolute bottom-0 inset-x-0 p-3.5 flex items-center justify-between text-[11.5px] text-white/75 bg-gradient-to-t from-black/70 to-transparent z-20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>Hold barcode inside frame to scan</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="hover:text-white underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      Upload photo
                    </button>
                  </div>
                )}

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileScan}
                />
              </div>
            )}
          </motion.div>

          {/* Minimalist Confirmation Popup for Item Removal inside Scanner Modal */}
          {itemToDelete && (
            <div
              id="confirm-removal-scanner-modal"
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setItemToDelete(null)}
            >
              <div
                className="w-full max-w-sm bg-white rounded-2xl p-6 border border-[#DEE3DE] shadow-2xl space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-1.5">
                  <h3 className="text-[19px] font-bold text-[#252825]">
                    Remove item
                  </h3>
                  <p className="text-[13.5px] text-[#555A55] leading-relaxed">
                    Do you want to remove <span className="font-semibold text-[#252825]">{itemToDelete.name}</span> from this sale?
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setItemToDelete(null)}
                    className="h-10 px-4 rounded-xl border border-[#DEE3DE] text-[13.5px] font-semibold text-[#252825] hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleRemoveFromCart(itemToDelete.id);
                      setItemToDelete(null);
                    }}
                    className="h-10 px-4 rounded-xl bg-[#252825] text-white text-[13.5px] font-semibold hover:bg-black active:scale-95 transition-all cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};

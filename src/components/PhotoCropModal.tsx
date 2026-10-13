'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Check,
  Crop,
  Sparkles,
  Sliders,
} from 'lucide-react';

export interface PhotoCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onSaveCrop: (croppedFile: File, caption?: string) => Promise<void>;
  initialCaption?: string;
  title?: string;
}

type AspectRatioOption = '4:3' | '16:9' | '3:2' | '1:1' | 'original';

export default function PhotoCropModal({
  isOpen,
  onClose,
  imageUrl,
  onSaveCrop,
  initialCaption = '',
  title = 'Editor & Pemotong Aspek Rasio Foto',
}: PhotoCropModalProps) {
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('4:3');
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [caption, setCaption] = useState<string>(initialCaption);
  const [saving, setSaving] = useState<boolean>(false);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setCaption(initialCaption || '');
      setAspectRatio('4:3');
    }
  }, [isOpen, initialCaption, imageUrl]);

  // Load natural dimensions
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
  };

  // Drag / Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel to zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(Math.max(0.6, prev + delta), 3.5));
  };

  // Get numeric ratio
  const getRatioValue = useCallback((): number => {
    switch (aspectRatio) {
      case '4:3':
        return 4 / 3;
      case '16:9':
        return 16 / 9;
      case '3:2':
        return 3 / 2;
      case '1:1':
        return 1;
      case 'original':
        return imgNaturalSize.width && imgNaturalSize.height
          ? imgNaturalSize.width / imgNaturalSize.height
          : 4 / 3;
      default:
        return 4 / 3;
    }
  }, [aspectRatio, imgNaturalSize]);

  // Calculate Crop Box Style
  const getCropBoxDimensions = () => {
    const maxBoxWidth = 360;
    const maxBoxHeight = 280;
    const targetRatio = getRatioValue();

    let width = maxBoxWidth;
    let height = width / targetRatio;

    if (height > maxBoxHeight) {
      height = maxBoxHeight;
      width = height * targetRatio;
    }

    return { width, height };
  };

  const cropBox = getCropBoxDimensions();

  // Export & Crop execution
  const handleApplyCrop = async () => {
    if (!imageRef.current) return;
    setSaving(true);

    try {
      // Create offscreen canvas for rendering high-res result
      const canvas = document.createElement('canvas');
      const targetRatio = getRatioValue();

      // Output resolution: standard crisp high-res (width 1400px)
      const outWidth = 1400;
      const outHeight = Math.round(outWidth / targetRatio);
      canvas.width = outWidth;
      canvas.height = outHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Canvas 2D context tidak tersedia');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outWidth, outHeight);

      // Load clean image for canvas drawing
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Gagal memuat gambar untuk di-crop'));
        img.src = imageUrl;
      });

      // Scale between cropBox in DOM and final canvas
      const scaleToCanvas = outWidth / cropBox.width;

      ctx.save();
      // Center canvas
      ctx.translate(outWidth / 2, outHeight / 2);
      // Pan offset
      ctx.translate(pan.x * scaleToCanvas, pan.y * scaleToCanvas);
      // Rotation
      ctx.rotate((rotation * Math.PI) / 180);
      // Zoom
      ctx.scale(zoom, zoom);

      // Calculate base image dimensions to fit crop box initially
      const imgAspect = img.naturalWidth / img.naturalHeight;
      let drawW: number;
      let drawH: number;

      if (imgAspect > targetRatio) {
        // Image is wider than crop box
        drawH = cropBox.height * scaleToCanvas;
        drawW = drawH * imgAspect;
      } else {
        // Image is taller than crop box
        drawW = cropBox.width * scaleToCanvas;
        drawH = drawW / imgAspect;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      // Convert canvas to Blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.92);
      });

      if (!blob) throw new Error('Gagal mengekspor foto hasil crop');

      const file = new File([blob], `cropped_${Date.now()}.jpg`, { type: 'image/jpeg' });
      await onSaveCrop(file, caption);
      onClose();
    } catch (err: any) {
      console.error('Crop error:', err);
      alert(err.message || 'Terjadi kesalahan saat memotong foto');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-white bg-slate-950/50">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">{title}</h3>
              <p className="text-[11px] text-slate-400">Sesuaikan aspek rasio & posisi foto agar presisi saat dicetak di F4</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Pilihan Aspek Rasio */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <span>Pilih Aspek Rasio:</span>
              <span className="text-[10px] font-normal text-slate-400">(4:3 disarankan untuk kertas F4)</span>
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {(
                [
                  { id: '4:3', label: '4:3', badge: 'F4 Ideal' },
                  { id: '16:9', label: '16:9', badge: 'Wide' },
                  { id: '3:2', label: '3:2', badge: 'DSLR' },
                  { id: '1:1', label: '1:1', badge: 'Kotak' },
                  { id: 'original', label: 'Asli', badge: 'Auto' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setAspectRatio(opt.id);
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  className={`py-1.5 px-2 rounded-xl text-center font-bold text-xs border transition-all cursor-pointer flex flex-col items-center justify-center ${
                    aspectRatio === opt.id
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className="text-[9px] font-normal opacity-75">{opt.badge}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Viewport Container */}
          <div
            ref={viewportRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className="relative w-full h-72 sm:h-80 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center select-none cursor-grab active:cursor-grabbing border border-slate-800"
          >
            {/* The Image being transformed */}
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Crop target"
              crossOrigin="anonymous"
              onLoad={onImageLoad}
              draggable={false}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                maxWidth: 'none',
                maxHeight: 'none',
              }}
              className="pointer-events-none select-none max-w-none origin-center"
            />

            {/* Dark mask overlay outside crop frame */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                style={{
                  width: `${cropBox.width}px`,
                  height: `${cropBox.height}px`,
                  boxShadow: '0 0 0 9999px rgba(10, 15, 30, 0.72)',
                }}
                className="relative border-2 border-indigo-400 rounded-lg pointer-events-none"
              >
                {/* Rule of thirds grid lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                  <div className="border-r border-b border-indigo-300" />
                  <div className="border-r border-b border-indigo-300" />
                  <div className="border-b border-indigo-300" />
                  <div className="border-r border-b border-indigo-300" />
                  <div className="border-r border-b border-indigo-300" />
                  <div className="border-b border-indigo-300" />
                  <div className="border-r border-indigo-300" />
                  <div className="border-r border-indigo-300" />
                  <div />
                </div>
              </div>
            </div>

            {/* Hint geser */}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 text-white text-[10px] backdrop-blur-sm pointer-events-none border border-white/10">
              💡 Geser foto untuk menyesuaikan posisi
            </div>
          </div>

          {/* Controls: Zoom Slider, Rotate, Reset */}
          <div className="flex items-center justify-between gap-3 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800">
            {/* Zoom Slider */}
            <div className="flex items-center gap-2 flex-1">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(0.6, prev - 0.1))}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                title="Perkecil"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0.6"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(3, prev + 0.1))}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                title="Perbesar"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-slate-400 w-10 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Rotate & Reset Buttons */}
            <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
              <button
                type="button"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                title="Putar 90° searah jarum jam"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Putar 90°</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                  setPan({ x: 0, y: 0 });
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Reset Posisi & Zoom"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Keterangan Foto Field */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300">
              Keterangan Foto <span className="text-slate-500 font-normal">(opsional)</span>:
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Misal: Monitoring dan evaluasi siswa di divisi teknisi..."
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses & Menyimpan...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Terapkan & Simpan Foto</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


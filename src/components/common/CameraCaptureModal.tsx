'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X, Check, AlertCircle, Sparkles, FolderOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CameraCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
  title?: string;
}

export function CameraCaptureModal({
  open,
  onOpenChange,
  onCapture,
  title = 'Take Photo with Camera',
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackFileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(true);

  // Stop camera stream helper
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Stopping an already-ended track throws in some browsers; nothing to recover.
        }
      });
      streamRef.current = null;
    }
  };

  // Helper to obtain media stream with progressive fallbacks
  const getStreamWithFallbacks = async (mode: 'environment' | 'user'): Promise<MediaStream> => {
    // 1. Try high-definition with desired facing mode
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
    } catch {
      // 2. Try with facing mode only
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode } },
          audio: false,
        });
      } catch {
        // 3. Universal fallback: any video camera available (desktop webcams, virtual cameras)
        return await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
    }
  };

  // Start camera stream
  const startCamera = async (mode: 'environment' | 'user') => {
    stopStream();
    setError(null);
    setCameraLoading(true);
    setCapturedDataUrl(null);

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported on this browser.');
      }

      const stream = await getStreamWithFallbacks(mode);
      streamRef.current = stream;

      // Check device count safely after permission is granted
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      } catch (err) {
        // Non-fatal: just means the "Flip" camera control stays hidden.
        console.error('Camera enumeration failed:', err);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();
          } catch (err) {
            // Autoplay can be blocked by browser policy; the video element
            // still renders once the stream is attached, so this is non-fatal.
            console.error('Video playback failed to start:', err);
          }
          setCameraLoading(false);
        };
      } else {
        setCameraLoading(false);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraLoading(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission was denied. If you enabled it in site settings, click "Try Again" below.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera device found on this system.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is currently in use by another application or tab.');
      } else {
        setError(err.message || 'Unable to access camera.');
      }
    }
  };

  useEffect(() => {
    if (open) {
      startCamera(facingMode);
    } else {
      stopStream();
      setCapturedDataUrl(null);
      setError(null);
    }
    return () => {
      stopStream();
    };
  }, [open, facingMode]);

  const switchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontal if using user facing camera for natural mirror feel
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedDataUrl(dataUrl);
    stopStream();
  };

  const retakePhoto = () => {
    setCapturedDataUrl(null);
    startCamera(facingMode);
  };

  const confirmPhoto = () => {
    if (!capturedDataUrl) return;

    // Convert dataUrl to File
    const byteString = atob(capturedDataUrl.split(',')[1]);
    const mimeString = capturedDataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    const file = new File([blob], `camera-photo-${Date.now()}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    onCapture(file);
    onOpenChange(false);
  };

  const handleNativeFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-lg p-0 overflow-hidden border border-stone-800 bg-stone-950 text-white shadow-2xl rounded-3xl"
      >
        <DialogHeader className="px-5 py-3.5 border-b border-stone-800 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-amber-500" />
            <DialogTitle className="text-sm font-bold text-stone-100">{title}</DialogTitle>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1.5 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        {/* Hidden native input fallback */}
        <input
          type="file"
          ref={fallbackFileInputRef}
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleNativeFileInput}
        />

        <div className="relative w-full aspect-4/3 sm:aspect-16/10 bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center max-w-sm space-y-3.5">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
              <p className="text-xs text-stone-300 leading-relaxed font-medium">{error}</p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => startCamera(facingMode)}
                  className="bg-stone-900 border-stone-700 text-stone-200 hover:bg-stone-800 text-xs font-bold px-4"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Try Again
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => fallbackFileInputRef.current?.click()}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4"
                >
                  <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                  Select File Instead
                </Button>
              </div>
            </div>
          ) : capturedDataUrl ? (
            <div className="relative w-full h-full">
              <img
                src={capturedDataUrl}
                alt="Captured snapshot"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-amber-400 flex items-center gap-1.5 border border-white/10 shadow-lg">
                <Sparkles className="w-3.5 h-3.5" />
                Snapshot Ready
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Viewfinder crosshairs / grid */}
              <div className="pointer-events-none absolute inset-4 border border-white/20 rounded-2xl">
                <div className="absolute top-0 left-1/3 bottom-0 w-px bg-white/10" />
                <div className="absolute top-0 right-1/3 bottom-0 w-px bg-white/10" />
                <div className="absolute left-0 top-1/3 right-0 h-px bg-white/10" />
                <div className="absolute left-0 bottom-1/3 right-0 h-px bg-white/10" />
              </div>

              {cameraLoading && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2.5">
                  <RefreshCw className="w-7 h-7 text-amber-500 animate-spin" />
                  <span className="text-xs font-semibold text-stone-300">Connecting to camera…</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls footer */}
        <div className="p-4 bg-stone-900 border-t border-stone-800 flex items-center justify-between gap-3">
          {capturedDataUrl ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={retakePhoto}
                className="bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700 text-xs font-bold gap-1.5 h-10 px-4 rounded-xl"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retake
              </Button>
              <Button
                type="button"
                onClick={confirmPhoto}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold gap-1.5 h-10 px-5 rounded-xl shadow-lg shadow-amber-600/30 ml-auto"
              >
                <Check className="w-4 h-4" />
                Use this Photo
              </Button>
            </>
          ) : (
            <>
              {hasMultipleCameras ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={switchCamera}
                  disabled={cameraLoading || Boolean(error)}
                  className="bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700 text-xs gap-1.5 h-9 rounded-xl"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Flip
                </Button>
              ) : (
                <div className="text-[11px] text-stone-400 font-medium">Position dish in center</div>
              )}

              <Button
                type="button"
                onClick={takeSnapshot}
                disabled={cameraLoading || Boolean(error)}
                className="bg-white hover:bg-stone-200 text-stone-950 font-extrabold text-xs h-11 px-6 rounded-full shadow-xl flex items-center gap-2 border-2 border-amber-500/80 mx-auto transition-transform active:scale-95"
              >
                <span className="w-3 h-3 rounded-full bg-amber-600 animate-ping" />
                Take Photo
              </Button>

              <div className="w-12" />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

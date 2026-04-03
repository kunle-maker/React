import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiX, FiCheck, FiRotateCw } from 'react-icons/fi';

const MAX_WIDTH = 340;
const MAX_HEIGHT = 450;
const HANDLE_SIZE = 20;
const MIN_CROP = 40;

export default function ImageCropModal({ src, onCrop, onCancel, circular = false, aspectRatio = null }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ w: 1, h: 1 });
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [interactionType, setInteractionType] = useState(null); // 'move' or handle name 'tl', 'tr', 'bl', 'br'
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startCrop, setStartCrop] = useState(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      setNaturalSize({ w: nw, h: nh });

      // Calculate display size to fit within MAX_WIDTH/MAX_HEIGHT
      let dw = nw;
      let dh = nh;
      const scale = Math.min(MAX_WIDTH / dw, MAX_HEIGHT / dh);
      dw *= scale;
      dh *= scale;
      setDisplaySize({ w: dw, h: dh });

      // Initialize crop box
      let cw = dw;
      let ch = dh;
      
      if (circular) {
        cw = ch = Math.min(dw, dh);
      } else if (aspectRatio) {
        if (dw / dh > aspectRatio) {
          cw = dh * aspectRatio;
        } else {
          ch = dw / aspectRatio;
        }
      }

      setCropBox({
        x: (dw - cw) / 2,
        y: (dh - ch) / 2,
        w: cw,
        h: ch
      });
      setImageLoaded(true);
    };
    img.src = src;
  }, [src, circular, aspectRatio]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;
    const ctx = canvas.getContext('2d');
    const { w: dw, h: dh } = displaySize;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background dimmed image
    ctx.globalAlpha = 0.5;
    ctx.drawImage(img, 0, 0, dw, dh);
    ctx.globalAlpha = 1.0;

    // Draw crop area
    ctx.save();
    ctx.beginPath();
    if (circular) {
      ctx.arc(cropBox.x + cropBox.w / 2, cropBox.y + cropBox.h / 2, cropBox.w / 2, 0, Math.PI * 2);
    } else {
      ctx.rect(cropBox.x, cropBox.y, cropBox.w, cropBox.h);
    }
    ctx.clip();
    ctx.drawImage(img, 0, 0, dw, dh);
    ctx.restore();

    // Draw grid
    if (isInteracting && !circular) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Verticals
      ctx.moveTo(cropBox.x + cropBox.w / 3, cropBox.y);
      ctx.lineTo(cropBox.x + cropBox.w / 3, cropBox.y + cropBox.h);
      ctx.moveTo(cropBox.x + (cropBox.w * 2) / 3, cropBox.y);
      ctx.lineTo(cropBox.x + (cropBox.w * 2) / 3, cropBox.y + cropBox.h);
      // Horizontals
      ctx.moveTo(cropBox.x, cropBox.y + cropBox.h / 3);
      ctx.lineTo(cropBox.x + cropBox.w, cropBox.y + cropBox.h / 3);
      ctx.moveTo(cropBox.x, cropBox.y + (cropBox.h * 2) / 3);
      ctx.lineTo(cropBox.x + cropBox.w, cropBox.y + (cropBox.h * 2) / 3);
      ctx.stroke();
    }

    // Draw border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    if (circular) {
      ctx.beginPath();
      ctx.arc(cropBox.x + cropBox.w / 2, cropBox.y + cropBox.h / 2, cropBox.w / 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(cropBox.x, cropBox.y, cropBox.w, cropBox.h);
    }

    // Draw handles (WhatsApp style corners)
    if (!circular) {
      const hSize = 15;
      const hWeight = 3;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = hWeight;

      // TL
      ctx.beginPath();
      ctx.moveTo(cropBox.x, cropBox.y + hSize);
      ctx.lineTo(cropBox.x, cropBox.y);
      ctx.lineTo(cropBox.x + hSize, cropBox.y);
      ctx.stroke();

      // TR
      ctx.beginPath();
      ctx.moveTo(cropBox.x + cropBox.w - hSize, cropBox.y);
      ctx.lineTo(cropBox.x + cropBox.w, cropBox.y);
      ctx.lineTo(cropBox.x + cropBox.w, cropBox.y + hSize);
      ctx.stroke();

      // BL
      ctx.beginPath();
      ctx.moveTo(cropBox.x, cropBox.y + cropBox.h - hSize);
      ctx.lineTo(cropBox.x, cropBox.y + cropBox.h);
      ctx.lineTo(cropBox.x + hSize, cropBox.y + cropBox.h);
      ctx.stroke();

      // BR
      ctx.beginPath();
      ctx.moveTo(cropBox.x + cropBox.w - hSize, cropBox.y + cropBox.h);
      ctx.lineTo(cropBox.x + cropBox.w, cropBox.y + cropBox.h);
      ctx.lineTo(cropBox.x + cropBox.w, cropBox.y + cropBox.h - hSize);
      ctx.stroke();
    }

  }, [imageLoaded, displaySize, cropBox, isInteracting, circular]);

  useEffect(() => { draw(); }, [draw]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handlePointerDown = (e) => {
    const pos = getPos(e);
    const { x, y, w, h } = cropBox;
    const margin = 20;

    let type = null;
    if (circular) {
      // Circular only allows moving or resizing as a whole? 
      // Actually, let's allow resizing from any "corner" of the bounding box
      if (Math.abs(pos.x - x) < margin && Math.abs(pos.y - y) < margin) type = 'tl';
      else if (Math.abs(pos.x - (x + w)) < margin && Math.abs(pos.y - y) < margin) type = 'tr';
      else if (Math.abs(pos.x - x) < margin && Math.abs(pos.y - (y + h)) < margin) type = 'bl';
      else if (Math.abs(pos.x - (x + w)) < margin && Math.abs(pos.y - (y + h)) < margin) type = 'br';
      else if (pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h) type = 'move';
    } else {
      if (Math.abs(pos.x - x) < margin && Math.abs(pos.y - y) < margin) type = 'tl';
      else if (Math.abs(pos.x - (x + w)) < margin && Math.abs(pos.y - y) < margin) type = 'tr';
      else if (Math.abs(pos.x - x) < margin && Math.abs(pos.y - (y + h)) < margin) type = 'bl';
      else if (Math.abs(pos.x - (x + w)) < margin && Math.abs(pos.y - (y + h)) < margin) type = 'br';
      else if (pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h) type = 'move';
    }

    if (type) {
      setIsInteracting(true);
      setInteractionType(type);
      setStartPos(pos);
      setStartCrop({ ...cropBox });
    }
  };

  const handlePointerMove = useCallback((e) => {
    if (!isInteracting) return;
    const pos = getPos(e);
    const dx = pos.x - startPos.x;
    const dy = pos.y - startPos.y;
    const { w: dw, h: dh } = displaySize;
    let newBox = { ...startCrop };

    if (interactionType === 'move') {
      newBox.x = Math.max(0, Math.min(dw - newBox.w, startCrop.x + dx));
      newBox.y = Math.max(0, Math.min(dh - newBox.h, startCrop.y + dy));
    } else {
      const currentAspectRatio = aspectRatio || (circular ? 1 : null);

      if (interactionType === 'tl') {
        let nw = startCrop.w - dx;
        let nh = startCrop.h - dy;
        if (currentAspectRatio) {
          if (nw / nh > currentAspectRatio) nw = nh * currentAspectRatio;
          else nh = nw / currentAspectRatio;
        }
        if (nw > MIN_CROP && nh > MIN_CROP) {
          newBox.x = startCrop.x + (startCrop.w - nw);
          newBox.y = startCrop.y + (startCrop.h - nh);
          newBox.w = nw;
          newBox.h = nh;
        }
      } else if (interactionType === 'tr') {
        let nw = startCrop.w + dx;
        let nh = startCrop.h - dy;
        if (currentAspectRatio) {
          if (nw / nh > currentAspectRatio) nw = nh * currentAspectRatio;
          else nh = nw / currentAspectRatio;
        }
        if (nw > MIN_CROP && nh > MIN_CROP) {
          newBox.y = startCrop.y + (startCrop.h - nh);
          newBox.w = nw;
          newBox.h = nh;
        }
      } else if (interactionType === 'bl') {
        let nw = startCrop.w - dx;
        let nh = startCrop.h + dy;
        if (currentAspectRatio) {
          if (nw / nh > currentAspectRatio) nw = nh * currentAspectRatio;
          else nh = nw / currentAspectRatio;
        }
        if (nw > MIN_CROP && nh > MIN_CROP) {
          newBox.x = startCrop.x + (startCrop.w - nw);
          newBox.w = nw;
          newBox.h = nh;
        }
      } else if (interactionType === 'br') {
        let nw = startCrop.w + dx;
        let nh = startCrop.h + dy;
        if (currentAspectRatio) {
          if (nw / nh > currentAspectRatio) nw = nh * currentAspectRatio;
          else nh = nw / currentAspectRatio;
        }
        if (nw > MIN_CROP && nh > MIN_CROP) {
          newBox.w = nw;
          newBox.h = nh;
        }
      }

      // Constrain to image bounds
      if (newBox.x < 0) {
        if (currentAspectRatio) {
          const diff = -newBox.x;
          newBox.x = 0;
          newBox.w -= diff;
          newBox.h = newBox.w / currentAspectRatio;
          if (interactionType === 'tl') newBox.y = startCrop.y + (startCrop.h - newBox.h);
        } else {
          newBox.w += newBox.x;
          newBox.x = 0;
        }
      }
      if (newBox.y < 0) {
        if (currentAspectRatio) {
          const diff = -newBox.y;
          newBox.y = 0;
          newBox.h -= diff;
          newBox.w = newBox.h * currentAspectRatio;
          if (interactionType === 'tl') newBox.x = startCrop.x + (startCrop.w - newBox.w);
        } else {
          newBox.h += newBox.y;
          newBox.y = 0;
        }
      }
      if (newBox.x + newBox.w > dw) {
        newBox.w = dw - newBox.x;
        if (currentAspectRatio) newBox.h = newBox.w / currentAspectRatio;
      }
      if (newBox.y + newBox.h > dh) {
        newBox.h = dh - newBox.y;
        if (currentAspectRatio) newBox.w = newBox.h * currentAspectRatio;
      }
    }

    setCropBox(newBox);
  }, [isInteracting, startPos, startCrop, displaySize, interactionType, aspectRatio, circular]);

  const handlePointerUp = () => {
    setIsInteracting(false);
    setInteractionType(null);
  };

  useEffect(() => {
    if (isInteracting) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove, { passive: false });
      window.addEventListener('touchend', handlePointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isInteracting, handlePointerMove]);

  const handleConfirm = () => {
    const img = imageRef.current;
    if (!img) return;

    const scale = naturalSize.w / displaySize.w;
    const outW = cropBox.w * scale;
    const outH = cropBox.h * scale;

    const out = document.createElement('canvas');
    out.width = outW;
    out.height = outH;
    const ctx = out.getContext('2d');

    if (circular) {
      ctx.beginPath();
      ctx.arc(outW / 2, outH / 2, outW / 2, 0, Math.PI * 2);
      ctx.clip();
    }

    ctx.drawImage(
      img,
      cropBox.x * scale,
      cropBox.y * scale,
      cropBox.w * scale,
      cropBox.h * scale,
      0,
      0,
      outW,
      outH
    );

    out.toBlob(blob => {
      if (blob) {
        const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
        onCrop(file, URL.createObjectURL(blob));
      }
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 select-none touch-none">
      <div className="bg-[#111] rounded-2xl overflow-hidden shadow-2xl w-full max-w-[400px] flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={onCancel} className="text-white/70 hover:text-white transition-colors">
            <FiX size={24} />
          </button>
          <h3 className="text-white font-medium">Crop</h3>
          <button onClick={handleConfirm} className="text-white font-semibold text-discord-brand">
            Done
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 bg-black overflow-hidden">
          {!imageLoaded && (
            <div className="w-8 h-8 border-3 border-discord-brand border-t-transparent rounded-full animate-spin" />
          )}
          {imageLoaded && (
            <div className="relative" style={{ width: displaySize.w, height: displaySize.h }}>
              <canvas
                ref={canvasRef}
                width={displaySize.w}
                height={displaySize.h}
                className="block"
                onMouseDown={handlePointerDown}
                onTouchStart={handlePointerDown}
              />
            </div>
          )}
        </div>

        <div className="px-6 py-6 flex flex-col items-center gap-4">
          <p className="text-white/40 text-xs">Drag corners to resize • Drag inside to move</p>
          
          <div className="flex gap-4 w-full">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

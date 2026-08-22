import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiX, FiCheck } from 'react-icons/fi';

const MAX_WIDTH = 340;
const MAX_HEIGHT = 450;
const HANDLE_SIZE = 30; // Larger hit area
const MIN_CROP = 40;

export default function ImageCropModal({ src, onCrop, onCancel, circular = false, aspectRatio = null }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ w: 1, h: 1 });
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [interactionType, setInteractionType] = useState(null); 
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startCrop, setStartCrop] = useState(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      setNaturalSize({ w: nw, h: nh });

      let dw = nw;
      let dh = nh;
      const scale = Math.min(MAX_WIDTH / dw, MAX_HEIGHT / dh);
      dw *= scale;
      dh *= scale;
      setDisplaySize({ w: dw, h: dh });

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

    ctx.globalAlpha = 0.5;
    ctx.drawImage(img, 0, 0, dw, dh);
    ctx.globalAlpha = 1.0;

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

    if (isInteracting && !circular) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < 3; i++) {
        ctx.moveTo(cropBox.x + (cropBox.w / 3) * i, cropBox.y);
        ctx.lineTo(cropBox.x + (cropBox.w / 3) * i, cropBox.y + cropBox.h);
        ctx.moveTo(cropBox.x, cropBox.y + (cropBox.h / 3) * i);
        ctx.lineTo(cropBox.x + cropBox.w, cropBox.y + (cropBox.h / 3) * i);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    if (circular) {
      ctx.beginPath();
      ctx.arc(cropBox.x + cropBox.w / 2, cropBox.y + cropBox.h / 2, cropBox.w / 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(cropBox.x, cropBox.y, cropBox.w, cropBox.h);
      
      const hSize = 15;
      const hWeight = 4;
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
    const m = HANDLE_SIZE;

    let type = null;
    // Corners
    if (Math.abs(pos.x - x) < m && Math.abs(pos.y - y) < m) type = 'tl';
    else if (Math.abs(pos.x - (x + w)) < m && Math.abs(pos.y - y) < m) type = 'tr';
    else if (Math.abs(pos.x - x) < m && Math.abs(pos.y - (y + h)) < m) type = 'bl';
    else if (Math.abs(pos.x - (x + w)) < m && Math.abs(pos.y - (y + h)) < m) type = 'br';
    // Edges
    else if (Math.abs(pos.x - x) < m && pos.y > y && pos.y < y + h) type = 'l';
    else if (Math.abs(pos.x - (x + w)) < m && pos.y > y && pos.y < y + h) type = 'r';
    else if (Math.abs(pos.y - y) < m && pos.x > x && pos.x < x + w) type = 't';
    else if (Math.abs(pos.y - (y + h)) < m && pos.x > x && pos.x < x + w) type = 'b';
    // Move
    else if (pos.x > x && pos.x < x + w && pos.y > y && pos.y < y + h) type = 'move';

    if (type) {
      setIsInteracting(true);
      setInteractionType(type);
      setStartPos(pos);
      setStartCrop({ ...cropBox });
      e.preventDefault();
    }
  };

  const handlePointerMove = useCallback((e) => {
    if (!isInteracting) return;
    const pos = getPos(e);
    const dx = pos.x - startPos.x;
    const dy = pos.y - startPos.y;
    const { w: dw, h: dh } = displaySize;
    let nb = { ...startCrop };

    const ratio = aspectRatio || (circular ? 1 : null);

    if (interactionType === 'move') {
      nb.x = Math.max(0, Math.min(dw - nb.w, startCrop.x + dx));
      nb.y = Math.max(0, Math.min(dh - nb.h, startCrop.y + dy));
    } else {
      if (interactionType.includes('l')) {
        let diff = dx;
        if (ratio && interactionType === 'tl') diff = dy * ratio;
        if (startCrop.w - diff > MIN_CROP) {
          nb.x = startCrop.x + diff;
          nb.w = startCrop.w - diff;
        }
      }
      if (interactionType.includes('r')) {
        if (startCrop.w + dx > MIN_CROP) nb.w = startCrop.w + dx;
      }
      if (interactionType.includes('t')) {
        let diff = dy;
        if (ratio && interactionType === 'tl') diff = dx / ratio;
        if (startCrop.h - diff > MIN_CROP) {
          nb.y = startCrop.y + diff;
          nb.h = startCrop.h - diff;
        }
      }
      if (interactionType.includes('b')) {
        if (startCrop.h + dy > MIN_CROP) nb.h = startCrop.h + dy;
      }

      if (ratio && interactionType !== 'move') {
        if (interactionType === 'tl' || interactionType === 'br' || interactionType === 'tr' || interactionType === 'bl') {
           // Basic corner ratio logic
           if (interactionType === 'br') {
             nb.h = nb.w / ratio;
           } else if (interactionType === 'tr') {
             nb.h = nb.w / ratio;
             nb.y = startCrop.y + (startCrop.h - nb.h);
           } else if (interactionType === 'bl') {
             nb.h = nb.w / ratio;
           } else if (interactionType === 'tl') {
             nb.h = nb.w / ratio;
             nb.y = startCrop.y + (startCrop.h - nb.h);
             nb.x = startCrop.x + (startCrop.w - nb.w);
           }
        }
      }

      // Constraints
      if (nb.x < 0) { nb.w += nb.x; nb.x = 0; }
      if (nb.y < 0) { nb.h += nb.y; nb.y = 0; }
      if (nb.x + nb.w > dw) nb.w = dw - nb.x;
      if (nb.y + nb.h > dh) nb.h = dh - nb.y;
      
      if (ratio) {
        if (nb.w / nb.h !== ratio) {
          if (nb.w / dh > ratio) {
            nb.w = nb.h * ratio;
          } else {
            nb.h = nb.w / ratio;
          }
        }
      }
    }
    setCropBox(nb);
  }, [isInteracting, startPos, startCrop, displaySize, interactionType, aspectRatio, circular]);

  const handlePointerUp = useCallback(() => {
    setIsInteracting(false);
    setInteractionType(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const handleConfirm = () => {
    const img = imageRef.current;
    if (!img) return;
    const scale = naturalSize.w / displaySize.w;
    const out = document.createElement('canvas');
    out.width = cropBox.w * scale;
    out.height = cropBox.h * scale;
    const ctx = out.getContext('2d');
    if (circular) {
      ctx.beginPath();
      ctx.arc(out.width/2, out.height/2, out.width/2, 0, Math.PI*2);
      ctx.clip();
    }
    ctx.drawImage(img, cropBox.x * scale, cropBox.y * scale, cropBox.w * scale, cropBox.h * scale, 0, 0, out.width, out.height);
    out.toBlob(blob => {
      if (blob) onCrop(new File([blob], 'cropped.jpg', { type: 'image/jpeg' }), URL.createObjectURL(blob));
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 select-none touch-none">
      <div className="bg-[#111] rounded-2xl overflow-hidden shadow-2xl w-full max-w-[400px] flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <button onClick={onCancel} className="text-white/70 hover:text-white transition-colors p-1">
            <FiX size={24} />
          </button>
          <h3 className="text-white font-medium">Edit Media</h3>
          <button onClick={handleConfirm} className="text-discord-brand font-bold hover:brightness-110">Done</button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 bg-black overflow-hidden relative">
          {!imageLoaded && <div className="w-8 h-8 border-3 border-discord-brand border-t-transparent rounded-full animate-spin" />}
          {imageLoaded && (
            <div className="relative" style={{ width: displaySize.w, height: displaySize.h }}>
              <canvas
                ref={canvasRef}
                width={displaySize.w}
                height={displaySize.h}
                className="block touch-none"
                onMouseDown={handlePointerDown}
                onTouchStart={handlePointerDown}
              />
            </div>
          )}
        </div>

        <div className="px-6 py-6 flex flex-col items-center gap-4 bg-[#111]">
          <p className="text-white/40 text-xs text-center">Drag corners or edges to resize<br/>Drag inside to move</p>
          <div className="flex gap-4 w-full">
            <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-white/5 text-white text-sm font-medium hover:bg-white/10 transition-colors">Cancel</button>
            <button onClick={handleConfirm} className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-colors">Apply</button>
          </div>
        </div>
      </div>
    </div>
  );
}

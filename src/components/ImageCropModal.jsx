import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiX, FiCheck, FiZoomIn, FiZoomOut } from 'react-icons/fi';

const CANVAS_SIZE = 300;
const MAX_CANVAS_H = 480;

export default function ImageCropModal({ src, onCrop, onCancel, circular = false, aspectRatio = null }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ w: 1, h: 1 });
  const [canvasH, setCanvasH] = useState(CANVAS_SIZE);

  const cropW = CANVAS_SIZE;
  const cropH = canvasH;

  useEffect(() => {
    setImageLoaded(false);
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      setNaturalSize({ w: nw, h: nh });

      let newH;
      if (circular) {
        newH = CANVAS_SIZE;
      } else if (aspectRatio) {
        newH = Math.round(CANVAS_SIZE / aspectRatio);
      } else {
        newH = Math.min(Math.round(CANVAS_SIZE * nh / nw), MAX_CANVAS_H);
      }
      setCanvasH(newH);

      const minScale = Math.max(CANVAS_SIZE / nw, newH / nh);
      setScale(minScale);
      setOffset({ x: 0, y: 0 });
      setImageLoaded(true);
    };
    img.src = src;
  }, [src, circular, aspectRatio]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    if (!W || !H) return;

    ctx.clearRect(0, 0, W, H);

    const iw = naturalSize.w * scale;
    const ih = naturalSize.h * scale;
    const ix = (W - iw) / 2 + offset.x;
    const iy = (H - ih) / 2 + offset.y;

    ctx.drawImage(img, ix, iy, iw, ih);

    ctx.save();
    if (circular) {
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fill('evenodd');
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    if (circular) {
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, W / 2 - 1, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(1, 1, W - 2, H - 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < 3; i++) {
        ctx.moveTo((W / 3) * i, 0);
        ctx.lineTo((W / 3) * i, H);
        ctx.moveTo(0, (H / 3) * i);
        ctx.lineTo(W, (H / 3) * i);
      }
      ctx.stroke();
    }
  }, [imageLoaded, scale, offset, naturalSize, circular]);

  useEffect(() => { draw(); }, [draw]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    const pos = getPos(e);
    setDragging(true);
    setDragStart({ x: pos.x - offset.x, y: pos.y - offset.y });
  };

  const onPointerMove = useCallback((e) => {
    if (!dragging) return;
    e.preventDefault();
    const pos = getPos(e);
    const newX = pos.x - dragStart.x;
    const newY = pos.y - dragStart.y;
    const W = CANVAS_SIZE;
    const H = cropH;
    const iw = naturalSize.w * scale;
    const ih = naturalSize.h * scale;
    const maxX = Math.max(0, (iw - W) / 2);
    const maxY = Math.max(0, (ih - H) / 2);
    setOffset({
      x: Math.max(-maxX, Math.min(maxX, newX)),
      y: Math.max(-maxY, Math.min(maxY, newY)),
    });
  }, [dragging, dragStart, naturalSize, scale, cropH]);

  const onPointerUp = () => setDragging(false);

  useEffect(() => {
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
    return () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
    };
  }, [onPointerMove]);

  const changeScale = (delta) => {
    const minScale = Math.max(cropW / naturalSize.w, cropH / naturalSize.h);
    setScale(prev => Math.max(minScale, Math.min(5, prev + delta)));
  };

  const handleConfirm = () => {
    const img = imageRef.current;
    if (!img) return;
    const W = CANVAS_SIZE;
    const H = canvasH;
    const iw = naturalSize.w * scale;
    const ih = naturalSize.h * scale;
    const ix = (W - iw) / 2 + offset.x;
    const iy = (H - ih) / 2 + offset.y;

    const rawSrcW = W / scale;
    const rawSrcH = H / scale;
    const maxDim = 3000;
    const dimScale = Math.min(1, maxDim / Math.max(rawSrcW, rawSrcH));
    const outW = Math.round(rawSrcW * dimScale);
    const outH = circular ? outW : Math.round(rawSrcH * dimScale);
    const out = document.createElement('canvas');
    out.width = outW;
    out.height = outH;
    const ctx = out.getContext('2d');

    const srcX = (0 - ix) / scale;
    const srcY = (0 - iy) / scale;
    const srcW = W / scale;
    const srcH = H / scale;

    if (circular) {
      ctx.beginPath();
      ctx.arc(outW / 2, outH / 2, outW / 2, 0, Math.PI * 2);
      ctx.clip();
    }
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

    out.toBlob(blob => {
      if (blob) {
        const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
        onCrop(file, URL.createObjectURL(blob));
      }
    }, 'image/jpeg', 0.92);
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
      <div className="bg-discord-dark rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-discord-hover">
          <h3 className="font-bold text-discord-text">Crop Image</h3>
          <button onClick={onCancel} className="text-discord-muted hover:text-discord-text transition-colors p-1">
            <FiX size={20} />
          </button>
        </div>

        <div className="flex items-center justify-center bg-black p-2">
          {!imageLoaded && (
            <div className="flex items-center justify-center" style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
              <div className="w-6 h-6 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={canvasH}
            style={{
              cursor: dragging ? 'grabbing' : 'grab',
              touchAction: 'none',
              maxWidth: '100%',
              maxHeight: '60vh',
              display: imageLoaded ? 'block' : 'none',
            }}
            onMouseDown={onPointerDown}
            onTouchStart={onPointerDown}
          />
        </div>

        <div className="px-4 py-4 border-t border-discord-hover">
          <p className="text-discord-muted text-xs text-center mb-3">Drag to reposition · Slide to zoom</p>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => changeScale(-0.15)}
              className="p-2 rounded-lg bg-discord-hover text-discord-text hover:bg-discord-input transition-colors flex-shrink-0"
            >
              <FiZoomOut size={16} />
            </button>
            <input
              type="range"
              min={50}
              max={500}
              value={Math.round(scale * 100)}
              onChange={e => {
                const minScale = Math.max(cropW / naturalSize.w, cropH / naturalSize.h);
                const newScale = Math.max(minScale, e.target.value / 100);
                setScale(newScale);
              }}
              className="flex-1 accent-discord-brand cursor-pointer"
            />
            <button
              onClick={() => changeScale(0.15)}
              className="p-2 rounded-lg bg-discord-hover text-discord-text hover:bg-discord-input transition-colors flex-shrink-0"
            >
              <FiZoomIn size={16} />
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-discord-hover text-discord-text text-sm hover:bg-discord-hover transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-xl bg-discord-brand text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-discord-brand/90 transition-colors"
            >
              <FiCheck size={15} /> Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

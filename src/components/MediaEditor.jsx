import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiX, FiCheck, FiType, FiSmile, FiEdit3, FiCrop, FiScissors, FiTrash2, FiChevronDown, FiVolumeX, FiVolume2 } from 'react-icons/fi';
import { MdUndo, MdFormatColorFill } from 'react-icons/md';
import ImageCropModal from './ImageCropModal';
import { getTwemojiUrl } from '../utils/emoji';

const COLORS = ['#ffffff', '#000000', '#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#007aff', '#af52de', '#ff2d55'];
const FONT_SIZES = [18, 24, 32, 48];
const DRAW_SIZES = [3, 6, 12, 20];

function EmojiGrid({ onSelect }) {
  const emojis = ['😂','❤️','🔥','😍','🥰','😎','🤩','👑','✨','🌟','💯','🙌','👏','🎉','🎊','💥','⚡','🌈','🦋','🌸','🍀','🎵','🎶','💪','🤘','👀','😭','😤','🥳','🤯','💀','👽','🤖','🐶','🐱','🦊','🐼','🦁','🐸','🦄'];
  return (
    <div className="grid grid-cols-8 gap-1 p-2 max-h-40 overflow-y-auto">
      {emojis.map(e => (
        <button key={e} className="p-1 hover:bg-white/10 rounded transition-colors active:scale-90 flex items-center justify-center" onClick={() => onSelect(e)}>
          <img
            src={getTwemojiUrl(e)}
            alt={e}
            className="w-7 h-7"
            style={{ imageRendering: 'auto' }}
            onError={ev => {
              ev.target.style.display = 'none';
              if (ev.target.nextSibling) ev.target.nextSibling.style.display = 'inline';
            }}
          />
          <span style={{ display: 'none', fontSize: '1.5rem' }}>{e}</span>
        </button>
      ))}
    </div>
  );
}

export default function MediaEditor({ file, type, onDone, onCancel }) {
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const twemojiCache = useRef({});

  const [tool, setTool] = useState(null);
  const [drawColor, setDrawColor] = useState('#ffffff');
  const [drawSize, setDrawSize] = useState(6);
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(24);
  const [textValue, setTextValue] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [showEmojiGrid, setShowEmojiGrid] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [stickers, setStickers] = useState([]);
  const [textLayers, setTextLayers] = useState([]);
  const [drawPaths, setDrawPaths] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [showCrop, setShowCrop] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [croppedFile, setCroppedFile] = useState(null);
  const [croppedUrl, setCroppedUrl] = useState(null);
  const [imgEl, setImgEl] = useState(null);
  const [mediaSize, setMediaSize] = useState({ w: 0, h: 0 });
  const [processing, setProcessing] = useState(false);
  const [selectedSticker, setSelectedSticker] = useState(null);
  const [selectedText, setSelectedText] = useState(null);
  const [dragging, setDragging] = useState(null);

  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const trimStartRef = useRef(0);
  const trimEndRef = useRef(null);

  const objectUrl = useRef(null);

  useEffect(() => {
    objectUrl.current = URL.createObjectURL(file);
    return () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); };
  }, [file]);

  useEffect(() => {
    if (type === 'image') {
      const img = new Image();
      img.onload = () => {
        setImgEl(img);
        setMediaSize({ w: img.naturalWidth, h: img.naturalHeight });
      };
      img.src = croppedUrl || objectUrl.current;
    }
  }, [type, croppedUrl]);

  useEffect(() => {
    if (type === 'image' && imgEl && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = imgEl.naturalWidth;
      canvas.height = imgEl.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgEl, 0, 0);
    }
  }, [imgEl, type]);

  useEffect(() => {
    drawOverlay();
  }, [drawPaths, stickers, textLayers, selectedSticker, selectedText]);

  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawPaths.forEach(path => {
      if (!path.points.length) return;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });

    stickers.forEach((s, i) => {
      ctx.save();
      if (selectedSticker === i) {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(s.x - s.size / 2 - 4, s.y - s.size / 2 - 4, s.size + 8, s.size + 8);
      }
      const url = getTwemojiUrl(s.emoji);
      if (twemojiCache.current[url]) {
        ctx.drawImage(twemojiCache.current[url], s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          twemojiCache.current[url] = img;
          drawOverlay();
        };
        img.src = url;
        ctx.font = `${s.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.emoji, s.x, s.y);
      }
      ctx.restore();
    });

    textLayers.forEach((t, i) => {
      ctx.save();
      ctx.font = `bold ${t.size}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = t.color;
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 4;
      if (selectedText === i) {
        const metrics = ctx.measureText(t.text);
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        ctx.strokeRect(t.x - 4, t.y - 4, metrics.width + 8, t.size + 8);
        ctx.shadowBlur = 4;
      }
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    });
  }, [drawPaths, stickers, textLayers, selectedSticker, selectedText]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e) => {
    if (tool === 'draw') {
      e.preventDefault();
      const pos = getPos(e, overlayCanvasRef.current);
      setIsDrawing(true);
      setCurrentPath([pos]);
    } else if (tool === 'sticker' || tool === 'text') {
      const pos = getPos(e, overlayCanvasRef.current);
      let hitSticker = -1;
      for (let i = stickers.length - 1; i >= 0; i--) {
        const s = stickers[i];
        if (Math.abs(pos.x - s.x) < s.size / 2 + 10 && Math.abs(pos.y - s.y) < s.size / 2 + 10) {
          hitSticker = i;
          break;
        }
      }
      let hitText = -1;
      if (hitSticker === -1) {
        for (let i = textLayers.length - 1; i >= 0; i--) {
          const t = textLayers[i];
          if (pos.x >= t.x - 10 && pos.x <= t.x + 200 && pos.y >= t.y - 10 && pos.y <= t.y + t.size + 10) {
            hitText = i;
            break;
          }
        }
      }
      if (hitSticker >= 0) {
        setSelectedSticker(hitSticker);
        setSelectedText(null);
        setDragging({ type: 'sticker', index: hitSticker, startPos: pos });
      } else if (hitText >= 0) {
        setSelectedText(hitText);
        setSelectedSticker(null);
        setDragging({ type: 'text', index: hitText, startPos: pos });
      } else {
        setSelectedSticker(null);
        setSelectedText(null);
      }
    }
  };

  const handlePointerMove = (e) => {
    if (tool === 'draw' && isDrawing) {
      e.preventDefault();
      const pos = getPos(e, overlayCanvasRef.current);
      setCurrentPath(prev => {
        const updated = [...prev, pos];
        const canvas = overlayCanvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = drawSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (prev.length > 0) {
          ctx.moveTo(prev[prev.length - 1].x, prev[prev.length - 1].y);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
        }
        return updated;
      });
    } else if (dragging) {
      e.preventDefault();
      const pos = getPos(e, overlayCanvasRef.current);
      if (dragging.type === 'sticker') {
        setStickers(prev => prev.map((s, i) => i === dragging.index ? { ...s, x: pos.x, y: pos.y } : s));
      } else if (dragging.type === 'text') {
        setTextLayers(prev => prev.map((t, i) => i === dragging.index ? { ...t, x: pos.x, y: pos.y } : t));
      }
    }
  };

  const handlePointerUp = () => {
    if (tool === 'draw' && isDrawing) {
      setIsDrawing(false);
      setDrawPaths(prev => [...prev, { points: currentPath, color: drawColor, size: drawSize }]);
      setCurrentPath([]);
    }
    setDragging(null);
  };

  const placeEmoji = (emoji) => {
    const canvas = overlayCanvasRef.current;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    setStickers(prev => [...prev, { emoji, x: cx, y: cy, size: 80 }]);
    setShowEmojiGrid(false);
    setTool('sticker');
  };

  const addText = () => {
    if (!textValue.trim()) return;
    const canvas = overlayCanvasRef.current;
    setTextLayers(prev => [...prev, { text: textValue, x: canvas.width / 4, y: canvas.height / 3, color: textColor, size: fontSize }]);
    setTextValue('');
    setShowTextInput(false);
    setTool('text');
  };

  const deleteSelected = () => {
    if (selectedSticker !== null) {
      setStickers(prev => prev.filter((_, i) => i !== selectedSticker));
      setSelectedSticker(null);
    }
    if (selectedText !== null) {
      setTextLayers(prev => prev.filter((_, i) => i !== selectedText));
      setSelectedText(null);
    }
  };

  const undoDraw = () => {
    setDrawPaths(prev => prev.slice(0, -1));
  };

  const handleCropOpen = () => {
    const src = croppedUrl || objectUrl.current;
    setCropSrc(src);
    setShowCrop(true);
  };

  const handleCropDone = (file, url) => {
    setCroppedFile(file);
    setCroppedUrl(url);
    const img = new Image();
    img.onload = () => {
      setImgEl(img);
      setMediaSize({ w: img.naturalWidth, h: img.naturalHeight });
      if (canvasRef.current) {
        canvasRef.current.width = img.naturalWidth;
        canvasRef.current.height = img.naturalHeight;
        const ctx = canvasRef.current.getContext('2d');
        ctx.drawImage(img, 0, 0);
      }
    };
    img.src = url;
    setShowCrop(false);
    setCropSrc(null);
  };

  const compositeImage = () => {
    return new Promise(resolve => {
      const base = canvasRef.current;
      const overlay = overlayCanvasRef.current;
      const out = document.createElement('canvas');
      out.width = base.width;
      out.height = base.height;
      const ctx = out.getContext('2d');
      ctx.drawImage(base, 0, 0);
      ctx.drawImage(overlay, 0, 0);
      out.toBlob(blob => {
        const f = new File([blob], 'edited.jpg', { type: 'image/jpeg' });
        resolve({ file: f, url: URL.createObjectURL(blob) });
      }, 'image/jpeg', 0.92);
    });
  };

  const compositeVideo = () => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;
      const overlay = overlayCanvasRef.current;
      if (!video) { reject(new Error('No video')); return; }

      const outCanvas = document.createElement('canvas');
      outCanvas.width = video.videoWidth || 720;
      outCanvas.height = video.videoHeight || 1280;
      const ctx = outCanvas.getContext('2d');

      const hasEdits = drawPaths.length > 0 || stickers.length > 0 || textLayers.length > 0;
      const startTime = trimStartRef.current;
      const endTime = trimEndRef.current !== null ? trimEndRef.current : video.duration;
      const noTrim = startTime === 0 && endTime >= video.duration;

      if (!hasEdits && noTrim) {
        resolve({ file: croppedFile || file, url: croppedUrl || objectUrl.current });
        return;
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      const stream = outCanvas.captureStream(30);
      let recorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType });
      } catch {
        resolve({ file: croppedFile || file, url: croppedUrl || objectUrl.current });
        return;
      }
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const f = new File([blob], 'edited.webm', { type: 'video/webm' });
        resolve({ file: f, url: URL.createObjectURL(blob) });
      };

      video.muted = true;
      video.currentTime = startTime;

      const drawFrame = () => {
        if (video.currentTime >= endTime) {
          video.pause();
          recorder.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, outCanvas.width, outCanvas.height);
        if (hasEdits && overlay) {
          ctx.drawImage(overlay, 0, 0, outCanvas.width, outCanvas.height);
        }
        requestAnimationFrame(drawFrame);
      };

      video.onseeked = () => {
        recorder.start(100);
        video.play().then(drawFrame).catch(() => {
          recorder.stop();
          resolve({ file: croppedFile || file, url: croppedUrl || objectUrl.current });
        });
      };
    });
  };

  const handleDone = async () => {
    setProcessing(true);
    try {
      if (type === 'image') {
        const result = await compositeImage();
        onDone(result.file, result.url, {});
      } else {
        const result = await compositeVideo();
        onDone(result.file, result.url, { videoMuted });
      }
    } catch (e) {
      onDone(croppedFile || file, croppedUrl || objectUrl.current, { videoMuted });
    } finally {
      setProcessing(false);
    }
  };

  const mediaUrl = croppedUrl || objectUrl.current;

  const overlayCanvasWidth = mediaSize.w || 720;
  const overlayCanvasHeight = mediaSize.h || 1280;

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (canvas) {
      canvas.width = overlayCanvasWidth;
      canvas.height = overlayCanvasHeight;
      drawOverlay();
    }
  }, [overlayCanvasWidth, overlayCanvasHeight]);

  useEffect(() => {
    if (type === 'video' && videoRef.current) {
      const v = videoRef.current;
      const onMeta = () => {
        setVideoDuration(v.duration);
        setTrimEnd(v.duration);
        trimEndRef.current = v.duration;
        setMediaSize({ w: v.videoWidth || 720, h: v.videoHeight || 1280 });
      };
      const onTime = () => setVideoCurrentTime(v.currentTime);
      v.addEventListener('loadedmetadata', onMeta);
      v.addEventListener('timeupdate', onTime);
      v.addEventListener('ended', () => setVideoPlaying(false));
      return () => {
        v.removeEventListener('loadedmetadata', onMeta);
        v.removeEventListener('timeupdate', onTime);
      };
    }
  }, [type]);

  const handleTrimStartChange = (val) => {
    const v = parseFloat(val);
    setTrimStart(v);
    trimStartRef.current = v;
    if (videoRef.current) videoRef.current.currentTime = v;
  };

  const handleTrimEndChange = (val) => {
    const v = parseFloat(val);
    setTrimEnd(v);
    trimEndRef.current = v;
  };

  const toggleVideoPlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (videoPlaying) {
      v.pause();
      setVideoPlaying(false);
    } else {
      if (v.currentTime >= (trimEndRef.current || v.duration)) {
        v.currentTime = trimStartRef.current;
      }
      v.play().then(() => setVideoPlaying(true)).catch(() => {});
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoPlaying) return;
    const checkTime = () => {
      if (v.currentTime >= (trimEndRef.current || v.duration)) {
        v.pause();
        setVideoPlaying(false);
      }
    };
    const interval = setInterval(checkTime, 100);
    return () => clearInterval(interval);
  }, [videoPlaying]);

  const toolBtnClass = (t) =>
    `flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all text-xs font-bold ${tool === t ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`;

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col" style={{ userSelect: 'none' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm flex-shrink-0">
        <button onClick={onCancel} className="p-2 text-white/70 hover:text-white transition-colors">
          <FiX size={22} />
        </button>
        <span className="text-white font-bold text-sm">{type === 'video' ? 'Edit Video' : 'Edit Photo'}</span>
        <button
          onClick={handleDone}
          disabled={processing}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-sm font-bold disabled:opacity-50 active:scale-95 transition-all"
        >
          {processing ? (
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <FiCheck size={16} />
          )}
          Done
        </button>
      </div>

      {/* Media Area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden flex items-center justify-center bg-black min-h-0">
        {type === 'image' ? (
          <>
            <canvas ref={canvasRef} className="absolute inset-0 m-auto max-w-full max-h-full object-contain" style={{ display: 'block' }} />
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 m-auto max-w-full max-h-full"
              style={{ touchAction: tool === 'draw' ? 'none' : 'auto', cursor: tool === 'draw' ? 'crosshair' : 'default', display: 'block' }}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />
          </>
        ) : (
          <>
            <video
              ref={videoRef}
              src={mediaUrl}
              className="max-w-full max-h-full object-contain"
              playsInline
              muted={videoMuted}
              loop={false}
              onClick={toggleVideoPlay}
            />
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 m-auto max-w-full max-h-full pointer-events-auto"
              style={{
                touchAction: tool === 'draw' ? 'none' : 'auto',
                cursor: tool === 'draw' ? 'crosshair' : 'default',
              }}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />
            {!videoPlaying && (
              <button
                className="absolute inset-0 m-auto w-14 h-14 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full text-white text-2xl pointer-events-auto z-10"
                onClick={toggleVideoPlay}
              >
                ▶
              </button>
            )}
          </>
        )}

        {/* Floating delete for selected items */}
        {(selectedSticker !== null || selectedText !== null) && (
          <button
            onClick={deleteSelected}
            className="absolute top-3 right-3 bg-red-500/90 p-2.5 rounded-full text-white z-20 shadow-lg active:scale-90 transition-transform"
          >
            <FiTrash2 size={18} />
          </button>
        )}
      </div>

      {/* Video Trim Controls */}
      {type === 'video' && videoDuration > 0 && (
        <div className="flex-shrink-0 bg-black/90 px-4 py-3 border-t border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <FiScissors size={14} className="text-white/60" />
            <span className="text-white/70 text-xs font-bold">Trim</span>
            <span className="text-white/40 text-xs ml-auto">
              {trimStart.toFixed(1)}s — {(trimEnd || videoDuration).toFixed(1)}s
            </span>
          </div>
          <div className="relative h-10 flex items-center">
            <div className="absolute left-0 right-0 h-1.5 bg-white/20 rounded-full" />
            <div
              className="absolute h-1.5 bg-blue-400 rounded-full"
              style={{
                left: `${(trimStart / videoDuration) * 100}%`,
                right: `${100 - ((trimEnd || videoDuration) / videoDuration) * 100}%`,
              }}
            />
            <input
              type="range" min={0} max={videoDuration} step={0.1}
              value={trimStart}
              onChange={e => handleTrimStartChange(e.target.value)}
              className="absolute w-full opacity-0 h-10 cursor-pointer z-10"
              style={{ pointerEvents: 'auto' }}
            />
            <input
              type="range" min={0} max={videoDuration} step={0.1}
              value={trimEnd || videoDuration}
              onChange={e => handleTrimEndChange(e.target.value)}
              className="absolute w-full opacity-0 h-10 cursor-pointer z-10"
            />
            <div
              className="absolute w-4 h-6 bg-white rounded-sm shadow-lg z-20 -translate-x-1/2 cursor-grab"
              style={{ left: `${(trimStart / videoDuration) * 100}%` }}
            />
            <div
              className="absolute w-4 h-6 bg-white rounded-sm shadow-lg z-20 -translate-x-1/2 cursor-grab"
              style={{ left: `${((trimEnd || videoDuration) / videoDuration) * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400/60 transition-all"
                style={{ width: `${(videoCurrentTime / videoDuration) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Emoji Grid Popup */}
      {showEmojiGrid && (
        <div className="flex-shrink-0 bg-gray-900 border-t border-white/10 animate-fade-in">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-white/70 text-xs font-bold">Add Sticker</span>
            <button onClick={() => setShowEmojiGrid(false)} className="text-white/50 hover:text-white">
              <FiChevronDown size={16} />
            </button>
          </div>
          <EmojiGrid onSelect={placeEmoji} />
        </div>
      )}

      {/* Text Input Popup */}
      {showTextInput && (
        <div className="flex-shrink-0 bg-gray-900 border-t border-white/10 p-3 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={textValue}
              onChange={e => setTextValue(e.target.value)}
              placeholder="Type something..."
              className="flex-1 bg-white/10 text-white placeholder-white/40 rounded-xl px-3 py-2 text-sm outline-none border border-white/20 focus:border-white/50"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && addText()}
            />
            <button
              onClick={addText}
              className="bg-white text-black px-4 py-2 rounded-xl text-sm font-bold active:scale-95 transition-transform"
            >
              Add
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white/50 text-xs">Color:</span>
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setTextColor(c)}
                className="w-6 h-6 rounded-full border-2 transition-all active:scale-90"
                style={{ background: c, borderColor: textColor === c ? 'white' : 'transparent' }}
              />
            ))}
            <span className="text-white/50 text-xs ml-2">Size:</span>
            {FONT_SIZES.map(s => (
              <button
                key={s}
                onClick={() => setFontSize(s)}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${fontSize === s ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Color Picker for Draw */}
      {showColorPicker && tool === 'draw' && (
        <div className="flex-shrink-0 bg-gray-900 border-t border-white/10 p-3 animate-fade-in">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-white/50 text-xs">Brush Color:</span>
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setDrawColor(c)}
                className="w-7 h-7 rounded-full border-2 transition-all active:scale-90"
                style={{ background: c, borderColor: drawColor === c ? 'white' : 'transparent' }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-xs">Size:</span>
            {DRAW_SIZES.map(s => (
              <button
                key={s}
                onClick={() => setDrawSize(s)}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${drawSize === s ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
              >
                {s}px
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex-shrink-0 bg-black/90 border-t border-white/10 px-3 pb-safe py-2">
        <div className="flex items-center gap-2 justify-center overflow-x-auto pb-1">
          {type === 'video' && (
            <button
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all text-xs font-bold ${videoMuted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
              onClick={() => {
                setVideoMuted(m => !m);
                if (videoRef.current) videoRef.current.muted = !videoMuted;
              }}
            >
              {videoMuted ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
              {videoMuted ? 'Unmute' : 'Mute'}
            </button>
          )}
          {type === 'image' && (
            <button className={toolBtnClass('crop')} onClick={handleCropOpen}>
              <FiCrop size={20} />
              Crop
            </button>
          )}
          <button className={toolBtnClass('draw')} onClick={() => {
            setTool(t => t === 'draw' ? null : 'draw');
            setShowColorPicker(t => t === 'draw' ? false : true);
            setShowTextInput(false);
            setShowEmojiGrid(false);
          }}>
            <FiEdit3 size={20} />
            Draw
          </button>
          <button
            className={toolBtnClass('text')}
            onClick={() => {
              setTool('text');
              setShowTextInput(true);
              setShowEmojiGrid(false);
              setShowColorPicker(false);
            }}
          >
            <FiType size={20} />
            Text
          </button>
          <button
            className={toolBtnClass('sticker')}
            onClick={() => {
              setTool('sticker');
              setShowEmojiGrid(e => !e);
              setShowTextInput(false);
              setShowColorPicker(false);
            }}
          >
            <FiSmile size={20} />
            Emoji
          </button>
          {drawPaths.length > 0 && (
            <button
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 text-xs font-bold transition-all"
              onClick={undoDraw}
            >
              <MdUndo size={20} />
              Undo
            </button>
          )}
        </div>
      </div>

      {showCrop && cropSrc && (
        <ImageCropModal
          src={cropSrc}
          aspectRatio={1}
          onCrop={handleCropDone}
          onCancel={() => { setShowCrop(false); setCropSrc(null); }}
        />
      )}
    </div>
  );
}

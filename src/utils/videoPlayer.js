export const activeVideo = { ref: null };

export function playVideo(videoEl) {
  if (!videoEl) return;
  if (activeVideo.ref && activeVideo.ref !== videoEl) {
    activeVideo.ref.pause();
  }
  videoEl.play().then(() => {
    activeVideo.ref = videoEl;
  }).catch(() => {});
}

export function pauseVideo(videoEl) {
  if (!videoEl) return;
  videoEl.pause();
  if (activeVideo.ref === videoEl) activeVideo.ref = null;
}

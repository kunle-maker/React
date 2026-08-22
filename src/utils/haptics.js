export function haptic(pattern = 'light') {
  if (!navigator.vibrate) return;
  const patterns = {
    light:        [8],
    medium:       [20],
    heavy:        [30, 10, 30],
    success:      [10, 50, 10],
    error:        [50, 30, 50, 30, 50],
    notification: [20, 100, 20],
    tap:          [6],
    doubleTap:    [6, 40, 6],
  };
  const seq = patterns[pattern];
  if (seq) navigator.vibrate(seq);
  else if (typeof pattern === 'number') navigator.vibrate(pattern);
}

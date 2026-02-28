// src/utils/lighthouse.js
export const runPerformanceAudit = () => {
  if (process.env.NODE_ENV === 'development') {
    console.group('📊 Performance Audit');
    
    // Check Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log(`✅ LCP (Largest Contentful Paint): ${Math.round(lastEntry.startTime)}ms`);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      console.log('LCP not supported');
    }
    
    // Check First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          console.log(`✅ FID (First Input Delay): ${Math.round(entry.processingStart - entry.startTime)}ms`);
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      console.log('FID not supported');
    }
    
    // Check Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        console.log(`✅ CLS (Cumulative Layout Shift): ${clsValue.toFixed(3)}`);
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.log('CLS not supported');
    }
    
    // Check Time to First Byte
    try {
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const navEntry = navigationEntries[0];
        console.log(`✅ TTFB (Time to First Byte): ${Math.round(navEntry.responseStart)}ms`);
        console.log(`✅ DOM Content Loaded: ${Math.round(navEntry.domContentLoadedEventEnd)}ms`);
        console.log(`✅ Load Event: ${Math.round(navEntry.loadEventEnd)}ms`);
      }
    } catch (e) {
      console.log('Navigation timing not available');
    }
    
    // Check resource sizes
    try {
      const resources = performance.getEntriesByType('resource');
      const totalSize = resources.reduce((acc, res) => {
        if (res.transferSize) {
          return acc + res.transferSize;
        }
        return acc;
      }, 0);
      
      console.log(`✅ Total Resource Size: ${(totalSize / 1024).toFixed(2)} KB`);
      console.log(`✅ Total Resources: ${resources.length}`);
    } catch (e) {
      console.log('Resource timing not available');
    }
    
    console.groupEnd();
  }
};

export const monitorLongTasks = () => {
  if (window.PerformanceLongTaskTiming) {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        console.warn(`WARNING: Long Task detected: ${Math.round(entry.duration)}mS`, entry);
      });
    });
    observer.observe({ entryTypes: ['longtask'] });
  }
};

export const withRenderTimer = (Component, name) => {
  return (props) => {
    const start = performance.now();
    const result = <Component {...props} />;
    const end = performance.now();
    
    if (process.env.NODE_ENV === 'development' && end - start > 16) {
      console.warn(`WARNING: Slow render: ${name} took ${Math.round(end - start)}ms`);
    }
    
    return result;
  };
};

export const checkMemoryLeaks = () => {
  if (performance.memory) {
    console.log('Memory Usage:', {
      usedJSHeapSize: `${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB`,
      totalJSHeapSize: `${Math.round(performance.memory.totalJSHeapSize / 1048576)} MB`,
      jsHeapSizeLimit: `${Math.round(performance.memory.jsHeapSizeLimit / 1048576)} MB`
    });
  }
};
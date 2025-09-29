import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook para implementar scroll infinito
 * @param {Function} onLoadMore - Función a ejecutar cuando se llega al final
 * @param {boolean} hasMore - Si hay más datos para cargar
 * @param {boolean} isLoading - Si está cargando actualmente
 * @param {number} threshold - Distancia del final para activar (en px)
 */
export const useInfiniteScroll = (
  onLoadMore,
  hasMore = false,
  isLoading = false,
  threshold = 300
) => {
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  const handleIntersection = useCallback(
    (entries) => {
      const [entry] = entries;
      
      // Si el elemento sentinel es visible y hay más datos y no está cargando
      if (entry.isIntersecting && hasMore && !isLoading) {
        onLoadMore();
      }
    },
    [hasMore, isLoading, onLoadMore]
  );

  useEffect(() => {
    const currentSentinel = sentinelRef.current;
    
    if (!currentSentinel) return;

    // Crear observer con threshold
    const options = {
      root: null, // viewport
      rootMargin: `${threshold}px`,
      threshold: 0.1
    };

    observerRef.current = new IntersectionObserver(handleIntersection, options);
    observerRef.current.observe(currentSentinel);

    // Cleanup
    return () => {
      if (observerRef.current && currentSentinel) {
        observerRef.current.unobserve(currentSentinel);
      }
    };
  }, [handleIntersection, threshold]);

  return sentinelRef;
};

/**
 * Hook alternativo usando scroll event (fallback)
 */
export const useInfiniteScrollLegacy = (
  onLoadMore,
  hasMore = false,
  isLoading = false,
  threshold = 300
) => {
  const containerRef = useRef(null);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || !hasMore || isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom < threshold) {
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore, threshold]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return containerRef;
};
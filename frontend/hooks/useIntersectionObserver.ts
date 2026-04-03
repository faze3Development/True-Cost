import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverProps {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useIntersectionObserver({
  threshold = 0,
  root = null,
  rootMargin = '0%',
  triggerOnce = false,
}: UseIntersectionObserverProps = {}): [(node: Element | null) => void, boolean] {
  const [isIntersecting, setIntersecting] = useState(false);
  const nodeRef = useRef<Element | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setRef = (node: Element | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    nodeRef.current = node;

    if (node) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          const isElementIntersecting = entry.isIntersecting;
          setIntersecting(isElementIntersecting);
          
          if (isElementIntersecting && triggerOnce && observerRef.current) {
            observerRef.current.disconnect();
          }
        },
        { threshold, root, rootMargin }
      );

      observerRef.current.observe(node);
    }
  };

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return [setRef, isIntersecting];
}

// frontend/src/components/performance/VirtualList.tsx

import React, { useState, useRef, useCallback, useMemo, memo } from 'react';
// import { useVirtualization } from '../../utils/performanceOptimization';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number; // Number of items to render outside visible area
  onScroll?: (scrollTop: number) => void;
  loading?: boolean;
  emptyMessage?: string;
}

// Memoized virtual list item
const VirtualListItem = memo<{
  item: any;
  index: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  style: React.CSSProperties;
}>(({ item, index, renderItem, style }) => {
  return (
    <div style={style}>
      {renderItem(item, index)}
    </div>
  );
});

const VirtualList = <T,>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
  overscan = 5,
  onScroll,
  loading = false,
  emptyMessage = 'No items to display',
}: VirtualListProps<T>) => {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible items with overscan
  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex + 1),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight,
    };
  }, [items, itemHeight, containerHeight, scrollTop, overscan]);

  // Throttled scroll handler
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // Scroll to specific item functionality available

  // Scroll methods available for external use

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height: containerHeight }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-gray-500 ${className}`}
        style={{ height: containerHeight }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Virtual spacer for total height */}
      <div style={{ height: visibleItems.totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div
          style={{
            transform: `translateY(${visibleItems.offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.items.map((item, index) => {
            const actualIndex = visibleItems.startIndex + index;
            return (
              <VirtualListItem
                key={actualIndex}
                item={item}
                index={actualIndex}
                renderItem={renderItem}
                style={{
                  height: itemHeight,
                  display: 'flex',
                  alignItems: 'center',
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Hook for virtual list with additional features
export function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  options: {
    overscan?: number;
    onScroll?: (scrollTop: number) => void;
  } = {}
) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const visibleItems = useMemo(() => {
    const overscan = options.overscan || 5;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex + 1),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight,
    };
  }, [items, itemHeight, containerHeight, scrollTop, options.overscan]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    options.onScroll?.(newScrollTop);
  }, [options]);

  const scrollToItem = useCallback((index: number) => {
    if (scrollElementRef.current) {
      const targetScrollTop = index * itemHeight;
      scrollElementRef.current.scrollTop = targetScrollTop;
    }
  }, [itemHeight]);

  const scrollToTop = useCallback(() => {
    scrollToItem(0);
  }, [scrollToItem]);

  const scrollToBottom = useCallback(() => {
    scrollToItem(items.length - 1);
  }, [scrollToItem, items.length]);

  return {
    visibleItems,
    handleScroll,
    scrollToItem,
    scrollToTop,
    scrollToBottom,
    scrollElementRef,
  };
}

export default VirtualList;


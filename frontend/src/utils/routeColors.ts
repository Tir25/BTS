/**
 * Utility functions for route color management
 * Centralizes route color generation logic to avoid duplication
 */

// Predefined route colors for consistent assignment
export const ROUTE_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#6366f1', // Indigo
] as const;

/**
 * Get a consistent color for a route based on its ID
 * Uses a hash function to ensure the same route always gets the same color
 * 
 * @param routeId - The unique identifier for the route
 * @param index - Optional index parameter (for backward compatibility, not used in calculation)
 * @returns A hex color string from the predefined color palette
 */
export function getRouteColor(routeId: string, index: number = 0): string {
  // Use route ID hash for consistent color assignment
  // Note: index is accepted for backward compatibility but not used in calculation
  // to ensure the same route always gets the same color regardless of position
  const hash = routeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ROUTE_COLORS[hash % ROUTE_COLORS.length];
}

/**
 * Get route color by route value (alias for getRouteColor)
 * Useful for route options that use 'value' instead of 'id'
 * 
 * @param routeValue - The route value/ID
 * @returns A hex color string from the predefined color palette
 */
export function getRouteColorByValue(routeValue: string): string {
  return getRouteColor(routeValue, 0);
}


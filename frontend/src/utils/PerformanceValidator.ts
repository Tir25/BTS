/**
 * Frontend Performance Validator
 * Validates and monitors frontend performance metrics
 */

import { logger } from './logger';

export interface PerformanceValidationResult {
  isValid: boolean;
  score: number;
  issues: PerformanceIssue[];
  recommendations: string[];
}

export interface PerformanceIssue {
  type: 'slow-render' | 'memory-leak' | 'excessive-renders' | 'large-bundle' | 'slow-api';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestion: string;
}

export interface PerformanceThresholds {
  maxRenderTime: number;
  maxMemoryUsage: number;
  maxRenderCount: number;
  maxBundleSize: number;
  maxApiResponseTime: number;
}

class PerformanceValidator {
  private static instance: PerformanceValidator;
  private thresholds: PerformanceThresholds;

  private constructor() {
    this.thresholds = {
      maxRenderTime: 16, // 60fps
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      maxRenderCount: 50,
      maxBundleSize: 2 * 1024 * 1024, // 2MB
      maxApiResponseTime: 2000, // 2 seconds
    };
  }

  static getInstance(): PerformanceValidator {
    if (!PerformanceValidator.instance) {
      PerformanceValidator.instance = new PerformanceValidator();
    }
    return PerformanceValidator.instance;
  }

  /**
   * Validate component performance
   */
  validateComponentPerformance(
    componentName: string,
    metrics: {
      renderCount: number;
      averageRenderTime: number;
      memoryUsage: number;
    }
  ): PerformanceValidationResult {
    const issues: PerformanceIssue[] = [];
    let score = 100;

    // Check render time
    if (metrics.averageRenderTime > this.thresholds.maxRenderTime) {
      issues.push({
        type: 'slow-render',
        severity: metrics.averageRenderTime > 50 ? 'high' : 'medium',
        message: `Component ${componentName} has slow render time: ${metrics.averageRenderTime}ms`,
        suggestion: 'Consider using React.memo() or optimizing component logic',
      });
      score -= 20;
    }

    // Check render count
    if (metrics.renderCount > this.thresholds.maxRenderCount) {
      issues.push({
        type: 'excessive-renders',
        severity: metrics.renderCount > 100 ? 'high' : 'medium',
        message: `Component ${componentName} has excessive renders: ${metrics.renderCount}`,
        suggestion: 'Check for unnecessary state updates or missing dependencies in useEffect',
      });
      score -= 15;
    }

    // Check memory usage
    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      issues.push({
        type: 'memory-leak',
        severity: 'high',
        message: `Component ${componentName} has high memory usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
        suggestion: 'Check for memory leaks, clear intervals/timeouts, and optimize data structures',
      });
      score -= 25;
    }

    return {
      isValid: issues.length === 0,
      score: Math.max(0, score),
      issues,
      recommendations: this.generateRecommendations(issues),
    };
  }

  /**
   * Validate API performance
   */
  validateApiPerformance(
    endpoint: string,
    responseTime: number,
    success: boolean
  ): PerformanceValidationResult {
    const issues: PerformanceIssue[] = [];
    let score = 100;

    if (responseTime > this.thresholds.maxApiResponseTime) {
      issues.push({
        type: 'slow-api',
        severity: responseTime > 5000 ? 'high' : 'medium',
        message: `API endpoint ${endpoint} is slow: ${responseTime}ms`,
        suggestion: 'Consider implementing caching or optimizing backend queries',
      });
      score -= 20;
    }

    if (!success) {
      issues.push({
        type: 'slow-api',
        severity: 'medium',
        message: `API endpoint ${endpoint} failed`,
        suggestion: 'Check error handling and implement retry logic',
      });
      score -= 15;
    }

    return {
      isValid: issues.length === 0,
      score: Math.max(0, score),
      issues,
      recommendations: this.generateRecommendations(issues),
    };
  }

  /**
   * Validate bundle size
   */
  validateBundleSize(bundleSize: number): PerformanceValidationResult {
    const issues: PerformanceIssue[] = [];
    let score = 100;

    if (bundleSize > this.thresholds.maxBundleSize) {
      issues.push({
        type: 'large-bundle',
        severity: bundleSize > 5 * 1024 * 1024 ? 'high' : 'medium',
        message: `Bundle size is large: ${(bundleSize / 1024 / 1024).toFixed(2)}MB`,
        suggestion: 'Consider code splitting, tree shaking, or removing unused dependencies',
      });
      score -= 30;
    }

    return {
      isValid: issues.length === 0,
      score: Math.max(0, score),
      issues,
      recommendations: this.generateRecommendations(issues),
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(issues: PerformanceIssue[]): string[] {
    const recommendations: string[] = [];

    if (issues.some(issue => issue.type === 'slow-render')) {
      recommendations.push('Use React.memo() for components that don\'t need frequent re-renders');
      recommendations.push('Optimize expensive calculations with useMemo()');
      recommendations.push('Consider using useCallback() for event handlers');
    }

    if (issues.some(issue => issue.type === 'excessive-renders')) {
      recommendations.push('Review useEffect dependencies to prevent unnecessary re-renders');
      recommendations.push('Use React.memo() to prevent re-renders when props haven\'t changed');
      recommendations.push('Consider splitting large components into smaller ones');
    }

    if (issues.some(issue => issue.type === 'memory-leak')) {
      recommendations.push('Clean up event listeners in useEffect cleanup');
      recommendations.push('Clear intervals and timeouts in useEffect cleanup');
      recommendations.push('Avoid creating objects in render methods');
    }

    if (issues.some(issue => issue.type === 'slow-api')) {
      recommendations.push('Implement request caching for frequently accessed data');
      recommendations.push('Use React Query or SWR for data fetching and caching');
      recommendations.push('Consider implementing optimistic updates');
    }

    if (issues.some(issue => issue.type === 'large-bundle')) {
      recommendations.push('Implement code splitting with React.lazy()');
      recommendations.push('Remove unused dependencies and imports');
      recommendations.push('Use dynamic imports for large libraries');
    }

    return recommendations;
  }

  /**
   * Get performance score for the entire application
   */
  getOverallPerformanceScore(metrics: {
    components: Array<{ name: string; score: number }>;
    apis: Array<{ endpoint: string; score: number }>;
    bundleSize: number;
  }): number {
    const componentScore = metrics.components.reduce((sum, comp) => sum + comp.score, 0) / metrics.components.length;
    const apiScore = metrics.apis.reduce((sum, api) => sum + api.score, 0) / metrics.apis.length;
    const bundleScore = this.validateBundleSize(metrics.bundleSize).score;

    return Math.round((componentScore + apiScore + bundleScore) / 3);
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    logger.info('Performance thresholds updated', 'performance-validator', { thresholds: this.thresholds });
  }

  /**
   * Get current thresholds
   */
  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }
}

// Export singleton instance
export const performanceValidator = PerformanceValidator.getInstance();

// Export convenience functions
export const validateComponentPerformance = (componentName: string, metrics: any) =>
  performanceValidator.validateComponentPerformance(componentName, metrics);

export const validateApiPerformance = (endpoint: string, responseTime: number, success: boolean) =>
  performanceValidator.validateApiPerformance(endpoint, responseTime, success);

export const validateBundleSize = (bundleSize: number) =>
  performanceValidator.validateBundleSize(bundleSize);

/**
 * Performance monitoring utilities for Konsinyasi
 * Tracks request metrics, error rates, and response times
 */

interface MetricEntry {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: number;
}

interface RequestMetrics {
  path: string;
  method: string;
  status: number;
  duration: number;
  timestamp: number;
}

// In-memory metrics buffer (will be lost on Worker restart)
const metricsBuffer: MetricEntry[] = [];
const requestMetrics: RequestMetrics[] = [];

const MAX_BUFFER_SIZE = 1000;
const MAX_REQUEST_METRICS = 5000;

/**
 * Track a custom metric
 */
export function trackMetric(
  name: string,
  value: number,
  tags?: Record<string, string>
): void {
  metricsBuffer.push({
    name,
    value,
    tags,
    timestamp: Date.now(),
  });
  
  // Prevent memory leak
  if (metricsBuffer.length > MAX_BUFFER_SIZE) {
    metricsBuffer.shift();
  }
}

/**
 * Track request metrics
 */
export function trackRequest(
  path: string,
  method: string,
  status: number,
  duration: number
): void {
  requestMetrics.push({
    path,
    method,
    status,
    duration,
    timestamp: Date.now(),
  });
  
  // Prevent memory leak
  if (requestMetrics.length > MAX_REQUEST_METRICS) {
    requestMetrics.shift();
  }
  
  // Track error rate
  if (status >= 400) {
    trackMetric('http_errors', 1, {
      path,
      method,
      status: status.toString(),
    });
  }
  
  // Track slow requests (> 1 second)
  if (duration > 1000) {
    trackMetric('slow_requests', 1, {
      path,
      method,
      duration: duration.toString(),
    });
  }
}

/**
 * Get metrics summary for monitoring
 */
export function getMetricsSummary(): {
  totalRequests: number;
  errorRate: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  slowRequests: number;
  recentErrors: Array<{ path: string; status: number; count: number }>;
} {
  const now = Date.now();
  const last5Minutes = now - 5 * 60 * 1000;
  
  // Filter recent metrics
  const recentRequests = requestMetrics.filter(m => m.timestamp > last5Minutes);
  
  if (recentRequests.length === 0) {
    return {
      totalRequests: 0,
      errorRate: 0,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      slowRequests: 0,
      recentErrors: [],
    };
  }
  
  // Calculate metrics
  const errors = recentRequests.filter(m => m.status >= 400);
  const durations = recentRequests.map(m => m.duration).sort((a, b) => a - b);
  const p95Index = Math.floor(durations.length * 0.95);
  
  // Count errors by path
  const errorsByPath = new Map<string, { status: number; count: number }>();
  errors.forEach(e => {
    const key = `${e.path}:${e.status}`;
    const existing = errorsByPath.get(key);
    if (existing) {
      existing.count++;
    } else {
      errorsByPath.set(key, { status: e.status, count: 1 });
    }
  });
  
  return {
    totalRequests: recentRequests.length,
    errorRate: (errors.length / recentRequests.length) * 100,
    avgResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
    p95ResponseTime: durations[p95Index] || 0,
    slowRequests: recentRequests.filter(m => m.duration > 1000).length,
    recentErrors: Array.from(errorsByPath.entries()).map(([path, data]) => ({
      path: path.split(':')[0],
      ...data,
    })),
  };
}

/**
 * Track visit submission metrics
 */
export function trackVisitSubmission(success: boolean, duration: number): void {
  trackMetric('visit_submission', 1, {
    success: success.toString(),
  });
  trackMetric('visit_submission_duration', duration, {
    success: success.toString(),
  });
}

/**
 * Track login attempt metrics
 */
export function trackLoginAttempt(success: boolean): void {
  trackMetric('login_attempt', 1, {
    success: success.toString(),
  });
}

/**
 * Track database query metrics
 */
export function trackDatabaseQuery(operation: string, duration: number): void {
  trackMetric('db_query_duration', duration, { operation });
}

/**
 * Clear old metrics (call periodically)
 */
export function cleanupMetrics(): void {
  const cutoff = Date.now() - 60 * 60 * 1000; // 1 hour
  
  while (metricsBuffer.length > 0 && metricsBuffer[0].timestamp < cutoff) {
    metricsBuffer.shift();
  }
  
  while (requestMetrics.length > 0 && requestMetrics[0].timestamp < cutoff) {
    requestMetrics.shift();
  }
}

// ----------------------------------------------------------------------
// 📋 CHANGELOG:
// ✅ Perubahan: Membuat memory-based rate limiter untuk endpoint login dan upload massal.
// ----------------------------------------------------------------------

const ipRequestMap = new Map<string, { count: number; lastReset: number }>();

export function checkRateLimit(ip: string, maxRequests = 10, windowMs = 60 * 1000): boolean {
  const now = Date.now();
  const record = ipRequestMap.get(ip);

  if (!record) {
    ipRequestMap.set(ip, { count: 1, lastReset: now });
    return true;
  }

  if (now - record.lastReset > windowMs) {
    ipRequestMap.set(ip, { count: 1, lastReset: now });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}
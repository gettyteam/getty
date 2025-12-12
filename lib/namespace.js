function resolveAdminNamespace(req) {
  try {
    let adminNs = req?.ns?.admin || null;
    if (!adminNs && req?.query && req.query.ns) {
      const hostedMode = !!process.env.REDIS_URL || process.env.GETTY_REQUIRE_SESSION === '1';
      if (!hostedMode) {
        const candidate = String(req.query.ns || '').trim();
        if (/^[A-Za-z0-9_-]{8,120}$/.test(candidate)) adminNs = candidate;
      }
    }
    if (
      !adminNs &&
      process.env.GETTY_MULTI_TENANT_WALLET === '1' &&
      req.walletSession &&
      req.walletSession.walletHash
    ) {
      adminNs = req.walletSession.walletHash;
    }
    return adminNs || null;
  } catch {
    return null;
  }
}

module.exports = { resolveAdminNamespace };

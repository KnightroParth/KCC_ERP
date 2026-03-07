import React from 'react';

/**
 * PageLoader — used as the Suspense fallback for lazy-loaded page chunks.
 *
 * Two modes:
 *  - default  : full-screen centred spinner (used at app boot in IdurarOs / ErpApp)
 *  - inline   : skeleton that fills the page content area (used in AppRouter Suspense)
 */
const PageLoader = ({ inline = false }) => {
  if (inline) {
    return (
      <div style={styles.inlineWrapper}>
        {/* Top bar shimmer */}
        <div style={{ ...styles.shimmer, height: 32, width: '30%', marginBottom: 24, borderRadius: 6 }} />

        {/* Three card-like skeleton blocks */}
        {[1, 2, 3].map((i) => (
          <div key={i} style={styles.card}>
            <div style={{ ...styles.shimmer, height: 16, width: '60%', marginBottom: 12, borderRadius: 4 }} />
            <div style={{ ...styles.shimmer, height: 12, width: '90%', marginBottom: 8, borderRadius: 4 }} />
            <div style={{ ...styles.shimmer, height: 12, width: '75%', borderRadius: 4 }} />
          </div>
        ))}

        <style>{`
          @keyframes kcc-shimmer {
            0%   { background-position: -600px 0; }
            100% { background-position:  600px 0; }
          }
        `}</style>
      </div>
    );
  }

  /* Full-screen centred spinner (boot / auth loading) */
  return (
    <div style={styles.fullScreenWrapper}>
      <div style={styles.spinRing} />
      <style>{`
        @keyframes kcc-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const shimmerBase = {
  background: 'linear-gradient(90deg, #ececec 25%, #f5f5f5 50%, #ececec 75%)',
  backgroundSize: '600px 100%',
  animation: 'kcc-shimmer 1.4s infinite linear',
};

const styles = {
  fullScreenWrapper: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0f2f5',
  },
  spinRing: {
    width: 42,
    height: 42,
    border: '4px solid rgba(34,7,94,0.15)',
    borderTopColor: '#22075e',
    borderRadius: '50%',
    animation: 'kcc-spin 0.75s linear infinite',
  },
  inlineWrapper: {
    padding: '8px 0',
    width: '100%',
  },
  card: {
    background: '#fff',
    border: '1px solid #f0f0f0',
    borderRadius: 6,
    padding: '20px 24px',
    marginBottom: 16,
  },
  shimmer: shimmerBase,
};

export default PageLoader;

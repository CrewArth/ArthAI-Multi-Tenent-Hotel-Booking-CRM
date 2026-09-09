import React from 'react';
import loadingSvg from '../assets/loading.svg';

const Loader = ({
  overlay = true,
  minHeight = '100vh',
  size = 56,
  style = {},
  className = '',
  text = '',
  backdrop = 'light', // 'light', 'dark', 'none', or custom rgba
}) => {
  if (overlay) {
    const bg =
      backdrop === 'dark'
        ? 'rgba(15, 23, 42, 0.45)'
        : backdrop === 'none'
        ? 'transparent'
        : 'rgba(255, 255, 255, 0.35)';

    return (
      <div
        className={`global-loader-overlay ${className}`.trim()}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          backgroundColor: bg,
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: 999999,
          pointerEvents: 'all',
          ...style,
        }}
      >
        <img
          src={loadingSvg}
          alt="Loading..."
          style={{
            width: typeof size === 'number' ? `${size}px` : size,
            height: typeof size === 'number' ? `${size}px` : size,
            display: 'block',
            filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.15))',
          }}
        />
        {text && (
          <span
            style={{
              fontSize: '0.875rem',
              color: '#0f172a',
              fontWeight: 600,
              background: 'rgba(255, 255, 255, 0.85)',
              padding: '4px 12px',
              borderRadius: '9999px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            }}
          >
            {text}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`global-loader-container ${className}`.trim()}
      style={{
        minHeight,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        background: 'transparent',
        ...style,
      }}
    >
      <img
        src={loadingSvg}
        alt="Loading..."
        style={{
          width: typeof size === 'number' ? `${size}px` : size,
          height: typeof size === 'number' ? `${size}px` : size,
          display: 'block',
          filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.15))',
        }}
      />
      {text && (
        <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
          {text}
        </span>
      )}
    </div>
  );
};

export { Loader, Loader as GlobalLoader };
export default Loader;

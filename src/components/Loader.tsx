
interface LoaderProps {
  size?: number;
  color?: string;
  text?: string;
  fullScreen?: boolean;
}

export default function Loader({ 
  size = 40, 
  color = 'var(--primary, #3b82f6)', 
  text = 'Loading...',
  fullScreen = false
}: LoaderProps) {
  const loaderContent = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
      <div 
        style={{
          width: size,
          height: size,
          border: `3px solid ${color}33`,
          borderTop: `3px solid ${color}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
      {text && <span style={{ color: 'var(--on-surface-variant, #64748b)', fontSize: '14px', fontWeight: 500 }}>{text}</span>}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );

  if (fullScreen) {
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
}

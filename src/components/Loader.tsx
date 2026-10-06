interface LoaderProps {
  size?: number;
  color?: string;
  text?: string;
  fullScreen?: boolean;
}

export default function Loader({ 
  text = 'Loading...',
  fullScreen = false
}: LoaderProps) {
  const loaderContent = (
    <div className="crm-loader-wrapper">
      <div className="crm-loader-spinner" />
      {text && <span className="crm-loader-text">{text}</span>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="crm-loader-fullscreen">
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
}

import React from 'react';
import { 
  InformationCircleIcon,
  QuestionMarkCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const Tooltip = ({ 
  children, 
  content, 
  position = 'top',
  size = 'sm',
  variant = 'dark',
  disabled = false 
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [timeoutId, setTimeoutId] = React.useState(null);

  const handleMouseEnter = () => {
    if (disabled) return;
    
    const id = setTimeout(() => {
      setIsVisible(true);
    }, 500); // Delay before showing
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setIsVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  };

  const sizeClasses = {
    xs: 'px-2 py-1 text-xs max-w-xs',
    sm: 'px-3 py-2 text-sm max-w-sm',
    md: 'px-4 py-3 text-base max-w-md',
    lg: 'px-5 py-4 text-lg max-w-lg',
  };

  const variantClasses = {
    dark: 'bg-gray-900 text-white border-gray-700',
    light: 'bg-white text-gray-900 border-gray-200 shadow-lg',
    info: 'bg-blue-600 text-white border-blue-500',
    success: 'bg-green-600 text-white border-green-500',
    warning: 'bg-yellow-600 text-white border-yellow-500',
    error: 'bg-red-600 text-white border-red-500',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-0',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-0',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-0',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-0',
  };

  const arrowColors = {
    dark: 'border-gray-900',
    light: 'border-white',
    info: 'border-blue-600',
    success: 'border-green-600',
    warning: 'border-yellow-600',
    error: 'border-red-600',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {isVisible && (
        <div className={`
          absolute z-50 
          ${positionClasses[position]}
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          rounded-lg border
          font-medium
          whitespace-pre-wrap
          animate-in fade-in-0 zoom-in-95 duration-200
        `}>
          {content}
          
          {/* Arrow */}
          <div className={`
            absolute w-0 h-0
            border-4
            ${arrowClasses[position]}
            ${arrowColors[variant]}
          `} />
        </div>
      )}
    </div>
  );
};

// Predefined tooltip variants
export const InfoTooltip = ({ children, content, ...props }) => (
  <Tooltip content={content} variant="info" {...props}>
    <div className="inline-flex items-center">
      {children}
      <InformationCircleIcon className="h-4 w-4 ml-1 text-blue-500 hover:text-blue-700 cursor-help" />
    </div>
  </Tooltip>
);

export const HelpTooltip = ({ children, content, ...props }) => (
  <Tooltip content={content} variant="dark" {...props}>
    <div className="inline-flex items-center">
      {children}
      <QuestionMarkCircleIcon className="h-4 w-4 ml-1 text-gray-400 hover:text-gray-600 cursor-help" />
    </div>
  </Tooltip>
);

export const WarningTooltip = ({ children, content, ...props }) => (
  <Tooltip content={content} variant="warning" {...props}>
    <div className="inline-flex items-center">
      {children}
      <ExclamationTriangleIcon className="h-4 w-4 ml-1 text-yellow-500 hover:text-yellow-700 cursor-help" />
    </div>
  </Tooltip>
);

export const SuccessTooltip = ({ children, content, ...props }) => (
  <Tooltip content={content} variant="success" {...props}>
    <div className="inline-flex items-center">
      {children}
      <CheckCircleIcon className="h-4 w-4 ml-1 text-green-500 hover:text-green-700 cursor-help" />
    </div>
  </Tooltip>
);

export default Tooltip;
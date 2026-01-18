
import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  textColor?: string;
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ 
  className = "", 
  showText = true, 
  textColor = "text-[#2490D1]",
  size = 48
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 512 512" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Main Blue Cross Shape */}
        <path 
          d="M325.2 46.2C318.5 44 311.5 42.8 304.4 42.8H207.6C181.3 42.8 160 64.1 160 90.4V160H90.4C64.1 160 42.8 181.3 42.8 207.6V304.4C42.8 330.7 64.1 352 90.4 352H160V421.6C160 447.9 181.3 469.2 207.6 469.2H304.4C330.7 469.2 352 447.9 352 421.6V352H421.6C447.9 352 469.2 330.7 469.2 304.4V207.6C469.2 181.3 447.9 160 421.6 160H352V90.4C352 72.8 342.5 57.5 325.2 46.2Z" 
          stroke="#2490D1" 
          strokeWidth="38" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        
        {/* Upper Teal Leaf */}
        <path 
          d="M358.3 162.1C325.8 153.4 285.4 168.2 248.7 196.4C212 224.6 179 266.2 175.2 301.8C183.9 334.3 214.3 358.5 250.9 358.5C310.5 358.5 358.9 310.1 358.9 250.5C358.9 217.1 358.3 162.1 358.3 162.1Z" 
          fill="#5BC6B3"
        />
        
        {/* Lower Blue-Teal Leaf */}
        <path 
          d="M182.2 344.6C214.7 353.3 255.1 338.5 291.8 310.3C328.5 282.1 361.5 240.5 365.3 204.9C356.6 172.4 326.2 148.2 289.6 148.2C230 148.2 181.6 196.6 181.6 256.2C181.6 289.6 182.2 344.6 182.2 344.6Z" 
          fill="#2490D1"
        />
        
        {/* Leaf Intersection Curve (White Line) */}
        <path 
          d="M235 245C255 225 290 220 320 235" 
          stroke="white" 
          strokeWidth="8" 
          strokeLinecap="round" 
          opacity="0.2"
        />
      </svg>
      
      {showText && (
        <div className={`flex flex-col ${textColor}`}>
          <span className="text-xl font-bold leading-none tracking-tight">Health</span>
          <span className="text-xl font-bold leading-none tracking-tight">Companion</span>
        </div>
      )}
    </div>
  );
};

export default Logo;

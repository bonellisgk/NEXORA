
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
  textColor = "text-[#1D89CE]",
  size = 48
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Blue Cross Background Shape */}
        <path 
          d="M38 10C35 10 33 12 33 15V33H15C12 33 10 35 10 38V62C10 65 12 67 15 67H33V85C33 88 35 90 38 90H62C65 90 67 88 67 85V67H85C88 67 90 65 90 62V38C90 35 88 33 85 33H67V15C67 12 65 10 62 10H38Z" 
          stroke="#1D89CE" 
          strokeWidth="8" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        
        {/* Center Teal Leaves */}
        <path 
          d="M50 35C42 35 34 42 34 52C34 62 45 66 50 66C58 66 66 59 66 49C66 39 55 35 50 35Z" 
          fill="#57C9B6" 
          fillOpacity="0.85"
        />
        <path 
          d="M50 65C58 65 66 58 66 48C66 38 55 34 50 34C42 34 34 41 34 51C34 61 45 65 50 65Z" 
          fill="#57C9B6"
        />
        
        {/* Leaf Stem Detail */}
        <path 
          d="M36 53C36 53 42 45 50 45C58 45 64 53 64 53" 
          stroke="white" 
          strokeWidth="2" 
          strokeLinecap="round" 
          opacity="0.3"
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

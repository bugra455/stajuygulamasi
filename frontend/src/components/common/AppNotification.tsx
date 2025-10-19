import React, { useEffect } from "react";

interface AppNotificationProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

const AppNotification: React.FC<AppNotificationProps> = ({
  message,
  type,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const baseStyle =
    "fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white flex items-center z-50 transition-transform transform-gpu animate-slide-in";
  const typeStyle = {
    success: "bg-accent-green-600",
    error: "bg-primary-600",
  };

  const icon = {
    success: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 mr-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    error: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 mr-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  return (
    <div className={`${baseStyle} ${typeStyle[type]}`}>
      {icon[type]}
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-4 text-white font-bold opacity-70 hover:opacity-100"
      >
        &times;
      </button>
    </div>
  );
};

export default AppNotification;

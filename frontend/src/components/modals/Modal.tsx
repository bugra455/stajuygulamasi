import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm sm:max-w-md',
    md: 'max-w-md sm:max-w-lg',
    lg: 'max-w-lg sm:max-w-2xl',
    xl: 'max-w-xl sm:max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500/50 ">
      <div className="flex items-end sm:items-center justify-center min-h-screen p-2 sm:p-4 text-center">

        {/* Modal */}
        <div className={`inline-block w-full align-bottom bg-white rounded-t-xl sm:rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${sizeClasses[size]}`}>
          {/* Header */}
          <div className="bg-white px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-gray-200">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 break-words flex-1 leading-tight">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 -m-1 flex-shrink-0"
                aria-label={t("common.close")}
              >
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-3 sm:px-4 pb-4 sm:pb-6 pt-3 sm:pt-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;

import React, { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface DefterRedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sebep: string) => void;
  isLoading?: boolean;
}

const DefterRedModal: React.FC<DefterRedModalProps> = ({ isOpen, onClose, onConfirm, isLoading = false }) => {
  const { t } = useTranslation();
  const [sebep, setSebep] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (sebep.trim().length < 10) {
      setError(t("errors.minLengthReason"));
      return;
    }
    onConfirm(sebep.trim());
    setSebep('');
    setError('');
  };

  const handleClose = () => {
    setSebep('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-text-dark mb-4">{t("modals.defterDetay.rejectTitle")}</h2>
        <p className="text-text-light mb-4">
          {t("modals.defterDetay.confirmRejection")}
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-dark mb-2">
            {t("modals.redModal.reason")} *
          </label>
          <textarea
            value={sebep}
            onChange={(e) => setSebep(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
            rows={4}
            placeholder={t("modals.redModal.reasonPlaceholder")}
            disabled={isLoading}
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-400 transition"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || sebep.trim().length < 10}
            className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition"
          >
            {isLoading ? t("common.processing") : t("modals.redModal.reject")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DefterRedModal;
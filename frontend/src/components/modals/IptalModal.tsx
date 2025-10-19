import React, { useState } from "react";
import { useTranslation } from "../../hooks/useTranslation";

interface IptalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sebep: string) => void;
  isLoading: boolean;
}

const IptalModal: React.FC<IptalModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}) => {
  const [sebep, setSebep] = useState("");
  const [error, setError] = useState("");
  const { t } = useTranslation();

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (sebep.trim().length < 10) {
      setError(t("validation.minLength", { count: 10 }));
      return;
    }
    setError("");
    onConfirm(sebep);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 transition-opacity duration-300">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all scale-95 animate-fade-in-up">
        <h2 className="text-xl font-bold text-text-dark mb-4">
          {t("modals.iptalModal.confirmCancellation")}
        </h2>
        <p className="text-text-light mb-4">
          {t("modals.iptalModal.reason")}
        </p>
        <div>
          <label
            htmlFor="iptalSebebi"
            className="block text-sm font-medium text-text-dark mb-2"
          >
            {t("modals.iptalModal.reasonPlaceholder")}
          </label>
          <textarea
            id="iptalSebebi"
            value={sebep}
            onChange={(e) => setSebep(e.target.value)}
            className="w-full p-2 border border-background-300 rounded-md focus:ring-2 focus:ring-primary-500 transition-colors"
            rows={4}
            placeholder={t("modals.iptalModal.reasonPlaceholder")}
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || sebep.trim().length < 10}
            className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? t("common.loading") : t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IptalModal;

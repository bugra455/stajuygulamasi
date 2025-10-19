import React, { useState } from "react";
import SecureButton from "../security/SecureButton";
import { useTranslation } from "../../hooks/useTranslation";

interface RedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sebep: string) => void;
  isLoading?: boolean;
}

const RedModal: React.FC<RedModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [sebep, setSebep] = useState("");
  const { t } = useTranslation();
  const [, setError] = useState("");

  const handleConfirm = () => {
    if (sebep.trim().length < 10) {
      setError(t("errors.minLengthReason"));
      return;
    }
    onConfirm(sebep.trim());
    setSebep("");
    setError("");
  };

  const handleClose = () => {
    setSebep("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-text-dark mb-4">
          {t("modals.redModal.title")}
        </h2>
        <p className="text-text-light mb-4">{t("modals.redModal.confirmRejection")}</p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-dark mb-2">
            {t("modals.redModal.reason")} *
          </label>
          <textarea
            value={sebep}
            onChange={(e) => setSebep(e.target.value)}
            className="w-full p-3 border border-background-300 rounded-md focus:ring-2 focus:ring-primary-500"
            rows={3}
            placeholder={t("modals.redModal.reasonPlaceholder")}
            disabled={isLoading}
            required
          />
        </div>
        <div className="flex justify-end space-x-3">
          <SecureButton
            onClick={handleClose}
            loadingState={isLoading}
            className="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-400 transition"
          >
            {t("common.cancel")}
          </SecureButton>
          <SecureButton
            onClick={handleConfirm}
            loadingState={isLoading}
            className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-700 transition"
          >
            {t("modals.redModal.reject")}
          </SecureButton>
        </div>
      </div>
    </div>
  );
};

export default RedModal;

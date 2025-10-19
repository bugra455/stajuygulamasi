import React, { useState } from "react";
import SecureButton from "../security/SecureButton";
import { useTranslation } from "../../hooks/useTranslation";

interface OnayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (aciklama?: string) => void;
  isLoading?: boolean;
}

const OnayModal: React.FC<OnayModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [aciklama, setAciklama] = useState("");
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm(aciklama.trim() || undefined);
    setAciklama("");
  };

  const handleClose = () => {
    setAciklama("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-text-dark mb-4">
          {t("modals.onayModal.title")}
        </h2>
        <p className="text-text-light mb-4">{t("modals.onayModal.confirmApproval")}</p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-dark mb-2">
            {t("modals.onayModal.note")}
          </label>
          <textarea
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            className="w-full p-3 border border-background-300 rounded-md focus:ring-2 focus:ring-primary-500"
            rows={3}
            placeholder={t("modals.onayModal.notePlaceholder")}
            disabled={isLoading}
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
            requiredRoles={["DANISMAN"]}
            loadingState={isLoading}
            className="bg-accent-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-accent-green-700 transition"
          >
            {t("modals.onayModal.approve")}
          </SecureButton>
        </div>
      </div>
    </div>
  );
};

export default OnayModal;

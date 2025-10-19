import React, { useState } from 'react';
import Modal from './Modal';
import { useTranslation } from '../../hooks/useTranslation';

interface DefterOnayModalProps {
  isOpen: boolean;
  onClose: () => void;
  defterId: number;
  actionType: 'ONAYLANDI' | 'REDDEDILDI';
  onConfirm: (defterId: number, actionType: 'ONAYLANDI' | 'REDDEDILDI', aciklama?: string) => void;
}

const DefterOnayModal: React.FC<DefterOnayModalProps> = ({
  isOpen,
  onClose,
  defterId,
  actionType,
  onConfirm
}) => {
  const { t } = useTranslation();
  const [aciklama, setAciklama] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onConfirm(defterId, actionType, aciklama);
      setAciklama('');
      onClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAciklama('');
    onClose();
  };

  const isApproval = actionType === 'ONAYLANDI';

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={isApproval ? t("modals.defterDetay.approveTitle") : t("modals.defterDetay.rejectTitle")}
      size="md"
    >
      <div className="space-y-4">
        <div className="text-gray-700">
          {isApproval 
            ? t("modals.defterDetay.confirmApproval")
            : t("modals.defterDetay.confirmRejection")
          }
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isApproval ? t("modals.onayModal.noteOptional") : t("modals.redModal.reason")}
            {!isApproval && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder={isApproval 
              ? t("modals.onayModal.notePlaceholder")
              : t("modals.redModal.reasonPlaceholder")
            }
            required={!isApproval}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (!isApproval && !aciklama.trim())}
            className={`px-4 py-2 text-white rounded-md disabled:opacity-50 ${
              isApproval 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading ? t("common.processing") : (isApproval ? t("common.approve") : t("common.reject"))}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DefterOnayModal;

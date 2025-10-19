import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import { api } from '../../lib/api';
import { useTranslation } from '../../hooks/useTranslation';

interface BasvuruDetay {
  id: number;
  kurumAdi: string;
  stajTipi: string;
  baslangicTarihi: string;
  bitisTarihi: string;
  onayDurumu: string;
  ogrenci: {
    id: number;
    name: string;
    email: string;
    studentId: string;
  };
  danismanAciklama?: string;
  danismanOnayDurumu?: number;
  kariyerMerkeziAciklama?: string;
  kariyerMerkeziOnayDurumu?: number;
}

interface KariyerMerkeziOnayModalProps {
  isOpen: boolean;
  onClose: () => void;
  basvuruId: number;
  actionType: 'ONAYLANDI' | 'REDDEDILDI';
  onConfirm: (basvuruId: number, actionType: 'ONAYLANDI' | 'REDDEDILDI', aciklama?: string) => void;
}

const KariyerMerkeziOnayModal: React.FC<KariyerMerkeziOnayModalProps> = ({
  isOpen,
  onClose,
  basvuruId,
  actionType,
  onConfirm
}) => {
  const { t } = useTranslation();
  const [aciklama, setAciklama] = useState('');
  const [loading, setLoading] = useState(false);
  const [basvuru, setBasvuru] = useState<BasvuruDetay | null>(null);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  const fetchBasvuruDetails = useCallback(async () => {
    setFetchingDetails(true);
    try {
      const response = await api.getKariyerBasvuru(basvuruId);
      setBasvuru(response);
    } catch (error: unknown) {
      console.error(t("errors.applicationLoadError"), error);
    } finally {
      setFetchingDetails(false);
    }
  }, [basvuruId, t]);

  useEffect(() => {
    if (isOpen && basvuruId) {
      fetchBasvuruDetails();
    }
  }, [isOpen, basvuruId, fetchBasvuruDetails]);  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onConfirm(basvuruId, actionType, aciklama);
      setAciklama('');
      onClose();
    } catch (error: unknown) {
      console.error(t("errors.operationError"), error);
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
      title={`${t("modals.onayModal.applicationTitle")} ${isApproval ? t("modals.onayModal.approve") : t("modals.redModal.reject")}`}
      size="lg"
    >
      <div className="space-y-6">
        {fetchingDetails ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">{t("modals.onayModal.loadingDetails")}</p>
          </div>
        ) : basvuru ? (
          <>
            {/* Onay/Red Sorusu */}
            <div className="text-gray-700">
              {isApproval 
                ? t("modals.onayModal.confirmApproval")
                : t("modals.redModal.confirmRejection")
              }
            </div>

            {/* Açıklama Alanı */}
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
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-red-500">{t("errors.applicationLoadError")}</p>
          </div>
        )}

        {/* Buttons */}
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
            disabled={loading || (!isApproval && !aciklama.trim()) || fetchingDetails || !basvuru}
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

export default KariyerMerkeziOnayModal;

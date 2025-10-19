import React, { useState, useEffect, useCallback } from "react";
import Modal from "./Modal";
import { api } from "../../lib/api";
import { useTranslation } from "../../hooks/useTranslation";

interface DanismanDetayModalProps {
  isOpen: boolean;
  onClose: () => void;
  danismanId: number | null;
}

interface DanismanDetay {
  id: number;
  name: string;
  email: string;
  tcKimlik: string;
  createdAt: string;
  onayladiBasvuruSayisi: number;
  reddettiBasvuruSayisi: number;
  toplamIncelediBasvuru: number;
}

const DanismanDetayModal: React.FC<DanismanDetayModalProps> = ({
  isOpen,
  onClose,
  danismanId,
}) => {
  const { t } = useTranslation();
  const [danisman, setDanisman] = useState<DanismanDetay | null>(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<DanismanDetay>>({});

  useEffect(() => {
    if (isOpen && danismanId) {
      fetchDanismanDetay();
    }
  }, [isOpen, danismanId]);

  const fetchDanismanDetay = useCallback(async () => {
    if (!danismanId) return;

    setLoading(true);
    try {
      const result = await api.getKariyerDanismanDetay(danismanId);
      setDanisman(result.success ? result.data : result);
      setEditData(result.success ? result.data : result);
    } catch (error: unknown) {
      console.error("Error fetching advisor details:", error);
    } finally {
      setLoading(false);
    }
  }, [danismanId]);

  useEffect(() => {
    if (danismanId && isOpen) {
      fetchDanismanDetay();
    }
  }, [danismanId, isOpen, fetchDanismanDetay]);


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  if (loading) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t("modals.danismanDetay.title")}
        size="lg"
      >
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Modal>
    );
  }

  if (!danisman) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${danisman.name} - ${t("modals.danismanDetay.fullName")}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Kişisel Bilgiler */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-medium">{t("modals.danismanDetay.personalInfo")}</h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("modals.danismanDetay.fullName")}
              </label>
              {editMode ? (
                <input
                  type="text"
                  value={editData.name || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, name: e.target.value })
                  }
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{danisman.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("modals.danismanDetay.email")}
              </label>
              {editMode ? (
                <input
                  type="email"
                  value={editData.email || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, email: e.target.value })
                  }
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{danisman.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("modals.danismanDetay.tcId")}
              </label>
              {editMode ? (
                <input
                  type="text"
                  value={editData.tcKimlik || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, tcKimlik: e.target.value })
                  }
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">
                  {danisman.tcKimlik}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("modals.danismanDetay.registrationDate")}
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {formatDate(danisman.createdAt)}
              </p>
            </div>
          </div>
        </div>



        {editMode && (
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <button
              onClick={() => {
                setEditMode(false);
                setEditData(danisman);
              }}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {t("common.cancel")}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DanismanDetayModal;

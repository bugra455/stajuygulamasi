import React from 'react';
import type { BaseBasvuru } from '../../types/common';
import { getStatusColor, formatDate, getStajTipiLabel } from '../../utils/helpers';
import { useTranslation } from "../../hooks/useTranslation";

interface ApplicationListProps {
  basvurular: BaseBasvuru[];
}
  
const ApplicationList: React.FC<ApplicationListProps> = ({ basvurular }) => {
  const { t, getStatusLabel } = useTranslation();

  const getStatusText = (app: BaseBasvuru) => {
    if (app.onayDurumu === 'ONAYLANDI') {
      const now = new Date();
      const baslangicTarihi = new Date(app.baslangicTarihi);
      
      if (now < baslangicTarihi) {
        return t("pages.dashboard.statusWaitingStart");
      }
      return t("pages.dashboard.statusApproved");
    }
    
    return getStatusLabel(app.onayDurumu);
  };

  if (basvurular.length === 0) {
    return (
      <div className="text-center py-8 text-text-light">
        <p>{t("pages.dashboard.noApplications")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {basvurular.map((app) => (
        <div
          key={app.id}
          className="bg-white p-6 rounded-lg shadow-md border border-background-200"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-text-dark">
                {app.kurumAdi}
              </h3>
              <p className="text-md text-text-light">
                {getStajTipiLabel(app.stajTipi) || t("application.internshipTypeNotSpecified")}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(app.onayDurumu)}`}>
              {getStatusText(app)}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-md">
            <div>
              <span className="font-medium text-text-dark">{t("application.startDate")}:</span>
              <span className="ml-2 text-text-light">
                {formatDate(app.baslangicTarihi)}
              </span>
            </div>
            <div>
              <span className="font-medium text-text-dark">{t("application.endDate")}:</span>
              <span className="ml-2 text-text-light">
                {formatDate(app.bitisTarihi)}
              </span>
            </div>
            <div>
              <span className="font-medium text-text-dark">{t("application.applicationDate")}:</span>
              <span className="ml-2 text-text-light">
                {formatDate(app.createdAt)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ApplicationList;

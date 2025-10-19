import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { showNotification } from '../components/ui/notificationApi';
import { useWebSocketNotifications, setGlobalNotificationHandler } from '../hooks/useWebSocketNotifications';

interface UploadProgress {
  isUploading: boolean;
  stage: 'uploading' | 'processing' | 'completed' | 'error';
  percentage: number;
  message: string;
  dosyaId?: number;
  totalRows?: number;
  processedRows?: number;
  successfulRows?: number;
  errorRows?: number;
}

const CapGuncelle: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    isUploading: false,
    stage: 'uploading',
    percentage: 0,
    message: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // WebSocket notifications
  const { lastNotification, cancelCurrentUpload } = useWebSocketNotifications();

  // Set up global notification handler
  useEffect(() => {
    setGlobalNotificationHandler((message, type, duration) => {
      showNotification({ message, type, duration });
    });
  }, []);

  // Handle WebSocket notifications
  useEffect(() => {
    if (lastNotification) {
      console.log('📡 [CAP Upload] Received notification:', lastNotification);
      
      const { type, data, message } = lastNotification;
      
      if (type === 'progress_update') {
        setUploadProgress(prev => ({
          ...prev,
          percentage: data?.percentage || 0,
          message: message,
          totalRows: data?.totalRows,
          processedRows: data?.totalRows ? Math.floor((data?.totalRows * (data?.percentage || 0)) / 100) : undefined
        }));
      } else if (type === 'excel_upload_complete') {
        setUploadProgress(prev => ({
          ...prev,
          isUploading: false,
          stage: 'completed',
          percentage: 100,
          message: 'CAP öğrenci Excel dosyası başarıyla işlendi',
          successfulRows: data?.successfulRows,
          errorRows: data?.errorRows
        }));
        
        showNotification({ message: 'CAP öğrenci Excel dosyası başarıyla işlendi', type: 'success' });
        resetForm();
      } else if (type === 'excel_upload_failed') {
        setUploadProgress(prev => ({
          ...prev,
          isUploading: false,
          stage: 'error',
          message: message
        }));
        
        showNotification({ message: `İşlem başarısız: ${message}`, type: 'error' });
      } else if (type === 'upload_cancelled') {
        setUploadProgress(prev => ({
          ...prev,
          isUploading: false,
          stage: 'error',
          message: 'Yükleme iptal edildi'
        }));
        
        showNotification({ message: 'Yükleme iptal edildi', type: 'info' });
        resetForm();
      }
    }
  }, [lastNotification]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Dosya formatı kontrolü
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        showNotification({ message: 'Sadece Excel dosyaları (.xlsx, .xls) kabul edilir', type: 'error' });
        return;
      }

      // Dosya boyutu kontrolü (50MB)
      if (file.size > 50 * 1024 * 1024) {
        showNotification({ message: 'Dosya boyutu 50MB\'dan küçük olmalıdır', type: 'error' });
        return;
      }

      setSelectedFile(file);
      setUploadProgress({
        isUploading: false,
        stage: 'uploading',
        percentage: 0,
        message: ''
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showNotification({ message: 'Lütfen bir Excel dosyası seçin', type: 'error' });
      return;
    }

    setUploadProgress({
      isUploading: true,
      stage: 'uploading',
      percentage: 0,
      message: 'Dosya yükleniyor...'
    });

    try {
      const result = await api.uploadCapOgrenciExcel(selectedFile);
      
      if (result.success) {
        setUploadProgress(prev => ({
          ...prev,
          stage: 'processing',
          message: 'CAP öğrenci verileri işleniyor...'
        }));
        showNotification({ message: 'CAP öğrenci Excel dosyası yükleme işlemi başlatıldı', type: 'success' });
      } else {
        throw new Error(result.message || 'Yükleme başarısız');
      }
    } catch (error: unknown) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Dosya yüklenirken bir hata oluştu';
      showNotification({ message: errorMessage, type: 'error' });
      setUploadProgress({
        isUploading: false,
        stage: 'error',
        percentage: 0,
        message: errorMessage
      });
    }
  };

  const handleCancel = () => {
    if (uploadProgress.isUploading) {
      cancelCurrentUpload();
      showNotification({ message: 'Yükleme iptal ediliyor...', type: 'info' });
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setUploadProgress({
      isUploading: false,
      stage: 'uploading',
      percentage: 0,
      message: ''
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">CAP Öğrenci Güncelle</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Geri Dön
            </button>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Excel Formatı:</strong> CAP öğrenci bilgileri için Excel dosyanızın şu sütunlara sahip olması gerekmektedir:
                </p>
                <ul className="mt-2 text-sm text-blue-700 list-disc list-inside">
                  <li><strong>D Sütunu:</strong> Öğrenci Numarası (studentId, kullaniciAdi, parola olarak kullanılacak)</li>
                  <li><strong>E + F Sütunları:</strong> Ad Soyad (birleştirilerek tam isim oluşturulacak)</li>
                  <li><strong>G Sütunu:</strong> Sınıf</li>
                  <li><strong>O Sütunu:</strong> Fakülte (CAP-YAP OGRENCISI olarak atanacak)</li>
                  <li><strong>P Sütunu:</strong> Bölüm (CAP-YAP olarak atanacak)</li>
                  <li><strong>Q Sütunu:</strong> CAP-YAP Bölümü</li>
                  <li><strong>T Sütunu:</strong> Danışman</li>
                </ul>
                <p className="mt-2 text-sm text-blue-700">
                  E-posta adresi otomatik olarak: öğrenci_numarası@std.uni.edu.tr formatında oluşturulacaktır.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                CAP Öğrenci Excel Dosyası Seçin
              </label>
              <input
                ref={fileInputRef}
                type="file"
                id="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={uploadProgress.isUploading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Seçilen dosya: <span className="font-medium">{selectedFile.name}</span>
                  {" "}({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {uploadProgress.isUploading && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900">İşlem Durumu</h3>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    İptal Et
                  </button>
                </div>
                
                {uploadProgress.percentage !== undefined && (
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>İlerleme</span>
                      <span>{uploadProgress.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${uploadProgress.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {uploadProgress.message && (
                  <p className="text-sm text-gray-700">
                    <strong>Durum:</strong> {uploadProgress.message}
                  </p>
                )}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploadProgress.isUploading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {uploadProgress.isUploading ? 'İşleniyor...' : 'CAP Öğrenci Excel Dosyasını Yükle'}
              </button>
              
              {!uploadProgress.isUploading && (
                <button
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Temizle
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CapGuncelle;

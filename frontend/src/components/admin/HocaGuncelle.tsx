import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useWebSocketNotifications, setGlobalNotificationHandler } from '../../hooks/useWebSocketNotifications';
import { showNotification } from '../ui/notificationApi';

interface UploadResult {
  success: boolean;
  message: string;
  data?: {
    dosyaId: number;
    totalRows: number;
    processedRows: number;
    successfulRows: number;
    errorRows: number;
    errors: string[];
  };
}

interface UploadProgress {
  isUploading: boolean;
  stage: 'uploading' | 'processing' | 'completed' | 'error';
  percentage: number;
  message: string;
  dosyaId?: number;
  totalRows?: number;
  successfulRows?: number;
  errorRows?: number;
}

const HocaGuncelle: React.FC = () => {
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    isUploading: false,
    stage: 'uploading',
    percentage: 0,
    message: ''
  });

  // WebSocket notifications
  const { lastNotification, cancelCurrentUpload } = useWebSocketNotifications();

  // Set up global notification handler
  useEffect(() => {
    setGlobalNotificationHandler((message, type, duration) => {
      showNotification({ message, type, duration });
    });
  }, []);

  // WebSocket notification handling
  useEffect(() => {
    if (lastNotification) {
      console.log('📬 WebSocket notification:', lastNotification);
      
      // Handle progress updates from backend (every 1000 rows)
      if (lastNotification.data?.percentage !== undefined && lastNotification.type === 'progress_update') {
        const percentage = lastNotification.data.percentage;
        console.log(`📊 Real progress update: ${percentage}%`);
        
        setUploadProgress(prev => ({
          ...prev,
          isUploading: true,
          stage: 'processing',
          percentage: percentage, // Use exact percentage from backend
          message: `İşleniyor... ${percentage}% tamamlandı`,
          dosyaId: lastNotification.dosyaId // Save dosyaId for cancellation
        }));
      }
      
      // Handle completion
      if (lastNotification.type === 'excel_upload_complete') {
        console.log('✅ Upload completed via WebSocket');
        setUploadProgress(prev => ({
          ...prev,
          isUploading: true,
          stage: 'completed',
          percentage: 100,
          message: 'İşlem tamamlandı!',
          totalRows: lastNotification.data?.totalRows,
          successfulRows: lastNotification.data?.successfulRows,
          errorRows: lastNotification.data?.errorRows
        }));
        
        // Set the upload result
        setUploadResult({
          success: true,
          message: lastNotification.message,
          data: {
            dosyaId: lastNotification.dosyaId,
            totalRows: lastNotification.data?.totalRows || 0,
            processedRows: lastNotification.data?.totalRows || 0,
            successfulRows: lastNotification.data?.successfulRows || 0,
            errorRows: lastNotification.data?.errorRows || 0,
            errors: lastNotification.data?.errors || []
          }
        });
        
        setIsLoading(false);
        
        // Hide progress after 5 seconds
        setTimeout(() => {
          setUploadProgress(prev => ({ ...prev, isUploading: false }));
        }, 5000);
      }
      
      // Handle failure
      if (lastNotification.type === 'excel_upload_failed') {
        console.log('❌ Upload failed via WebSocket');
        setUploadProgress(prev => ({
          ...prev,
          isUploading: true,
          stage: 'error',
          percentage: 0,
          message: lastNotification.message
        }));
        
        setIsLoading(false);
        
        // Hide progress after 5 seconds
        setTimeout(() => {
          setUploadProgress(prev => ({ ...prev, isUploading: false }));
        }, 5000);
      }
    }
  }, [lastNotification]);

  // Prevent navigation during upload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploadProgress.isUploading) {
        e.preventDefault();
        e.returnValue = 'Excel dosyası yükleniyor. Sayfayı kapatmak istiyor musunuz?';
        return e.returnValue;
      }
    };

    if (uploadProgress.isUploading) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [uploadProgress.isUploading]);

  // Handle upload cancellation
  const handleCancelUpload = async () => {
    if (uploadProgress.isUploading) {
      console.log('🚫 Kullanıcı hoca yüklemeyi iptal etti, dosyaId:', uploadProgress.dosyaId);
      
      try {
        // Try to cancel with specific dosyaId if available
        if (uploadProgress.dosyaId) {
          console.log('🚫 Hoca dosya ID ile iptal ediliyor:', uploadProgress.dosyaId);
          await api.cancelExcelUpload(uploadProgress.dosyaId);
          console.log('✅ Hoca cancel API call successful');
        } else {
          console.log('⚠️ Hoca dosya ID bulunamadı, genel cancel çağrılıyor');
          cancelCurrentUpload();
        }
      } catch (error) {
        console.error('❌ Hoca cancel API call failed:', error);
        // Fallback to WebSocket cancel
        cancelCurrentUpload();
      }
      
      // Reset all upload states immediately
      setUploadProgress({
        isUploading: false,
        stage: 'error',
        percentage: 0,
        message: 'Yükleme iptal ediliyor...'
      });
      
      // Reset loading and selection states
      setIsLoading(false);
      setSelectedFile(null);
      setUploadResult(null);
      
      // Show notification
      showNotification({
        message: '⚠️ Yükleme iptal edildi',
        type: 'warning',
        duration: 3000
      });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      showNotification({
        message: 'Lütfen sadece Excel dosyası (.xlsx, .xls) yükleyin.',
        type: 'error',
        duration: 5000
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB
      showNotification({
        message: 'Dosya boyutu 50MB\'dan büyük olamaz.',
        type: 'error',
        duration: 5000
      });
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
    
    showNotification({
      message: `📁 Dosya seçildi: ${file.name}`,
      type: 'info',
      duration: 3000
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setUploadProgress({
      isUploading: true,
      stage: 'uploading',
      percentage: 0,
      message: 'Dosya yükleniyor...'
    });

    try {
      const result = await api.uploadHocaExcel(selectedFile);

      if (result.success) {
        // Save dosyaId for cancellation
        const dosyaId = result.data?.dosyaId;
        if (dosyaId) {
          setUploadProgress(prev => ({
            ...prev,
            dosyaId: dosyaId
          }));
          console.log('💾 Hoca dosya ID kaydedildi:', dosyaId);
        }
        
        // Always wait for WebSocket progress updates from backend
        console.log('📊 Upload accepted, waiting for WebSocket progress updates');
        setUploadProgress((prev) => ({
          ...prev,
          stage: 'processing',
          percentage: 0,
          message: 'İşleme başlandı... Canlı progress takibi aktif'
        }));
        // Keep isLoading true; WebSocket will report completion
      } else {
        setUploadProgress({
          isUploading: false,
          stage: 'error',
          percentage: 0,
          message: result.message || 'Yükleme hatası'
        });
        setIsLoading(false);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      console.error('Upload hatası:', error);
      
      setUploadProgress({
        isUploading: false,
        stage: 'error',
        percentage: 0,
        message: `Hata: ${errorMessage}`
      });
      setIsLoading(false);
      
      showNotification({ message: `❌ Hata: ${errorMessage}` });
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setUploadResult(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Progress Overlay */}
      {uploadProgress.isUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              {/* Progress Circle */}
              <div className={`relative w-32 h-32 mb-6 ${
                uploadProgress.stage === 'processing' ? 'animate-pulse' : ''
              }`}>
                <svg 
                  width="128" 
                  height="128" 
                  viewBox="0 0 100 100"
                  className={uploadProgress.stage === 'processing' ? 'animate-spin' : ''}
                  style={uploadProgress.stage === 'processing' ? { 
                    animationDuration: '3s',
                    animationTimingFunction: 'linear',
                    animationIterationCount: 'infinite'
                  } : {}}
                >
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-200"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    className={`${
                      uploadProgress.stage === 'error' 
                        ? 'text-red-500' 
                        : uploadProgress.stage === 'completed'
                        ? 'text-green-500'
                        : 'text-green-500'
                    } transition-all duration-500 ease-in-out ${
                      uploadProgress.stage === 'processing' ? 'animate-pulse' : ''
                    }`}
                    style={{
                      strokeDasharray: `${2 * Math.PI * 40}`,
                      strokeDashoffset: `${2 * Math.PI * 40 * (1 - uploadProgress.percentage / 100)}`,
                    }}
                  />
                </svg>
                {/* Percentage text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-2xl font-bold text-gray-800 ${
                    uploadProgress.stage === 'processing' ? 'animate-pulse' : ''
                  }`}>
                    {uploadProgress.percentage}%
                  </span>
                </div>
              </div>

              {/* Stage Icon */}
              <div className={`text-4xl mb-4 ${
                uploadProgress.stage === 'processing' ? 'animate-bounce' : 
                uploadProgress.stage === 'uploading' ? 'animate-pulse' : ''
              }`}>
                {uploadProgress.stage === 'uploading' && '📤'}
                {uploadProgress.stage === 'processing' && '⚙️'}
                {uploadProgress.stage === 'completed' && '✅'}
                {uploadProgress.stage === 'error' && '❌'}
              </div>

              {/* Status Message */}
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {uploadProgress.stage === 'uploading' && 'Dosya Yükleniyor'}
                {uploadProgress.stage === 'processing' && 'İşleniyor'}
                {uploadProgress.stage === 'completed' && 'Tamamlandı'}
                {uploadProgress.stage === 'error' && 'Hata Oluştu'}
              </h3>

              <p className="text-gray-600 mb-4">
                {uploadProgress.message}
              </p>

              {/* Progress Details */}
              {uploadProgress.stage === 'completed' && uploadProgress.totalRows && (
                <div className="bg-green-50 rounded-lg p-4 mt-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-green-600">{uploadProgress.totalRows}</div>
                      <div className="text-gray-600">Toplam</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-green-600">{uploadProgress.successfulRows}</div>
                      <div className="text-gray-600">Başarılı</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-red-600">{uploadProgress.errorRows}</div>
                      <div className="text-gray-600">Hatalı</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning about navigation */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ İşlem devam ederken sayfayı kapatmayın
                </p>
              </div>

              {/* Cancel Upload Button */}
              {(uploadProgress.stage === 'uploading' || uploadProgress.stage === 'processing') && (
                <button
                  onClick={handleCancelUpload}
                  className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  Yüklemeyi İptal Et
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
          👨‍🏫 Hoca Bilgileri Güncelle
        </h1>
        <p className="text-gray-600 text-lg">
          Excel dosyası yükleyerek toplu hoca bilgilerini güncelleyin
        </p>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">📋 Excel Format Bilgileri:</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>D Sütunu:</strong> Ad (İlk kısım)</p>
            <p><strong>E Sütunu:</strong> Soyadı (İkinci kısım)</p>
            <p><strong>G Sütunu:</strong> Email (Username olarak da kullanılır)</p>
            <p><strong>F Sütunu:</strong> TC Kimlik Numarası</p>
            <p><strong>A Sütunu:</strong> Fakülte</p>
            <p><strong>B Sütunu:</strong> Bölüm</p>
            <p><strong>🔐 Parola:</strong> "htc" + TC Kimlik numarası</p>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <span className="text-3xl">📄</span>
          Excel Dosyası Yükle
        </h2>
        
        <div
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
            dragActive
              ? 'border-green-500 bg-green-50 scale-105'
              : selectedFile
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isLoading}
          />
          
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent"></div>
              <p className="text-lg font-medium text-green-600">Excel dosyası işleniyor...</p>
              <p className="text-sm text-gray-500">Bu işlem birkaç dakika sürebilir</p>
            </div>
          ) : selectedFile ? (
            <div className="flex flex-col items-center gap-4">
              <div className="text-6xl">📊</div>
              <div>
                <p className="text-xl font-bold text-emerald-600">Dosya seçildi!</p>
                <p className="text-gray-600 mt-2">{selectedFile.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Boyut: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={clearSelection}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
              >
                Dosyayı Kaldır
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="text-6xl">📁</div>
              <div>
                <p className="text-xl font-bold text-gray-700">Excel dosyasını buraya sürükleyin</p>
                <p className="text-gray-500 mt-2">veya tıklayarak seçin</p>
                <p className="text-sm text-gray-400 mt-2">
                  Desteklenen formatlar: .xlsx, .xls (Max: 50MB)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Button */}
      {selectedFile && !isLoading && (
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleUpload}
              disabled={isLoading}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
            >
              <span className="text-xl">🚀</span>
              Hoca Bilgilerini Yükle ve İşle
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {uploadResult && (
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="text-3xl">{uploadResult.success ? '✅' : '⚠️'}</span>
            İşlem Sonucu
          </h2>
          
          <div className={`p-6 rounded-lg ${uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <p className={`text-lg font-semibold ${uploadResult.success ? 'text-green-800' : 'text-yellow-800'}`}>
              {uploadResult.message}
            </p>
            
            {uploadResult.data && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-white rounded-lg shadow">
                  <div className="text-2xl font-bold text-blue-600">{uploadResult.data.totalRows}</div>
                  <div className="text-sm text-gray-600">Toplam Satır</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow">
                  <div className="text-2xl font-bold text-green-600">{uploadResult.data.successfulRows}</div>
                  <div className="text-sm text-gray-600">Başarılı</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow">
                  <div className="text-2xl font-bold text-red-600">{uploadResult.data.errorRows}</div>
                  <div className="text-sm text-gray-600">Hatalı</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow">
                  <div className="text-2xl font-bold text-purple-600">#{uploadResult.data.dosyaId}</div>
                  <div className="text-sm text-gray-600">Dosya ID</div>
                </div>
              </div>
            )}

            {uploadResult.data?.errors && uploadResult.data.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-red-800 mb-2">❌ Hatalar (İlk 10 adet):</h4>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                  {uploadResult.data.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700 mb-1">
                      • {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default HocaGuncelle;
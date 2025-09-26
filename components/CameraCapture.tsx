
import React, { useRef, useEffect, useState } from 'react';
import { XCircleIcon } from './Icons';
import Spinner from './Spinner';

interface CameraCaptureProps {
  onCapture: (base64Data: string) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(true);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } // Prefer back camera
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => setIsCameraLoading(false);
          }
        } else {
          setError('Trình duyệt không hỗ trợ truy cập camera.');
          setIsCameraLoading(false);
        }
      } catch (err) {
        console.error("Error accessing camera: ", err);
        setError('Không thể truy cập camera. Vui lòng cấp quyền và thử lại.');
        setIsCameraLoading(false);
      }
    };

    startCamera();

    return () => {
      // Cleanup: stop the stream when component unmounts
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the current video frame onto the canvas
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        // Get the image data as a base64 string (JPEG format)
        const base64Data = canvas.toDataURL('image/jpeg').split(',')[1];
        
        onCapture(base64Data);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50">
      <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
        {isCameraLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 text-white">
                <Spinner />
                <p className="mt-2">Đang khởi động camera...</p>
            </div>
        )}
        {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900 bg-opacity-80 text-white p-4">
                 <XCircleIcon className="w-12 h-12 mb-4" />
                <p className="text-center font-semibold">{error}</p>
            </div>
        )}
      </div>

      <div className="mt-6 flex items-center space-x-6">
        <button
          onClick={onClose}
          className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-full shadow-lg hover:bg-gray-600 transition-colors"
        >
          Hủy
        </button>
        <button
          onClick={handleCapture}
          disabled={!!error || isCameraLoading}
          className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg transform active:scale-95 transition-transform disabled:opacity-50"
          aria-label="Chụp ảnh"
        >
          <div className="w-16 h-16 rounded-full border-4 border-gray-800"></div>
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  );
};

export default CameraCapture;
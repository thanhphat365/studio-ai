import React, { useState, useEffect, useRef, useCallback } from 'react';
import { XCircleIcon } from './Icons';
import Spinner from './Spinner';

interface PdfViewerProps {
    base64Data: string;
    onClose: () => void;
}

// Add type declaration for pdfjsLib if it's not globally available in the module scope
declare const pdfjsLib: any;

const PdfViewer: React.FC<PdfViewerProps> = ({ base64Data, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [pageNum, setPageNum] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [scale, setScale] = useState(1.5);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadingTask = pdfjsLib.getDocument({ data: atob(base64Data) });
        loadingTask.promise.then((pdf: any) => {
            setPdfDoc(pdf);
            setNumPages(pdf.numPages);
            setIsLoading(false);
        }).catch((err: Error) => {
            console.error("Error loading PDF:", err);
            setError("Không thể tải tệp PDF. Tệp có thể bị hỏng.");
            setIsLoading(false);
        });
    }, [base64Data]);

    const renderPage = useCallback((num: number) => {
        if (!pdfDoc) return;
        setIsLoading(true);
        pdfDoc.getPage(num).then((page: any) => {
            const viewport = page.getViewport({ scale });
            const canvas = canvasRef.current;
            if (canvas) {
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                if (context) {
                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };
                    page.render(renderContext).promise.then(() => {
                        setIsLoading(false);
                    });
                }
            }
        });
    }, [pdfDoc, scale]);

    useEffect(() => {
        if (pdfDoc) {
            renderPage(pageNum);
        }
    }, [pdfDoc, pageNum, renderPage]);

    const onPrevPage = () => {
        if (pageNum <= 1) return;
        setPageNum(pageNum - 1);
    };

    const onNextPage = () => {
        if (pageNum >= numPages) return;
        setPageNum(pageNum + 1);
    };

    const onZoomIn = () => setScale(s => Math.min(s + 0.2, 3));
    const onZoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm p-2 sm:p-4" onClick={onClose}>
            {/* Toolbar */}
            <div className="w-full max-w-5xl bg-card-secondary text-text-primary p-2 rounded-t-lg flex items-center justify-between shadow-lg" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 sm:gap-4">
                    <button onClick={onPrevPage} disabled={pageNum <= 1} className="px-3 py-1 rounded disabled:opacity-50 hover:bg-card transition-colors">Trước</button>
                    <span className="text-sm sm:text-base">Trang {pageNum} / {numPages || '?'}</span>
                    <button onClick={onNextPage} disabled={pageNum >= numPages} className="px-3 py-1 rounded disabled:opacity-50 hover:bg-card transition-colors">Sau</button>
                </div>
                <div className="hidden sm:flex items-center gap-4">
                    <button onClick={onZoomOut} disabled={scale <= 0.5} className="px-3 py-1 rounded disabled:opacity-50 hover:bg-card transition-colors">Thu nhỏ</button>
                    <span>{Math.round(scale * 100)}%</span>
                    <button onClick={onZoomIn} disabled={scale >= 3} className="px-3 py-1 rounded disabled:opacity-50 hover:bg-card transition-colors">Phóng to</button>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-card transition-colors">
                    <XCircleIcon className="w-6 h-6" />
                </button>
            </div>
            {/* PDF Content */}
            <div className="w-full max-w-5xl flex-1 overflow-auto bg-gray-600 p-2 sm:p-4 rounded-b-lg" onClick={e => e.stopPropagation()}>
                 {(isLoading && !error) && <div className="flex items-center justify-center h-full text-white"><Spinner /> <span className="ml-2">Đang tải trang...</span></div>}
                 {error && <div className="flex items-center justify-center h-full text-white bg-red-800 p-4 rounded-md">{error}</div>}
                 <canvas ref={canvasRef} className={`mx-auto shadow-xl ${isLoading || error ? 'hidden' : ''}`}></canvas>
            </div>
        </div>
    );
};

export default PdfViewer;
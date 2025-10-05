import React, { useState } from 'react';
import { CustomThemeColors } from '../types';
import { hexToRgb, getContrastingTextColor } from '../utils/color';

interface CustomThemeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (colors: CustomThemeColors) => void;
    initialColors: CustomThemeColors;
    defaultColors: CustomThemeColors;
}

const CustomThemeModal: React.FC<CustomThemeModalProps> = ({ isOpen, onClose, onSave, initialColors, defaultColors }) => {
    const [colors, setColors] = useState(initialColors);

    // Generate style variables for the preview box only
    const primaryTextColor = getContrastingTextColor(colors.primary);
    const previewStyle: React.CSSProperties = {
        '--color-background': hexToRgb(colors.background),
        '--color-text-primary': hexToRgb(colors.text),
        '--color-primary': hexToRgb(colors.primary),
        '--color-primary-text': hexToRgb(primaryTextColor),
        '--color-text-secondary': `rgba(${hexToRgb(colors.text)}, 0.7)`,
    } as React.CSSProperties;

    const handleColorChange = (key: keyof CustomThemeColors, value: string) => {
        setColors(prev => ({ ...prev, [key]: value }));
    };
    
    const handleSave = () => {
        onSave(colors);
    };

    const handleReset = () => {
        setColors(defaultColors);
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-sm mx-auto bg-card-secondary rounded-2xl shadow-xl transform transition-all p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold text-text-primary mb-6">Tùy chỉnh Giao diện</h2>
                
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <label htmlFor="bg-color" className="text-sm font-medium text-text-primary">Màu nền</label>
                        <input
                            type="color"
                            id="bg-color"
                            value={colors.background}
                            onChange={(e) => handleColorChange('background', e.target.value)}
                            className="w-10 h-10 p-1 bg-card border border-border rounded-md cursor-pointer"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <label htmlFor="text-color" className="text-sm font-medium text-text-primary">Màu chữ</label>
                        <input
                            type="color"
                            id="text-color"
                            value={colors.text}
                            onChange={(e) => handleColorChange('text', e.target.value)}
                             className="w-10 h-10 p-1 bg-card border border-border rounded-md cursor-pointer"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <label htmlFor="primary-color" className="text-sm font-medium text-text-primary">Màu nhấn</label>
                        <input
                            type="color"
                            id="primary-color"
                            value={colors.primary}
                            onChange={(e) => handleColorChange('primary', e.target.value)}
                             className="w-10 h-10 p-1 bg-card border border-border rounded-md cursor-pointer"
                        />
                    </div>
                </div>

                {/* Dedicated Preview Area */}
                <div className="mt-6">
                    <p className="text-sm font-medium text-text-secondary mb-2">Xem trước</p>
                    <div
                        className="border border-border rounded-lg p-4 transition-colors"
                        style={previewStyle}
                    >
                        <div className="bg-background p-4 rounded-md">
                            <p className="font-bold text-text-primary">Văn bản mẫu</p>
                            <p className="text-sm text-text-secondary mt-1">Văn bản phụ</p>
                            <button
                                className="mt-3 px-4 py-1.5 bg-primary text-primary-text text-sm font-semibold rounded-md hover:opacity-90"
                            >
                                Nút bấm
                            </button>
                        </div>
                    </div>
                </div>


                <div className="mt-8 flex flex-col sm:flex-row-reverse gap-3">
                    <button
                        onClick={handleSave}
                        className="w-full sm:w-auto px-5 py-2.5 bg-primary text-primary-text rounded-lg font-semibold text-sm hover:bg-primary-hover transition-colors"
                    >
                        Lưu
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-5 py-2.5 bg-card text-text-primary rounded-lg font-semibold text-sm hover:opacity-80 transition-opacity border border-border"
                    >
                        Hủy
                    </button>
                     <button
                        onClick={handleReset}
                        className="w-full sm:w-auto sm:mr-auto px-5 py-2.5 text-text-secondary rounded-lg font-semibold text-sm hover:text-text-primary transition-colors"
                    >
                        Đặt lại
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomThemeModal;
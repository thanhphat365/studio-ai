
import React from 'react';
import { AIProvider } from '../types';

interface ProviderSelectorProps {
    aiProvider: AIProvider;
    setAiProvider: (provider: AIProvider) => void;
    isLoading: boolean;
}

const providerLabels: Record<AIProvider, string> = {
    'gemini': 'Google Gemini',
    'openai': 'OpenAI (GPT-4o)',
    'deepseek': 'DeepSeek',
    'deep_thought': 'Suy nghĩ sâu (Hợp tác)'
};

const SelectArrow: React.FC = () => (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
        </svg>
    </div>
);

const ProviderSelector: React.FC<ProviderSelectorProps> = ({ aiProvider, setAiProvider, isLoading }) => {
    const selectClasses = "appearance-none block w-full bg-card-secondary border border-border text-text-primary py-2 px-3 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-card focus:border-primary text-sm transition-colors";

    return (
        <div className="relative">
            <select
                id="provider-select"
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value as AIProvider)}
                disabled={isLoading}
                className={selectClasses}
                aria-label="Chọn nhà cung cấp AI"
            >
                {Object.entries(providerLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                ))}
            </select>
            <SelectArrow />
        </div>
    );
};

export default ProviderSelector;
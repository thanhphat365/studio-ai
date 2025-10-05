import React from 'react';
import { LearningMode } from '../types';

interface ModeSelectorProps {
    learningMode: LearningMode;
    setLearningMode: (mode: LearningMode) => void;
    isLoading: boolean;
}

const modeLabels: Record<LearningMode, string> = {
    'solve_socratic': 'Hướng dẫn (Socratic)',
    'solve_direct': 'Giải chi tiết',
    'solve_final_answer': 'Chỉ xem đáp án',
    'review': 'Ôn kiến thức'
};

const SelectArrow: React.FC = () => (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
        </svg>
    </div>
);

const ModeSelector: React.FC<ModeSelectorProps> = ({ learningMode, setLearningMode, isLoading }) => {
    const selectClasses = "appearance-none block w-full bg-card-secondary border border-border text-text-primary py-2 px-3 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-card focus:border-primary text-sm transition-colors";

    return (
        <div className="relative">
            <select
                id="mode-select"
                value={learningMode}
                onChange={(e) => setLearningMode(e.target.value as LearningMode)}
                disabled={isLoading}
                className={selectClasses}
                aria-label="Chọn chế độ học tập"
            >
                <option value="solve_socratic">{modeLabels['solve_socratic']}</option>
                <option value="solve_direct">{modeLabels['solve_direct']}</option>
                <option value="solve_final_answer">{modeLabels['solve_final_answer']}</option>
                <option value="review">{modeLabels['review']}</option>
            </select>
            <SelectArrow />
        </div>
    );
};

export default ModeSelector;
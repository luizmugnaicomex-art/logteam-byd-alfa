import React from 'react';

interface BarChartProps {
    data: {
        title: string;
        labels: string[];
        datasets: {
            label: string;
            data: number[];
            backgroundColor: string[];
        }[];
    };
    onBarClick?: (label: string) => void;
}

const BarChart: React.FC<BarChartProps> = ({ data, onBarClick }) => {
    const maxValue = Math.max(...data.datasets[0].data, 1);
    
    return (
        <div className="w-full h-full flex flex-col">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{data.title}</h3>
            <div className="flex-grow space-y-0.5">
                {data.labels.map((label, index) => (
                    <button
                        key={label}
                        className="w-full flex items-center group disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => onBarClick && onBarClick(label)}
                        disabled={!onBarClick || data.datasets[0].data[index] === 0}
                    >
                        <div className="w-48 text-xs text-gray-600 text-right pr-2 truncate" title={label}>{label || "N/A"}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                            <div
                                className="h-3 rounded-full flex items-center justify-end px-2 text-white text-xs font-bold transition-all duration-500 ease-out group-hover:opacity-80"
                                style={{
                                    width: `${(data.datasets[0].data[index] / maxValue) * 100}%`,
                                    backgroundColor: data.datasets[0].backgroundColor[index] || '#ccc',
                                    minWidth: '24px' // ensure value is visible even for small bars
                                }}
                            >
                                {data.datasets[0].data[index]}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default BarChart;
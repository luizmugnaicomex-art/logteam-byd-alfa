
import React, { useEffect, useRef } from 'react';

declare var Chart: any;
declare var ChartDataLabels: any;

interface ChartJSProps {
    type: 'bar' | 'pie' | 'doughnut' | 'line' | 'horizontalBar';
    data: any;
    options: any;
    plugins?: any[];
}

const ChartJS: React.FC<ChartJSProps> = ({ type, data, options, plugins = [] }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<any>(null);

    useEffect(() => {
        if (typeof Chart === 'undefined') return;
        
        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            // Special handling for horizontalBar alias (Chart.js 3+ uses indexAxis: 'y' on 'bar')
            const chartType = type === 'horizontalBar' ? 'bar' : type;
            const finalOptions = type === 'horizontalBar' ? { ...options, indexAxis: 'y' as const } : options;
            
            // Ensure datalabels is registered
            if (typeof ChartDataLabels !== 'undefined' && !Chart.registry.plugins.get('datalabels')) {
                 Chart.register(ChartDataLabels);
            }

            chartRef.current = new Chart(ctx, {
                type: chartType,
                data,
                options: finalOptions,
                plugins: typeof ChartDataLabels !== 'undefined' ? [ChartDataLabels, ...plugins] : plugins,
            });
        }

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [type, data, options, plugins]);

    return <div className="relative h-full w-full"><canvas ref={canvasRef}></canvas></div>;
};

export default ChartJS;

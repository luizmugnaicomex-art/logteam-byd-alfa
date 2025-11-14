
import React, { useState } from 'react';
import { UploadIcon, CloseIcon, AlertCircleIcon } from './common/Icons';

interface UploadModalProps {
    onCancel: () => void;
    onImport: (data: any[]) => void;
    parser: (data: any[]) => { data: any[], error: string | null };
    title: string;
}

const UploadModal: React.FC<UploadModalProps> = ({ onCancel, onImport, parser, title }) => {
    const [dragOver, setDragOver] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [parsedData, setParsedData] = useState<any[] | null>(null);

    const processFile = (file: File) => {
        setFileName(file.name);
        setError(null);
        setParsedData(null);

        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!['.csv', '.xls', '.xlsx'].includes(fileExtension)) {
            return setError("Invalid file type. Please upload a .csv, .xls, or .xlsx file.");
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = (window as any).XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = (window as any).XLSX.utils.sheet_to_json(worksheet, { defval: null });
                
                const result = parser(jsonData);
                if (result.error) setError(result.error);
                else setParsedData(result.data);
            } catch (err: any) {
                setError(err.message || "Failed to process file.");
            }
        };
        reader.onerror = () => setError("Failed to read the file.");
        reader.readAsArrayBuffer(file);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) processFile(e.target.files[0]);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" onClick={onCancel}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center"><h3 className="text-xl font-semibold">{title}</h3><button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><CloseIcon /></button></div>
                <div className="p-6">
                    {!parsedData && (
                        <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} className={`p-10 border-2 border-dashed rounded-lg text-center transition-colors ${dragOver ? 'border-byd-blue bg-blue-50' : 'border-gray-300'}`}>
                            <input type="file" id="file-upload" accept=".csv,.xls,.xlsx" onChange={handleFileSelect} hidden />
                            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center text-gray-600"><UploadIcon /><span>{fileName || 'Drag & drop or click to upload'}</span></label>
                        </div>
                    )}
                    {error && <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center"><AlertCircleIcon /> <span className="ml-2">{error}</span></div>}
                    {parsedData && (
                        <div>
                            <h4 className="font-semibold">Import Preview</h4>
                            <p className="text-sm text-gray-600">Found {parsedData.length} valid records in <strong>{fileName}</strong>. Existing records will be updated.</p>
                            <div className="mt-2 border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50"><tr><th className="p-2 text-left font-medium">CNTR</th><th className="p-2 text-left font-medium">BL</th><th className="p-2 text-left font-medium">Shipper</th><th className="p-2 text-left font-medium">Status</th></tr></thead>
                                    <tbody className="divide-y">{parsedData.slice(0, 10).map(item => (<tr key={item.cntrsOriginal}>
                                        <td className="p-2">{item.cntrsOriginal}</td><td className="p-2">{item.bl || 'N/A'}</td><td className="p-2">{item.shipper || 'N/A'}</td><td className="p-2">{item.statusComex || 'N/A'}</td>
                                    </tr>))}</tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                    <button onClick={() => onImport(parsedData!)} disabled={!parsedData || !!error} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-byd-blue text-base font-medium text-white hover:bg-byd-blue/90 disabled:bg-gray-400 sm:ml-3 sm:w-auto sm:text-sm">Confirm Import</button>
                    <button onClick={onCancel} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default UploadModal;

/**
 * Bulk Import Modal - Excel/CSV file upload and processing
 * Multi-step wizard: Upload → Preview → Import → Results
 */
import { useState } from 'react';
import { Button, Card, CardBody, CardHeader } from '@/components/ui';
import { UploadStep, PreviewStep, ImportingStep, ResultsStep } from '@/components/bulkimport';
import { parseExcelFile, generateTemplate } from '@/services/excelParser';
import { validateBulkData, bulkCreateUsers, generateErrorReport } from '@/services/bulkImport';
import './BulkImportModal.css';

const STEPS = ['upload', 'preview', 'importing', 'results'];

export function BulkImportModal({ onClose, onComplete }) {
    const [step, setStep] = useState('upload');
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [validatedData, setValidatedData] = useState([]);
    const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
    const [results, setResults] = useState({ success: [], failed: [] });
    const [error, setError] = useState('');

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError('');

        try {
            const data = await parseExcelFile(selectedFile);
            if (data.length === 0) {
                setError('No data found in file');
                return;
            }
            setParsedData(data);
            const validated = validateBulkData(data);
            setValidatedData(validated);
            setStep('preview');
        } catch (err) {
            setError(err.message || 'Failed to parse file');
        }
    };

    const handleImport = async () => {
        const validRows = validatedData.filter(row => row.isValid);
        if (validRows.length === 0) {
            setError('No valid rows to import');
            return;
        }

        setStep('importing');
        setProgress({ current: 0, total: validRows.length, status: 'Starting...' });

        const importResults = await bulkCreateUsers(validRows, (prog) => {
            setProgress({
                current: prog.current,
                total: prog.total,
                status: `${prog.status === 'creating' ? 'Creating' : prog.status === 'success' ? 'Created' : 'Failed'}: ${prog.user}`
            });
        });

        setResults(importResults);
        setStep('results');
    };

    const handleDownloadErrors = () => {
        const csv = generateErrorReport(results.failed);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'import_errors.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDone = () => {
        onComplete?.();
        onClose();
    };

    const validCount = validatedData.filter(r => r.isValid).length;
    const invalidCount = validatedData.filter(r => !r.isValid).length;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <Card className="modal-content bulk-import-modal" onClick={e => e.stopPropagation()}>
                <CardHeader>
                    <h3>Bulk Import Users</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </CardHeader>
                <CardBody>
                    {/* Step Indicator */}
                    <div className="step-indicator">
                        {STEPS.map((s, i) => (
                            <div key={s} className={`step ${STEPS.indexOf(step) >= i ? 'active' : ''}`}>
                                <span className="step-number">{i + 1}</span>
                                <span className="step-label">{s}</span>
                            </div>
                        ))}
                    </div>

                    {error && <div className="form-error">{error}</div>}

                    {/* Upload Step */}
                    {step === 'upload' && (
                        <UploadStep
                            onFileChange={handleFileChange}
                            onDownloadTemplate={generateTemplate}
                        />
                    )}

                    {/* Preview Step */}
                    {step === 'preview' && (
                        <PreviewStep
                            data={validatedData}
                            validCount={validCount}
                            invalidCount={invalidCount}
                            onBack={() => setStep('upload')}
                            onImport={handleImport}
                        />
                    )}

                    {/* Importing Step */}
                    {step === 'importing' && (
                        <ImportingStep progress={progress} />
                    )}

                    {/* Results Step */}
                    {step === 'results' && (
                        <ResultsStep
                            results={results}
                            onDownloadErrors={handleDownloadErrors}
                            onDone={handleDone}
                        />
                    )}
                </CardBody>
            </Card>
        </div>
    );
}
export default BulkImportModal;

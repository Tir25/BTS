/**
 * Bulk Import Modal - Excel/CSV file upload and processing
 * Multi-step wizard: Upload → Preview → Import → Results
 */
import { useState } from 'react';
import { Button, Card, CardBody, CardHeader } from '@/components/ui';
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

// Sub-components for each step (keeping file under 200 lines)
function UploadStep({ onFileChange, onDownloadTemplate }) {
    return (
        <div className="upload-step">
            <div className="upload-area">
                <span className="upload-icon">📁</span>
                <p>Drop an Excel or CSV file here, or click to browse</p>
                <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={onFileChange}
                    className="file-input"
                />
            </div>
            <div className="upload-actions">
                <Button variant="secondary" onClick={onDownloadTemplate}>
                    📥 Download Template
                </Button>
            </div>
            <div className="upload-info">
                <h4>Template columns:</h4>
                <code>role, rollNo, email, name, birthday, phone, licenseNumber</code>
            </div>
        </div>
    );
}

function PreviewStep({ data, validCount, invalidCount, onBack, onImport }) {
    return (
        <div className="preview-step">
            <div className="preview-stats">
                <span className="stat-valid">✓ {validCount} valid</span>
                <span className="stat-invalid">✗ {invalidCount} errors</span>
            </div>
            <div className="preview-table-container">
                <table className="preview-table">
                    <thead>
                        <tr>
                            <th>Status</th><th>Role</th><th>Name</th><th>ID/Email</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.slice(0, 10).map((row, i) => (
                            <tr key={i} className={row.isValid ? '' : 'invalid-row'}>
                                <td>{row.isValid ? '✓' : '✗'}</td>
                                <td>{row.role}</td>
                                <td>{row.name}</td>
                                <td>{row.rollNo || row.email}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data.length > 10 && <p className="more-rows">...and {data.length - 10} more rows</p>}
            </div>
            <div className="form-actions">
                <Button variant="secondary" onClick={onBack}>Back</Button>
                <Button onClick={onImport} disabled={validCount === 0}>
                    Import {validCount} Users
                </Button>
            </div>
        </div>
    );
}

function ImportingStep({ progress }) {
    const percent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
    return (
        <div className="importing-step">
            <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${percent}%` }} />
            </div>
            <p className="progress-text">{progress.current} / {progress.total}</p>
            <p className="progress-status">{progress.status}</p>
        </div>
    );
}

function ResultsStep({ results, onDownloadErrors, onDone }) {
    return (
        <div className="results-step">
            <div className="results-summary">
                <div className="result-item success">
                    <span className="result-count">{results.success.length}</span>
                    <span className="result-label">Created</span>
                </div>
                <div className="result-item failed">
                    <span className="result-count">{results.failed.length}</span>
                    <span className="result-label">Failed</span>
                </div>
            </div>
            {results.failed.length > 0 && (
                <Button variant="secondary" onClick={onDownloadErrors}>
                    📥 Download Error Report
                </Button>
            )}
            <div className="form-actions">
                <Button onClick={onDone}>Done</Button>
            </div>
        </div>
    );
}

export default BulkImportModal;

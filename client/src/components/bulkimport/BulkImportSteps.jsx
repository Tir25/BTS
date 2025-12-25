/**
 * Bulk Import Step Components
 * Modular step components for the bulk import wizard
 */
import { Button } from '@/components/ui';
import { FolderOpen, Download, Check, X } from 'lucide-react';

/**
 * Step 1: File Upload
 */
export function UploadStep({ onFileChange, onDownloadTemplate }) {
    return (
        <div className="upload-step">
            <div className="upload-area">
                <span className="upload-icon"><FolderOpen size={32} /></span>
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
                    <Download size={16} /> Download Template
                </Button>
            </div>
            <div className="upload-info">
                <h4>Template columns:</h4>
                <code>role, rollNo, email, name, birthday, phone, licenseNumber</code>
            </div>
        </div>
    );
}

/**
 * Step 2: Data Preview
 */
export function PreviewStep({ data, validCount, invalidCount, onBack, onImport }) {
    return (
        <div className="preview-step">
            <div className="preview-stats">
                <span className="stat-valid"><Check size={14} /> {validCount} valid</span>
                <span className="stat-invalid"><X size={14} /> {invalidCount} errors</span>
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
                                <td>{row.isValid ? <Check size={14} /> : <X size={14} />}</td>
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

/**
 * Step 3: Import Progress
 */
export function ImportingStep({ progress }) {
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

/**
 * Step 4: Results Summary
 */
export function ResultsStep({ results, onDownloadErrors, onDone }) {
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
                    <Download size={16} /> Download Error Report
                </Button>
            )}
            <div className="form-actions">
                <Button onClick={onDone}>Done</Button>
            </div>
        </div>
    );
}


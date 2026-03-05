import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';

const TestResultPage = ({ test, day, onBack }) => {
    const { updateConcreteTestResult } = useData();
    const [readings, setReadings] = useState(['', '', '']);
    const [average, setAverage] = useState(0);
    const [status, setStatus] = useState('');
    const [video, setVideo] = useState(null);
    const [photo, setPhoto] = useState(null);
    const [isNotTested, setIsNotTested] = useState(false);
    const [reason, setReason] = useState('');

    if (!test) return null;

    // Use a ref to track the loaded test ID to prevent infinite loops or resets
    const lastLoadedId = React.useRef(null);

    useEffect(() => {
        const currentId = test._id || test.id;

        // Only load data if we haven't loaded this test ID yet, or if the ID changes
        if (currentId !== lastLoadedId.current) {
            console.log("Loading test data for:", currentId);
            lastLoadedId.current = currentId;

            // Check both test.data.results (standard) and test.results (legacy/flat)
            let safeData = test.data || {};
            if (typeof safeData === 'string') {
                try { safeData = JSON.parse(safeData); } catch (e) { console.error("Parse error loading results", e); safeData = {}; }
            }
            const results = safeData.results || test.results;
            if (results && results[day]) {
                const result = results[day];
                setReadings(result.readings || ['', '', '']);
                setVideo(result.video || null);
                setPhoto(result.photo || null);
                setIsNotTested(result.status === 'Not Tested');
                setReason(result.reason || '');
            } else {
                // If no data for this day, reset to defaults
                setReadings(['', '', '']);
                setVideo(null);
                setPhoto(null);
                setIsNotTested(false);
                setReason('');
            }
        }
    }, [test, day]); // Dependencies can be broad because we check ref inside

    useEffect(() => {
        if (isNotTested) {
            setStatus('Not Tested');
            setAverage(0);
            return;
        }

        // Auto-calculate average
        const validReadings = readings.map(r => parseFloat(r)).filter(r => !isNaN(r));
        if (validReadings.length === 3) {
            const avg = (validReadings.reduce((a, b) => a + b, 0) / 3).toFixed(2);
            setAverage(avg);

            // Determine Pass/Fail
            // Parse data if it's a string (common issue preventing grade read)
            let safeData = test.data || {};
            if (typeof safeData === 'string') {
                try { safeData = JSON.parse(safeData); } catch (e) { console.error("Parse error", e); safeData = {}; }
            }

            const gradeStr = String(safeData.grade || test.grade || 'M0');
            const gradeValue = parseInt(gradeStr.replace('M', ''), 10);
            let requiredStrength = 0;

            if (day === 'day7') {
                requiredStrength = gradeValue * 0.7; // 70% for 7 days
            } else if (day === 'day14') {
                requiredStrength = gradeValue * 0.9; // 90% approx for 14 days
            } else if (day === 'day28') {
                requiredStrength = gradeValue; // 100% for 28 days
            }

            // If grade is 0 (M0 or invalid), it shouldn't pass by default if we have a real reading
            if (gradeValue === 0) {
                setStatus('Pending'); // Cannot judge without grade
            } else {
                setStatus(parseFloat(avg) >= requiredStrength ? 'Pass' : 'Fail');
            }
        } else {
            setAverage(0);
            setStatus('');
        }
    }, [readings, test.grade, day, isNotTested]);

    const handleReadingChange = (index, value) => {
        const newReadings = [...readings];
        newReadings[index] = value;
        setReadings(newReadings);
    };

    const handleVideoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setVideo(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhoto(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const resultData = {
            readings: isNotTested ? [] : readings,
            status,
            average,
            video,
            photo,
            reason: isNotTested ? reason : ''
        };

        try {
            const res = await updateConcreteTestResult(test._id || test.id, day, resultData);
            if (res && res.success) {
                onBack();
            } else {
                alert(res?.message || 'Failed to save result. Please try again.');
            }
        } catch (error) {
            console.error("Save failed", error);
            alert('An error occurred while saving: ' + error.message);
        }
    };

    const getDayLabel = () => {
        switch (day) {
            case 'day7': return '7 Days';
            case 'day14': return '14 Days';
            case 'day28': return '28 Days';
            default: return '';
        }
    };

    return (
        <div className="form-container fade-in">
            <div className="page-header">
                <button className="btn-link mb-4" onClick={onBack}>← Back to List</button>
                <h1>Enter Test Results</h1>
                <p className="text-muted">{getDayLabel()} Test for {test.location} ({test.grade})</p>
            </div>

            <div className="form-card card">
                <form onSubmit={handleSubmit}>
                    <div className="form-section">
                        <div className="checkbox-group">
                            <input
                                type="checkbox"
                                id="notTested"
                                checked={isNotTested}
                                onChange={(e) => setIsNotTested(e.target.checked)}
                                className="form-checkbox"
                            />
                            <label htmlFor="notTested">Not Tested / Skipped</label>
                        </div>

                        {isNotTested ? (
                            <div className="reason-container fade-in">
                                <div className="reason-icon">⚠️</div>
                                <div className="reason-content">
                                    <label>Reason for skipping test</label>
                                    <p className="reason-help">Please provide a valid reason for not conducting the cube test.</p>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="form-textarea"
                                        placeholder="e.g., Cube damaged during transit, Holiday, Site inaccessible..."
                                        required={isNotTested}
                                        rows="3"
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <h3 className="section-title">Cube Readings (N/mm²)</h3>
                                <div className="readings-grid">
                                    {[0, 1, 2].map((index) => (
                                        <div key={index} className="reading-input-group">
                                            <label>Cube {index + 1}</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={readings[index]}
                                                onChange={(e) => handleReadingChange(index, e.target.value)}
                                                className="form-input reading-input"
                                                required={!isNotTested}
                                                placeholder="0.0"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="form-section">
                        <h3 className="section-title">Proof of Testing</h3>
                        <div className="media-upload-grid">
                            {/* Photo Upload */}
                            <div className="upload-box">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    className="file-input"
                                    id="photo-upload"
                                />
                                <label htmlFor="photo-upload" className="upload-label">
                                    {photo ? 'Change Photo' : '📷 Upload Photo'}
                                </label>
                                {photo && (
                                    <div className="media-preview">
                                        <img src={photo} alt="Proof" className="preview-img" />
                                        <button type="button" className="btn-remove" onClick={() => setPhoto(null)}>×</button>
                                    </div>
                                )}
                            </div>

                            {/* Video Upload */}
                            <div className="upload-box">
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={handleVideoChange}
                                    className="file-input"
                                    id="video-upload"
                                />
                                <label htmlFor="video-upload" className="upload-label">
                                    {video ? 'Change Video' : '📹 Upload Video'}
                                </label>
                                {video && (
                                    <div className="media-preview">
                                        <video src={video} controls className="preview-video" />
                                        <button type="button" className="btn-remove" onClick={() => setVideo(null)}>×</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="result-summary">
                        <div className="summary-item">
                            <span className="label">Average Strength</span>
                            <span className="value">{average} <small>N/mm²</small></span>
                        </div>
                        <div className="summary-divider"></div>
                        <div className="summary-item">
                            <span className="label">Result Status</span>
                            <span className={`status-badge-lg ${status === 'Pass' ? 'status-pass' : status === 'Fail' ? 'status-fail' : 'status-pending'}`}>
                                {status || 'Pending'}
                            </span>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={onBack}>Cancel</button>
                        <button type="submit" className="btn btn-primary btn-lg" disabled={!status}>Save Results</button>
                    </div>
                </form>
            </div>

            <style>{`
                .form-container {
                    width: 100%;
                    max-width: 800px;
                    margin: 0 auto;
                }

                .form-card {
                    padding: 24px;
                    background: white;
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-md);
                    overflow: hidden; /* Prevent content from spilling out */
                }

                .form-section {
                    margin-bottom: 24px;
                }

                .section-title {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: var(--text-color);
                    margin-bottom: 16px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid var(--border-color);
                }

                .readings-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px; /* Reduced gap */
                }

                .reading-input-group label {
                    display: block;
                    font-size: 0.85rem;
                    color: var(--text-light);
                    margin-bottom: 6px;
                    text-align: center;
                    white-space: nowrap;
                }

                .reading-input {
                    text-align: center;
                    font-size: 1.1rem;
                    font-weight: 600;
                    padding: 12px;
                    width: 100%; /* Ensure full width */
                }

                .checkbox-group {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 16px;
                    padding: 12px;
                    background: #f3f4f6;
                    border-radius: var(--radius-md);
                }

                .form-checkbox {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                }

                .checkbox-group label {
                    font-weight: 600;
                    cursor: pointer;
                }

                .reason-container {
                    background: #fff7ed;
                    border: 1px solid #fed7aa;
                    border-radius: var(--radius-md);
                    padding: 20px;
                    display: flex;
                    gap: 16px;
                    align-items: flex-start;
                }

                .reason-icon {
                    font-size: 1.5rem;
                    background: #ffedd5;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    flex-shrink: 0;
                }

                .reason-content {
                    flex: 1;
                }

                .reason-content label {
                    display: block;
                    font-weight: 600;
                    color: #9a3412;
                    margin-bottom: 4px;
                }

                .reason-help {
                    font-size: 0.85rem;
                    color: #c2410c;
                    margin-bottom: 12px;
                }

                .form-textarea {
                    width: 100%;
                    padding: 12px;
                    border: 1px solid #fdba74;
                    border-radius: var(--radius-md);
                    font-size: 0.95rem;
                    resize: vertical;
                    transition: all 0.2s;
                    background: white;
                }

                .form-textarea:focus {
                    outline: none;
                    border-color: #f97316;
                    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
                }

                .media-upload-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }

                .upload-box {
                    border: 2px dashed var(--border-color);
                    padding: 16px;
                    border-radius: var(--radius-md);
                    text-align: center;
                    background: #f9fafb;
                    transition: all 0.2s;
                    position: relative;
                }

                .upload-box:hover {
                    border-color: var(--primary-color);
                    background: #eff6ff;
                }

                .upload-label {
                    display: inline-block;
                    padding: 8px 16px;
                    background: white;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    font-weight: 500;
                    color: var(--primary-color);
                    font-size: 0.9rem;
                    transition: all 0.2s;
                    box-shadow: var(--shadow-sm);
                    margin-bottom: 8px;
                }

                .upload-label:hover {
                    transform: translateY(-1px);
                    box-shadow: var(--shadow-md);
                }

                .media-preview {
                    margin-top: 8px;
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    box-shadow: var(--shadow-md);
                    position: relative;
                }

                .preview-img, .preview-video {
                    width: 100%;
                    height: 150px;
                    object-fit: cover;
                    background: black;
                    display: block;
                }

                .btn-remove {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    background: rgba(0, 0, 0, 0.6);
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 1.2rem;
                    line-height: 1;
                }

                .btn-remove:hover {
                    background: #dc2626;
                }

                .result-summary {
                    display: flex;
                    align-items: center;
                    padding: 20px;
                    background: #f8fafc;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    margin-bottom: 24px;
                    flex-wrap: wrap; /* Allow wrapping on small screens */
                    gap: 16px;
                }

                .summary-item {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    min-width: 120px;
                }

                .summary-divider {
                    width: 1px;
                    height: 40px;
                    background: var(--border-color);
                }

                .summary-item .label {
                    font-size: 0.8rem;
                    color: var(--text-light);
                    margin-bottom: 4px;
                    text-transform: uppercase;
                }

                .summary-item .value {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-color);
                }

                .summary-item .value small {
                    font-size: 0.9rem;
                    font-weight: 400;
                    color: var(--text-light);
                }

                .status-badge-lg {
                    padding: 6px 20px;
                    border-radius: 30px;
                    font-size: 0.9rem;
                    font-weight: 700;
                    text-transform: uppercase;
                }

                .status-pass { background: #dcfce7; color: #166534; }
                .status-fail { background: #fee2e2; color: #991b1b; }
                .status-pending { background: #e5e7eb; color: #4b5563; }

                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    padding-top: 20px;
                    border-top: 1px solid var(--border-color);
                }

                .btn-lg {
                    padding: 12px 24px;
                    font-size: 1rem;
                }
            `}</style>
        </div>
    );
};

export default TestResultPage;

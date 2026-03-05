import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { checkPermission } from '../../utils/permissions';

const BrickTestForm = ({ onBack, initialData }) => {
    const { addBrickTest, updateBrickTest, currentUser } = useData();
    const permission = checkPermission(currentUser, 'report');
    const [formData, setFormData] = useState({
        location: '',
        supplier: '',
        blockType: 'AAC Block',
        size: '',
        testDate: new Date().toISOString().split('T')[0],
        image: null,
        status: 'Pass', // Added Status
        results: {
            compressiveStrength: '',
            waterAbsorption: '',
            remarks: '',
            overall: 'Pass'
        }
    });

    useEffect(() => {
        if (initialData) {
            let safeData = initialData.data || {};
            if (typeof safeData === 'string') {
                try { safeData = JSON.parse(safeData); } catch (e) { safeData = {}; }
            }

            setFormData({
                ...initialData,
                testDate: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                location: initialData.location || '',
                supplier: safeData.supplier || initialData.supplier || '',
                blockType: safeData.blockType || initialData.blockType || 'AAC Block',
                size: safeData.size || initialData.size || '',
                image: initialData.image || null,
                status: initialData.status || 'Pass',
                results: safeData.results || {
                    compressiveStrength: '',
                    waterAbsorption: '',
                    remarks: '',
                    overall: 'Pass'
                }
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, image: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Permission Check for Data Entry
        if (permission === 'data_entry' && initialData) {
            if (initialData.status === 'Pass' || initialData.status === 'Fail' || (initialData.data && (initialData.data.results?.compressiveStrength))) {
                alert("Data Entry users cannot edit submitted test reports.");
                return;
            }
        }

        console.log("Submitting Brick Test...");

        const payload = {
            ...formData,
            date: formData.testDate,
            // status is already in formData
            data: {
                supplier: formData.supplier,
                blockType: formData.blockType,
                size: formData.size,
                results: formData.results
            }
        };

        let result;
        if (initialData) {
            result = await updateBrickTest({ ...payload, _id: initialData._id, id: initialData.id });
        } else {
            result = await addBrickTest(payload);
        }

        if (result && result.success) {
            alert("Report Saved Successfully!");
            onBack();
        } else {
            alert("Save Failed: " + (result?.message || "Unknown Error"));
        }
    };

    return (
        <div className="form-container fade-in">
            <div className="page-header">
                <button className="btn-link mb-4" onClick={onBack}>← Back to List</button>
                <h1>{initialData ? 'Edit' : 'Add'} Block / Brick Test</h1>
                <p className="text-muted">Record quality tests for blocks and bricks.</p>
            </div>

            <div className="form-card card">
                <form onSubmit={handleSubmit}>
                    <div className="form-section">
                        <h3 className="section-title">Material Details</h3>
                        <div className="form-group">
                            <label>Project / Site Location</label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g. Site Store"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Site Photo (Optional)</label>
                            <div className="image-upload-wrapper">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="file-input"
                                    id="site-photo"
                                />
                                <label htmlFor="site-photo" className="file-label">
                                    {formData.image ? 'Change Photo' : '📷 Upload Photo'}
                                </label>
                                {formData.image && (
                                    <div className="image-preview">
                                        <img src={formData.image} alt="Preview" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid-2">
                            <div className="form-group">
                                <label>Supplier Name</label>
                                <input
                                    type="text"
                                    name="supplier"
                                    value={formData.supplier}
                                    onChange={handleChange}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Test Date</label>
                                <input
                                    type="date"
                                    name="testDate"
                                    value={formData.testDate}
                                    onChange={handleChange}
                                    className="form-input"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid-2">
                            <div className="form-group">
                                <label>Block / Brick Type</label>
                                <select
                                    name="blockType"
                                    value={formData.blockType}
                                    onChange={handleChange}
                                    className="form-input"
                                >
                                    <option value="AAC Block">AAC Block</option>
                                    <option value="Red Brick">Red Brick (Clay)</option>
                                    <option value="Fly Ash Brick">Fly Ash Brick</option>
                                    <option value="Concrete Block">Concrete Block (Solid/Hollow)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Size (LxWxH)</label>
                                <input
                                    type="text"
                                    name="size"
                                    value={formData.size}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="e.g. 600x200x150 mm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3 className="section-title">Test Results</h3>

                        <div className="form-group mb-4">
                            <label className="text-lg font-semibold">Overall Result Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="form-input"
                                style={{
                                    borderColor: formData.status === 'Pass' ? '#22c55e' : '#ef4444',
                                    color: formData.status === 'Pass' ? '#15803d' : '#b91c1c',
                                    fontWeight: 'bold',
                                    backgroundColor: formData.status === 'Pass' ? '#f0fdf4' : '#fef2f2'
                                }}
                            >
                                <option value="Pass">Pass</option>
                                <option value="Fail">Fail</option>
                            </select>
                        </div>

                        <div className="grid-2">
                            <div className="form-group">
                                <label>Compressive Strength (N/mm²)</label>
                                <input
                                    type="number"
                                    name="results.compressiveStrength"
                                    value={formData.results.compressiveStrength}
                                    onChange={handleChange}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Water Absorption (%)</label>
                                <input
                                    type="number"
                                    name="results.waterAbsorption"
                                    value={formData.results.waterAbsorption}
                                    onChange={handleChange}
                                    className="form-input"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Remarks</label>
                            <textarea
                                name="results.remarks"
                                value={formData.results.remarks}
                                onChange={handleChange}
                                className="form-input"
                                rows="3"
                            ></textarea>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={onBack}>Cancel</button>
                        <button type="submit" className="btn btn-primary btn-lg">Save Report</button>
                    </div>
                </form>
            </div>

            <style>{`
                .form-container {
                    max-width: 800px;
                    margin: 0 auto;
                }

                .form-card {
                    padding: 32px;
                    background: white;
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-md);
                }

                .form-section {
                    margin-bottom: 32px;
                }

                .section-title {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: var(--text-color);
                    margin-bottom: 16px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid var(--border-color);
                }

                .grid-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 20px;
                }

                .form-group {
                    margin-bottom: 20px;
                }

                .form-group label {
                    display: block;
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: var(--text-color);
                    margin-bottom: 8px;
                }

                .form-input {
                    width: 100%;
                    padding: 12px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    font-size: 1rem;
                    transition: all 0.2s;
                    background: #f9fafb;
                }

                .form-input:focus {
                    background: white;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                    outline: none;
                }

                .image-upload-wrapper {
                    border: 2px dashed var(--border-color);
                    padding: 20px;
                    border-radius: var(--radius-md);
                    text-align: center;
                    transition: all 0.2s;
                }

                .image-upload-wrapper:hover {
                    border-color: var(--primary-color);
                    background: #f0f9ff;
                }

                .file-input {
                    display: none;
                }

                .file-label {
                    display: inline-block;
                    padding: 8px 16px;
                    background: white;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    font-weight: 500;
                    color: var(--text-color);
                    transition: all 0.2s;
                }

                .file-label:hover {
                    background: var(--bg-secondary);
                    border-color: var(--text-light);
                }

                .image-preview {
                    margin-top: 16px;
                    max-width: 200px;
                    margin-left: auto;
                    margin-right: auto;
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    box-shadow: var(--shadow-sm);
                }

                .image-preview img {
                    width: 100%;
                    height: auto;
                    display: block;
                }

                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 16px;
                    padding-top: 20px;
                    border-top: 1px solid var(--border-color);
                }

                .btn-lg {
                    padding: 12px 24px;
                    font-size: 1.05rem;
                }
            `}</style>
        </div>
    );
};

export default BrickTestForm;

import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { checkPermission } from '../../utils/permissions';

const SteelTestForm = ({ onBack, initialData }) => {
    const { addSteelTest, updateSteelTest, currentUser } = useData();
    const permission = checkPermission(currentUser, 'report');
    const [formData, setFormData] = useState({
        location: '',
        supplier: '',
        diameter: '',
        grade: 'Fe500',
        batchNumber: '',
        testDate: new Date().toISOString().split('T')[0],
        image: null,
        results: {
            yieldStrength: '',
            ultimateStrength: '',
            elongation: '',
            bendTest: 'Pass',
            overall: 'Pass'
        }
    });

    // Load initial data if editing
    React.useEffect(() => {
        if (initialData) {
            let safeData = initialData.data || {};
            // Fix: Parse if string to avoid blank fields on reload
            if (typeof safeData === 'string') {
                try { safeData = JSON.parse(safeData); } catch (e) { safeData = {}; }
            }

            setFormData({
                ...initialData,
                testDate: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                // Map top-level or data-level fields correctly
                location: initialData.location || '',
                diameter: safeData.diameter || initialData.diameter || '',
                grade: safeData.grade || initialData.grade || 'Fe500',
                supplier: safeData.supplier || initialData.supplier || '',
                batchNumber: safeData.batchNumber || initialData.batchNumber || '',
                image: initialData.image || null,
                results: safeData.results || {
                    yieldStrength: '',
                    ultimateStrength: '',
                    elongation: '',
                    bendTest: 'Pass',
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
        // Permission Check for Data Entry - Block if result already submitted/passed
        if (permission === 'data_entry' && initialData) {
            const isDone = formData.results.yieldStrength || formData.status === 'Pass' || formData.status === 'Fail';
            // If already has status or result, block editing
            if (initialData.status === 'Pass' || initialData.status === 'Fail' || (initialData.status === 'Tested')) {
                alert("Data Entry users cannot edit submitted test reports.");
                return;
            }
        }

        console.log("Submitting form...");

        // Validation commented out to debug user issue
        // const missingFields = [];
        // if (!formData.location) missingFields.push("Location");
        // if (!formData.diameter) missingFields.push("Diameter");

        // if (missingFields.length > 0) {
        //     alert(`Please fill in required fields: ${missingFields.join(', ')}`);
        //     window.scrollTo({ top: 0, behavior: 'smooth' });
        //     return;
        // }

        // Determine Status based on results
        const isPass = formData.results.bendTest === 'Pass';
        // You could add logic here for strength limits if needed, currently manual
        const finalStatus = isPass ? 'Pass' : 'Fail';

        const payload = {
            ...formData,
            // Ensure data structure matches backend expectation
            date: formData.testDate,
            status: finalStatus,
            data: {
                diameter: formData.diameter,
                grade: formData.grade,
                supplier: formData.supplier,
                batchNumber: formData.batchNumber,
                results: formData.results
            }
        };

        let result;
        if (initialData) {
            result = await updateSteelTest({ ...payload, _id: initialData._id, id: initialData.id });
        } else {
            result = await addSteelTest(payload);
        }

        console.log("Save Result:", result);

        if (result && result.success) {
            alert("Report Saved Successfully!");
            onBack();
        } else {
            alert("Save Failed: " + (result?.message || "Unknown network error"));
        }
    };

    return (
        <div className="form-container fade-in">
            <div className="page-header">
                <button className="btn-link mb-4" onClick={onBack}>← Back to List</button>
                <h1>Add Steel Reinforcement Test</h1>
                <p className="text-muted">Record test results for steel bars.</p>
            </div>

            <div className="form-card card">
                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-section">
                        <h3 className="section-title">Material Details</h3>
                        <div className="form-group">
                            <label>Location / Member</label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g. Slab S1"
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
                                <label>Batch / Heat No.</label>
                                <input
                                    type="text"
                                    name="batchNumber"
                                    value={formData.batchNumber}
                                    onChange={handleChange}
                                    className="form-input"
                                />
                            </div>
                        </div>

                        <div className="grid-3">
                            <div className="form-group">
                                <label>Diameter (mm)</label>
                                <input
                                    type="number"
                                    name="diameter"
                                    value={formData.diameter}
                                    onChange={handleChange}
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Grade</label>
                                <select
                                    name="grade"
                                    value={formData.grade}
                                    onChange={handleChange}
                                    className="form-input"
                                >
                                    <option value="Fe415">Fe415</option>
                                    <option value="Fe500">Fe500</option>
                                    <option value="Fe500D">Fe500D</option>
                                    <option value="Fe550">Fe550</option>
                                </select>
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
                    </div>

                    <div className="form-section">
                        <h3 className="section-title">Test Results</h3>
                        <div className="grid-2">
                            <div className="form-group">
                                <label>Yield Strength (N/mm²)</label>
                                <input
                                    type="number"
                                    name="results.yieldStrength"
                                    value={formData.results.yieldStrength}
                                    onChange={handleChange}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Ultimate Strength (N/mm²)</label>
                                <input
                                    type="number"
                                    name="results.ultimateStrength"
                                    value={formData.results.ultimateStrength}
                                    onChange={handleChange}
                                    className="form-input"
                                />
                            </div>
                        </div>

                        <div className="grid-2">
                            <div className="form-group">
                                <label>% Elongation</label>
                                <input
                                    type="number"
                                    name="results.elongation"
                                    value={formData.results.elongation}
                                    onChange={handleChange}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Bend Test</label>
                                <select
                                    name="results.bendTest"
                                    value={formData.results.bendTest}
                                    onChange={handleChange}
                                    className="form-input"
                                    style={{
                                        color: formData.results.bendTest === 'Pass' ? '#166534' :
                                            formData.results.bendTest === 'Fail' ? '#dc2626' : 'inherit',
                                        fontWeight: '600',
                                        borderColor: formData.results.bendTest === 'Pass' ? '#bbf7d0' :
                                            formData.results.bendTest === 'Fail' ? '#fecaca' : 'var(--border-color)',
                                        backgroundColor: formData.results.bendTest === 'Pass' ? '#f0fdf4' :
                                            formData.results.bendTest === 'Fail' ? '#fef2f2' : 'white'
                                    }}
                                >
                                    <option value="Pass">Pass</option>
                                    <option value="Fail">Fail</option>
                                </select>
                            </div>
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

                .grid-3 {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
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

export default SteelTestForm;

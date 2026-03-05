import React, { useState } from 'react';
import { useData } from '../../context/DataContext';

const ConcreteTestForm = ({ onBack, initialData }) => {
    const { addConcreteTest, updateConcreteTest } = useData();
    console.log("ConcreteTestForm Rendered", { initialData, addConcreteTest });

    const [formData, setFormData] = useState(() => {
        const data = initialData || {};
        return {
            location: data.location || '',
            castingDate: data.date ? new Date(data.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            grade: data.data?.grade || data.grade || 'M25',
            mixReference: data.data?.mixReference || data.mixReference || '',
            numCubes: data.data?.numCubes || data.numCubes || 3,
            remarks: data.data?.remarks || data.remarks || '',
            image: data.image || null
        };
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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


    // ...
    const handleSubmit = async (e) => {
        e.preventDefault();

        let result;
        if (initialData && (initialData._id || initialData.id)) {
            const id = initialData._id || initialData.id;
            // Merge existing data just in case, though form should have it all
            result = await updateConcreteTest({ ...formData, id });
        } else {
            result = await addConcreteTest(formData);
        }

        if (result && result.success) {
            onBack();
        } else {
            alert(result?.message || 'Failed to save test.');
        }
    };

    // Calculate dates for preview
    const castingDate = new Date(formData.castingDate);
    const day7 = new Date(castingDate); day7.setDate(castingDate.getDate() + 7);
    const day14 = new Date(castingDate); day14.setDate(castingDate.getDate() + 14);
    const day28 = new Date(castingDate); day28.setDate(castingDate.getDate() + 28);

    return (
        <div className="form-container fade-in">
            <div className="page-header">
                <button className="btn-link mb-4" onClick={onBack}>← Back to List</button>
                <h1>Add Concrete Cube Test</h1>
                <p className="text-muted">Schedule a new concrete quality test.</p>
            </div>

            <div className="form-card card">
                <form onSubmit={handleSubmit}>
                    <div className="form-section">
                        <h3 className="section-title">Site Details</h3>
                        <div className="form-group">
                            <label>Location / Element</label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g. Block A, First Floor Slab"
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
                    </div>

                    <div className="form-section">
                        <h3 className="section-title">Casting Information</h3>
                        <div className="grid-2">
                            <div className="form-group">
                                <label>Casting Date</label>
                                <input
                                    type="date"
                                    name="castingDate"
                                    value={formData.castingDate}
                                    onChange={handleChange}
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Concrete Grade</label>
                                <select
                                    name="grade"
                                    value={formData.grade}
                                    onChange={handleChange}
                                    className="form-input"
                                >
                                    <option value="M10">M10</option>
                                    <option value="M15">M15</option>
                                    <option value="M20">M20</option>
                                    <option value="M25">M25</option>
                                    <option value="M30">M30</option>
                                    <option value="M35">M35</option>
                                    <option value="M40">M40</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid-2">
                            <div className="form-group">
                                <label>Mix Reference</label>
                                <input
                                    type="text"
                                    name="mixReference"
                                    value={formData.mixReference}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="e.g. Design Mix / Nominal"
                                />
                            </div>
                            <div className="form-group">
                                <label>No. of Cubes</label>
                                <input
                                    type="number"
                                    name="numCubes"
                                    value={formData.numCubes}
                                    onChange={handleChange}
                                    className="form-input"
                                    min="1"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Date Preview */}
                    <div className="date-preview-box">
                        <h4 className="preview-title">📅 Scheduled Test Dates</h4>
                        <div className="date-grid">
                            <div className="date-item">
                                <span className="date-label">7 Days</span>
                                <span className="date-value">{day7.toLocaleDateString()}</span>
                            </div>
                            <div className="date-item">
                                <span className="date-label">14 Days</span>
                                <span className="date-value">{day14.toLocaleDateString()}</span>
                            </div>
                            <div className="date-item">
                                <span className="date-label">28 Days</span>
                                <span className="date-value">{day28.toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={onBack}>Cancel</button>
                        <button type="submit" className="btn btn-primary btn-lg">Save & Schedule</button>
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

                .date-preview-box {
                    background: #eff6ff;
                    border: 1px solid #dbeafe;
                    border-radius: var(--radius-lg);
                    padding: 20px;
                    margin-bottom: 32px;
                }

                .preview-title {
                    color: #1e40af;
                    font-size: 1rem;
                    font-weight: 600;
                    margin-bottom: 16px;
                }

                .date-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                }

                .date-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    background: white;
                    padding: 12px;
                    border-radius: var(--radius-md);
                    box-shadow: var(--shadow-sm);
                }

                .date-label {
                    font-size: 0.8rem;
                    color: #6b7280;
                    margin-bottom: 4px;
                }

                .date-value {
                    font-weight: 600;
                    color: #1f2937;
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

export default ConcreteTestForm;

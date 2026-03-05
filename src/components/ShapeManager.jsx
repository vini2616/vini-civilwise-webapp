import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import ShapeVisualizer from './ShapeVisualizer';

const ShapeManager = ({ onNavigate }) => {
    // Optimized Shape Manager - Force HMR Update
    const { customShapes, addCustomShape, updateCustomShape, deleteCustomShape, restoreDefaultShapes } = useData();
    const [view, setView] = useState('list'); // 'list' or 'form'
    const [editingId, setEditingId] = useState(null);

    // Form State for Segment-Based Shape
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        segments: [], // { label, multiplier }
        deductions: { 45: 0, 90: 0, 135: 0, 180: 0 } // Counts for each angle
    });

    // Segment Management
    const addSegment = () => {
        const nextLabel = String.fromCharCode(65 + formData.segments.length); // A, B, C...
        setFormData({
            ...formData,
            segments: [...formData.segments, { label: nextLabel, multiplier: 1 }]
        });
    };

    const updateSegment = (index, field, value) => {
        const newSegments = [...formData.segments];
        newSegments[index][field] = value;
        setFormData({ ...formData, segments: newSegments });
    };

    const removeSegment = (index) => {
        const newSegments = formData.segments.filter((_, i) => i !== index);
        // Re-label segments
        const reLabeled = newSegments.map((s, i) => ({ ...s, label: String.fromCharCode(65 + i) }));
        setFormData({ ...formData, segments: reLabeled });
    };

    // Deduction Management
    const updateDeduction = (angle, value) => {
        setFormData(prev => ({
            ...prev,
            deductions: {
                ...prev.deductions,
                [angle]: value === '' ? '' : (parseInt(value) || 0)
            }
        }));
    };

    // Preview Generation
    const getPreviewText = () => {
        const segments = Array.isArray(formData.segments) ? formData.segments : [];
        const segText = segments.map(s => {
            let text = `${s.label}`;
            if (s.multiplier > 1) text += `(x${s.multiplier})`;
            return text;
        }).join(' + ');

        // Safely handle deductions
        let dedObj = formData.deductions;
        if (Array.isArray(dedObj)) {
            dedObj = {};
        }
        if (!dedObj || typeof dedObj !== 'object') dedObj = {};

        const allowedAngles = ['45', '90', '135', '180'];
        const dedText = Object.entries(dedObj)
            .filter(([angle, count]) => allowedAngles.includes(angle) && count > 0)
            .map(([angle, count]) => {
                const d = angle === '45' ? '1d' : angle === '90' ? '2d' : angle === '135' ? '3d' : '4d';
                return `${count}x${angle}°(${d})`;
            }).join(' + ');

        return `${segText}${dedText ? ' - (' + dedText + ')' : ''}`;
    };

    const handleSave = async () => {
        if (!formData.name) {
            alert("Please enter a shape name");
            return;
        }
        if (formData.segments.length === 0) {
            alert("Please add at least one segment");
            return;
        }

        // Sanitize deductions for save
        const sanitizedDeductions = {};
        Object.entries(formData.deductions).forEach(([key, val]) => {
            sanitizedDeductions[key] = val === '' ? 0 : (parseInt(val) || 0);
        });

        const shapeData = {
            id: editingId,
            name: formData.name,
            description: formData.description,
            type: 'SEGMENT_BASED',
            segments: formData.segments,
            deductions: sanitizedDeductions
        };

        try {
            let result;
            if (editingId) {
                result = await updateCustomShape(shapeData);
            } else {
                result = await addCustomShape(shapeData);
            }

            if (result && result.success) {
                resetForm();
                setView('list');
            } else {
                alert("Failed to save shape: " + (result?.message || "Unknown error"));
            }
        } catch (error) {
            console.error("Save Error:", error);
            alert("An error occurred while saving: " + error.message);
        }
    };

    const handleEdit = (shape) => {
        console.log("Editing Shape Data:", shape);
        if (shape.type === 'SEGMENT_BASED' || !shape.type) { // Default to SEGMENT_BASED if missing

            // Robust parsing for deductions
            let safeDeductions = shape.deductions;
            if (typeof safeDeductions === 'string') {
                try { safeDeductions = JSON.parse(safeDeductions); } catch (e) { safeDeductions = {}; }
            }
            if (Array.isArray(safeDeductions) || !safeDeductions || typeof safeDeductions !== 'object') {
                safeDeductions = {};
            }

            // Clean keys
            const cleanDeductions = { 45: 0, 90: 0, 135: 0, 180: 0 };
            ['45', '90', '135', '180'].forEach(angle => {
                if (safeDeductions[angle] !== undefined && safeDeductions[angle] !== null) {
                    cleanDeductions[angle] = parseInt(safeDeductions[angle]) || 0;
                }
            });

            // Robust parsing for segments
            let safeSegments = shape.segments;
            if (typeof safeSegments === 'string') {
                try { safeSegments = JSON.parse(safeSegments); } catch (e) { safeSegments = []; }
            }
            if (!Array.isArray(safeSegments)) safeSegments = [];

            setFormData({
                name: shape.name,
                description: shape.description || '',
                segments: safeSegments,
                deductions: cleanDeductions
            });
            setEditingId(shape._id || shape.id);
            setView('form');
        } else {
            alert("Only Segment-Based shapes can be edited in this builder.");
        }
    };

    const resetForm = () => {
        setFormData({ name: '', description: '', segments: [], deductions: { 45: 0, 90: 0, 135: 0, 180: 0 } });
        setEditingId(null);
    };

    return (
        <div className="shape-manager-container">
            <div className="header-actions">
                <div className="flex items-center gap-4">
                    <button className="btn-back" onClick={() => onNavigate('estimation')}>← Back</button>
                    <h2>Advanced Shape Builder</h2>
                </div>
                <div className="actions">
                    {view === 'list' && (
                        <>
                            {/* <button onClick={restoreDefaultShapes} className="btn btn-secondary">Restore Defaults</button> */}
                            <button onClick={() => setView('form')} className="btn btn-primary">+ Create New Shape</button>
                        </>
                    )}
                    {view === 'form' && (
                        <button onClick={() => { setView('list'); resetForm(); }} className="btn btn-secondary">Cancel</button>
                    )}
                </div>
            </div>

            {view === 'list' ? (
                <div className="shapes-grid">
                    {customShapes.map(shape => (
                        <div key={shape._id || shape.id} className="shape-card">
                            <div className="shape-icon">{shape.image || '✏️'}</div>
                            <div className="shape-info">
                                <h3>{shape.name}</h3>
                                <p>{shape.description}</p>
                                <span className="badge">{shape.type === 'SEGMENT_BASED' ? 'Segment Based' : 'Formula Based'}</span>
                            </div>
                            <div className="shape-actions">
                                <button onClick={() => handleEdit(shape)} className="btn-icon">✏️</button>
                                <button onClick={() => deleteCustomShape(shape._id || shape.id)} className="btn-icon delete">🗑️</button>
                            </div>
                        </div>
                    ))}
                    {customShapes.length === 0 && <p className="empty-state">No custom shapes found. Create one or restore defaults.</p>}
                </div>
            ) : (
                <div className="shape-builder-form">
                    <div className="scrollable-content">
                        <div className="form-section">
                            <label>Shape Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Chair Bar"
                            />
                        </div>
                        <div className="form-section">
                            <label>Description</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description of the shape"
                            />
                        </div>

                        <div className="form-section">
                            <label>Formula Preview</label>
                            <div className="p-2 bg-gray-50 border rounded text-lg font-mono text-blue-600">
                                {(formData.segments && formData.segments.length > 0) ? getPreviewText() : 'Add segments to see formula'}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Auto-calculated based on segments and deductions.</p>
                        </div>

                        <div className="builder-grid">
                            <div className="segments-column">
                                <div className="section-header">
                                    <h3>Segments</h3>
                                    <button onClick={addSegment} className="btn btn-sm btn-primary">+ Add Segment</button>
                                </div>
                                <div className="segments-list">
                                    {Array.isArray(formData.segments) && formData.segments.map((segment, index) => (
                                        <div key={index} className="segment-row">
                                            <div className="drag-handle">::</div>
                                            <div className="field-group">
                                                <label>Label</label>
                                                <input
                                                    type="text"
                                                    value={segment.label}
                                                    onChange={e => updateSegment(index, 'label', e.target.value)}
                                                    className="input-sm"
                                                />
                                            </div>
                                            <div className="field-group">
                                                <label>Multiplier</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={segment.multiplier}
                                                    onChange={e => updateSegment(index, 'multiplier', parseInt(e.target.value) || 1)}
                                                    className="input-sm"
                                                />
                                            </div>
                                            <button onClick={() => removeSegment(index)} className="btn-icon delete">×</button>
                                        </div>
                                    ))}
                                    {(!formData.segments || formData.segments.length === 0) && <p className="text-muted">No segments added.</p>}
                                </div>
                            </div>

                            <div className="deductions-column">
                                <h3>Bend Deductions</h3>
                                <div className="deductions-form">
                                    <div className="deduction-row">
                                        <label>45° Bends (1d)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.deductions[45]}
                                            onChange={e => updateDeduction(45, e.target.value)}
                                        />
                                    </div>
                                    <div className="deduction-row">
                                        <label>90° Bends (2d)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.deductions[90]}
                                            onChange={e => updateDeduction(90, e.target.value)}
                                        />
                                    </div>
                                    <div className="deduction-row">
                                        <label>135° Bends (3d)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.deductions[135]}
                                            onChange={e => updateDeduction(135, e.target.value)}
                                        />
                                    </div>
                                    <div className="deduction-row">
                                        <label>180° Bends (4d)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.deductions[180]}
                                            onChange={e => updateDeduction(180, e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div> {/* End of scrollable-content */}

                    <div className="form-actions">
                        <button onClick={() => setView('list')} className="btn btn-secondary">Cancel</button>
                        <button onClick={handleSave} className="btn btn-primary">Save Shape</button>
                    </div>
                </div>
            )}

            <style>{`
                .shape-manager-container { padding: 20px; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                .header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .actions { display: flex; gap: 10px; }
                .btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; transition: all 0.2s; }
                .btn-primary { background: #3b82f6; color: white; }
                .btn-primary:hover { background: #2563eb; }
                .btn-secondary { background: #e2e8f0; color: #475569; }
                .btn-secondary:hover { background: #cbd5e1; }
                .btn-sm { padding: 4px 8px; font-size: 0.85rem; }
                
                .shapes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; }
                .shape-card { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; display: flex; align-items: center; gap: 15px; transition: transform 0.2s; }
                .shape-card:hover { transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
                .shape-icon { font-size: 2rem; background: #f1f5f9; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
                .shape-info { flex: 1; }
                .shape-info h3 { margin: 0 0 5px 0; font-size: 1.1rem; color: #1e293b; }
                .shape-info p { margin: 0; font-size: 0.9rem; color: #64748b; }
                .badge { display: inline-block; background: #dbeafe; color: #1e40af; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; margin-top: 5px; }
                .shape-actions { display: flex; flex-direction: column; gap: 5px; }
                .btn-icon { background: none; border: none; cursor: pointer; font-size: 1.1rem; padding: 4px; border-radius: 4px; }
                .btn-icon:hover { background: #f1f5f9; }
                .btn-icon.delete { color: #ef4444; }
                
                .shape-builder-form { 
                    display: flex;
                    flex-direction: column;
                    height: calc(100vh - 120px); /* Adjust based on header height */
                    max-width: 100%;
                }
                .scrollable-content {
                    flex: 1;
                    overflow-y: auto;
                    padding-right: 10px; /* Space for scrollbar */
                }
                .form-section { margin-bottom: 20px; }
                .form-section label { display: block; margin-bottom: 8px; font-weight: 600; color: #334155; }
                .form-section input { width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; transition: border 0.2s; }
                .form-section input:focus { border-color: #3b82f6; outline: none; }
                


                .builder-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-bottom: 20px; }
                .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
                .section-header h3 { margin: 0; font-size: 1.1rem; color: #334155; font-weight: 600; }
                
                .segments-list { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; min-height: 200px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
                .segment-row { display: flex; align-items: center; gap: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 10px; }
                .drag-handle { color: #94a3b8; cursor: grab; font-weight: bold; padding: 0 4px; }
                .field-group { flex: 1; }
                .field-group label { display: block; font-size: 0.75rem; color: #64748b; margin-bottom: 4px; uppercase; letter-spacing: 0.5px; }
                .input-sm { width: 100%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem; }
                
                .deductions-column h3 { margin: 0 0 12px 0; font-size: 1.1rem; color: #334155; font-weight: 600; }
                .deductions-form { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
                .deduction-row { margin-bottom: 15px; }
                .deduction-row label { display: block; font-size: 0.9rem; color: #475569; margin-bottom: 6px; }
                .deduction-row input { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; }
                
                .form-actions { 
                    display: flex; 
                    justify-content: flex-end; 
                    gap: 12px; 
                    margin-top: auto; /* Push to bottom */
                    padding-top: 20px; 
                    border-top: 1px solid #e2e8f0; 
                    background: #fff; 
                    position: sticky;
                    bottom: 0;
                    z-index: 10;
                    padding-bottom: 10px;
                }
                .empty-state { text-align: center; color: #94a3b8; padding: 60px 40px; font-style: italic; }
            `}</style>
        </div>
    );
};

export default ShapeManager;

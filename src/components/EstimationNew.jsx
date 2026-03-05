import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { checkPermission, canEnterData, canEditDelete } from '../utils/permissions';
import { generateEstimationPDF, generateOptimizationPDF } from '../utils/pdfGenerator';


// --- Helper: Bar Shapes & Calculations ---
const BAR_SHAPES = {
    STRAIGHT: { id: 'STRAIGHT', name: 'Straight Bar', image: '', fields: ['L'], bends: 0 },
    L_BEND: { id: 'L_BEND', name: 'L-Bend', image: '', fields: ['A', 'B'], bends: 1 },
    U_BEND: { id: 'U_BEND', name: 'U-Bend', image: '|_|', fields: ['A', 'B', 'C'], bends: 2 },
    STIRRUP: { id: 'STIRRUP', name: 'Rect. Stirrup', image: '', fields: ['A', 'B'], bends: 3 }, // Usually 3 bends for a closed stirrup + hooks
    CUSTOM: { id: 'CUSTOM', name: 'Custom Shape', image: '', fields: [], bends: 0 } // Dynamic
};

const calculateCuttingLength = (shapeId, dims, dia, customBends = 0, customShapeDef = null) => {
    const d = parseFloat(dia) || 0;
    const values = Object.values(dims).map(v => parseFloat(v) || 0);

    // 1. Check if it's a Custom Defined Shape (from Shape Manager)
    if (customShapeDef) {
        if (customShapeDef.type === 'SEGMENT_BASED') {
            let totalLength = 0;
            let totalDeduction = 0;

            // Iterate over defined segments
            if (Array.isArray(customShapeDef.segments)) {
                customShapeDef.segments.forEach(seg => {
                    const label = seg.label;
                    // Get user input length for this segment (default to 0)
                    const inputLen = parseFloat(dims[label]) || 0;
                    const multiplier = parseFloat(dims[`${label}_mult`]) || parseFloat(seg.multiplier) || 1;

                    totalLength += inputLen * multiplier;
                });
            }

            // Calculate Deductions from separated object
            const safeDeductions = customShapeDef.deductions || {};
            if (typeof safeDeductions === 'object') {
                Object.entries(safeDeductions).forEach(([angle, count]) => {
                    const ang = parseFloat(angle) || 0;
                    const cnt = parseFloat(count) || 0;
                    let k = 0;
                    if (ang === 45) k = 1;
                    else if (ang === 90) k = 2;
                    else if (ang === 135) k = 3;
                    else if (ang === 180) k = 4;

                    totalDeduction += (k * d * cnt);
                });
            } else if (customShapeDef.bends && Array.isArray(customShapeDef.bends)) {
                // Legacy support
                customShapeDef.bends.forEach(bend => {
                    const angle = parseFloat(bend.angle) || 0;
                    const count = parseFloat(bend.count) || 0;
                    let k = 0;
                    if (angle === 45) k = 1;
                    else if (angle === 90) k = 2;
                    else if (angle === 135) k = 3;
                    else if (angle === 180) k = 4;

                    totalDeduction += (k * d * count);
                });
            }

            return Math.max(0, totalLength - totalDeduction);
        }

        // Legacy Formula Based (Keep for backward compatibility if needed, or remove)
        // Parse Formula
        let formula = customShapeDef.formula || '';
        if (!formula) return 0;

        // Replace variables with values
        Object.keys(dims).forEach(key => {
            const val = parseFloat(dims[key]) || 0;
            // Use regex to replace whole word matches of variables
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            formula = formula.replace(regex, val);
        });
        // Replace 'd' or 'D' with diameter
        formula = formula.replace(/\bd\b/gi, d);

        try {
            // Safe evaluation (basic math only)
            // eslint-disable-next-line no-new-func
            const length = new Function('return ' + formula)();

            // Apply Advanced Bend Deductions
            let totalDeduction = 0;
            if (customShapeDef.bends && Array.isArray(customShapeDef.bends)) {
                customShapeDef.bends.forEach(bend => {
                    const angle = parseFloat(bend.angle) || 0;
                    const count = parseFloat(bend.count) || 0;
                    let k = 0;
                    if (angle === 45) k = 1;
                    else if (angle === 90) k = 2;
                    else if (angle === 135) k = 3;
                    else if (angle === 180) k = 4;

                    totalDeduction += (k * d * count);
                });
            }

            return Math.max(0, (parseFloat(length) || 0) - totalDeduction);

        } catch (e) {
            console.error("Formula evaluation error", e);
            return 0;
        }
    }

    // 2. Standard Shapes Logic
    const sumDims = values.reduce((a, b) => a + b, 0);
    const k = 2; // Standard 90deg deduction
    let bends = 0;

    if (shapeId === 'CUSTOM') {
        // Handle Ad-hoc custom bends object { 45: count, 90: count... }
        if (typeof customBends === 'object' && customBends !== null) {
            let totalDeduction = 0;
            Object.entries(customBends).forEach(([angle, count]) => {
                const ang = parseInt(angle) || 0;
                const cnt = parseInt(count) || 0;
                let k = 0;
                if (ang === 45) k = 1;
                else if (ang === 90) k = 2;
                else if (ang === 135) k = 3;
                else if (ang === 180) k = 4;
                totalDeduction += (k * d * cnt);
            });
            return Math.max(0, sumDims - totalDeduction);
        } else {
            // Legacy fallback (just count of 90 deg)
            bends = parseInt(customBends) || 0;
        }
    } else {
        bends = BAR_SHAPES[shapeId]?.bends || 0;
        if (shapeId === 'STIRRUP') {
            const A = parseFloat(dims.A) || 0;
            const B = parseFloat(dims.B) || 0;
            return (2 * (A + B)) + (14 * d); // Hook allowance included? Or just perimeter + hooks
        }
    }

    const deduction = bends * k * d;
    return Math.max(0, sumDims - deduction);
};

const UNIT_WEIGHTS = {
    6: 0.222,
    8: 0.395,
    10: 0.617,
    12: 0.888,
    16: 1.58,
    20: 2.47,
    25: 3.85,
    32: 6.31
};

// --- Shape Visualizer Component ---
const ShapeVisualizer = ({ shape, dims, customShapeDef }) => {
    const size = 60;
    const padding = 5;
    const drawArea = size - 2 * padding;

    let path = '';
    const strokeWidth = 2;
    const color = '#3b82f6';

    const values = Object.values(dims).map(v => parseFloat(v) || 0);
    const maxDim = Math.max(...values, 1);
    const scale = drawArea / maxDim;

    if (customShapeDef) {
        // Basic visualization for custom defined shapes
        // Just chaining segments for now as we don't store angles in variables yet for drawing
        let currentX = padding;
        let currentY = size - padding;
        path = `M ${currentX} ${currentY}`;

        // Alternating directions: Right, Up, Left, Down
        const directions = [{ dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }];

        customShapeDef.variables?.forEach((v, i) => {
            const val = (parseFloat(dims[v]) || 0) * scale;
            const dir = directions[i % 4];
            currentX += val * dir.dx;
            currentY += val * dir.dy;
            path += ` L ${currentX} ${currentY}`;
        });
        // Segment based visualization (simple chain)
        if (customShapeDef.type === 'SEGMENT_BASED') {
            customShapeDef.segments.forEach((seg, i) => {
                const val = (parseFloat(dims[seg.label]) || 0) * scale;
                const dir = directions[i % 4];
                currentX += val * dir.dx;
                currentY += val * dir.dy;
                path += ` L ${currentX} ${currentY}`;
            });
        }

    } else if (shape === 'STRAIGHT') {
        path = `M ${padding} ${size / 2} L ${size - padding} ${size / 2}`;
    } else if (shape === 'L_BEND') {
        const A = (parseFloat(dims.A) || 0) * scale;
        const B = (parseFloat(dims.B) || 0) * scale;
        path = `M ${padding} ${padding} L ${padding} ${padding + A} L ${padding + B} ${padding + A}`;
    } else if (shape === 'U_BEND') {
        const A = (parseFloat(dims.A) || 0) * scale;
        const B = (parseFloat(dims.B) || 0) * scale;
        const C = (parseFloat(dims.C) || 0) * scale;
        path = `M ${padding} ${padding} L ${padding} ${padding + A} L ${padding + B} ${padding + A} L ${padding + B} ${padding + A - C}`;
    } else if (shape === 'STIRRUP') {
        path = `M ${padding} ${padding} H ${size - padding} V ${size - padding} H ${padding} Z`;
    } else if (shape === 'CUSTOM') {
        path = `M ${padding} ${size / 2} L ${size - padding} ${size / 2}`;
    }

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

const OptimizationResults = ({ items, title, onBack, initialScrap = [], onSaveScrap }) => {
    const STOCK_LENGTH = 12; // meters
    const scrapStock = Array.isArray(initialScrap) ? initialScrap : []; // Use prop as source of truth
    const [scrapForm, setScrapForm] = React.useState({ dia: '', length: '', qty: '' });

    // Available diameters from items
    const availableDias = React.useMemo(() => [...new Set(items.map(i => i.dia))].sort((a, b) => a - b), [items]);

    const handleAddScrap = () => {
        if (!scrapForm.dia || !scrapForm.length || !scrapForm.qty) return;
        const newScrapItem = {
            id: Date.now(),
            dia: parseInt(scrapForm.dia),
            length: parseFloat(scrapForm.length),
            qty: parseInt(scrapForm.qty)
        };
        const updatedScrap = [...scrapStock, newScrapItem];
        if (onSaveScrap) onSaveScrap(updatedScrap);
        setScrapForm({ dia: '', length: '', qty: '' });
    };

    const handleRemoveScrap = (id) => {
        const updatedScrap = scrapStock.filter(s => s.id !== id);
        if (onSaveScrap) onSaveScrap(updatedScrap);
    };

    // Group by Diameter
    // Group by Diameter
    const byDia = items.reduce((acc, item) => {
        if (!acc[item.dia]) acc[item.dia] = [];
        // Add each bar individually
        const count = item.noMembers * item.barsPerMember;
        for (let i = 0; i < count; i++) {
            let remainingLen = item.cuttingLength;
            let partCount = 1;
            while (remainingLen > 0) {
                const currentLen = Math.min(remainingLen, STOCK_LENGTH);
                acc[item.dia].push({
                    ...item,
                    cuttingLength: currentLen,
                    id: `${item.barMark}-${i}-p${partCount}`,
                    originalMark: item.barMark
                });
                remainingLen -= currentLen;
                // Avoid infinite loop for tiny remainders (float precision)
                if (remainingLen < 0.0001) remainingLen = 0;
                partCount++;
            }
        }
        return acc;
    }, {});

    // Optimize (First Fit Decreasing)
    const results = {};
    let totalStockUsed = 0;
    let totalWaste = 0;

    Object.keys(byDia).sort((a, b) => b - a).forEach(dia => {
        const bars = byDia[dia].sort((a, b) => b.cuttingLength - a.cuttingLength);
        const stockBars = [];

        // Initialize with Scrap for this diameter
        const diaScrap = scrapStock.filter(s => s.dia == dia);
        diaScrap.forEach(s => {
            for (let i = 0; i < s.qty; i++) {
                stockBars.push({
                    id: `Scrap-${s.id}-${i}`,
                    isScrap: true,
                    length: s.length,
                    cuts: [],
                    remaining: s.length
                });
            }
        });
        // Sort scrap by length (smallest first to use up small scraps? or largest? FFD usually works best with large bins, 
        // but for scrap we want to get rid of it. Let's try Best Fit strategy implied by FFD on existing bins.)
        // Actually, let's keep them as added.

        bars.forEach(bar => {
            let placed = false;
            for (let stock of stockBars) {
                if (stock.remaining >= bar.cuttingLength) {
                    stock.cuts.push(bar);
                    stock.remaining -= bar.cuttingLength;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                stockBars.push({
                    id: stockBars.length + 1,
                    isScrap: false,
                    length: STOCK_LENGTH,
                    cuts: [bar],
                    remaining: STOCK_LENGTH - bar.cuttingLength
                });
            }
        });

        results[dia] = stockBars;
        // Count only standard stock bars for usage stat
        totalStockUsed += stockBars.filter(s => !s.isScrap).length;
        totalWaste += stockBars.reduce((sum, s) => sum + s.remaining, 0);
    });

    const handleExportCSV = () => {
        let csv = "Diameter,Stock Bar Range,Qty,Cutting Pattern,Waste (m),Assigned Marks\n";

        Object.keys(results).sort((a, b) => b - a).forEach(dia => {
            // Grouping Logic (same as UI)
            const groupedStocks = results[dia].reduce((acc, stock, i) => {
                const cutsKey = stock.cuts.map(c => c.cuttingLength.toFixed(3)).sort().join(';');
                const key = `${stock.isScrap}-${stock.length}-${stock.remaining.toFixed(4)}-${cutsKey}`;
                const last = acc[acc.length - 1];
                if (last && last.key === key) {
                    last.count++;
                    last.stocks.push(stock);
                } else {
                    acc.push({ key, stocks: [stock], count: 1, startIndex: i + 1 });
                }
                return acc;
            }, []);

            groupedStocks.forEach(group => {
                const isScrap = group.stocks[0].isScrap;
                const range = isScrap
                    ? `Old Stock (${group.stocks[0].length}m)`
                    : (group.count > 1 ? `${group.startIndex}-${group.startIndex + group.count - 1}` : group.startIndex);

                // Pattern String
                const patternCounts = {};
                group.stocks[0].cuts.forEach(c => {
                    const len = c.cuttingLength.toFixed(3);
                    patternCounts[len] = (patternCounts[len] || 0) + 1;
                });
                const patternStr = Object.entries(patternCounts)
                    .map(([len, count]) => `${len}m (x${count})`)
                    .join(' + ');

                // Marks
                const allMarks = [...new Set(group.stocks.flatMap(s => s.cuts.map(c => c.barMark)))].sort().join('; ');

                // Escape quotes for CSV
                const safePattern = `"${patternStr}"`;
                const safeMarks = `"${allMarks}"`;

                csv += `${dia},${range},${group.count},${safePattern},${group.stocks[0].remaining.toFixed(3)},${safeMarks}\n`;
            });
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'optimization_results.csv';
        a.click();
    };

    const handleDownloadPDF = () => {
        generateOptimizationPDF(title, results, totalStockUsed, totalWaste);
    };

    return (
        <div className="estimation-container">
            <div className="header-actions">
                <div className="flex items-center gap-4">
                    <button className="btn-back" onClick={onBack}>← Back to Estimate</button>
                    <h2>Optimization Results</h2>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-secondary" onClick={handleDownloadPDF}>Download PDF</button>
                    <button className="btn btn-primary" onClick={handleExportCSV}>Export to Excel (CSV)</button>
                </div>
            </div>
            <div className="card mb-4">
                <h3 className="mb-2">Manage Old Stock / Scrap</h3>
                <div className="flex gap-2 items-end mb-4">
                    <div className="form-group mb-0">
                        <label>Diameter</label>
                        <select
                            className="form-control"
                            value={scrapForm.dia}
                            onChange={e => setScrapForm({ ...scrapForm, dia: e.target.value })}
                        >
                            <option value="">Select</option>
                            {availableDias.map(d => <option key={d} value={d}>{d}mm</option>)}
                        </select>
                    </div>
                    <div className="form-group mb-0">
                        <label>Length (m)</label>
                        <input
                            type="number"
                            className="form-control"
                            step="0.01"
                            value={scrapForm.length}
                            onChange={e => setScrapForm({ ...scrapForm, length: e.target.value })}
                        />
                    </div>
                    <div className="form-group mb-0">
                        <label>Quantity</label>
                        <input
                            type="number"
                            className="form-control"
                            value={scrapForm.qty}
                            onChange={e => setScrapForm({ ...scrapForm, qty: e.target.value })}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={handleAddScrap}>Add Scrap</button>
                </div>
                {scrapStock.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {scrapStock.map(s => (
                            <span key={s.id} className="badge bg-gray-200 text-gray-800 flex items-center gap-2">
                                {s.dia}mm - {s.length}m ({s.qty} Nos)
                                <button onClick={() => handleRemoveScrap(s.id)} className="text-red-500 hover:text-red-700">×</button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="card mb-4">
                <div className="flex justify-between">
                    <div><strong>Total New Stock Bars (12m):</strong> {totalStockUsed}</div>
                    <div><strong>Total Waste:</strong> {totalWaste.toFixed(3)} m</div>
                </div>
            </div>

            {Object.keys(results).sort((a, b) => b - a).map(dia => {
                const groupedStocks = results[dia].reduce((acc, stock, i) => {
                    // Group only by Length Pattern (ignore marks for grouping key)
                    const cutsKey = stock.cuts.map(c => c.cuttingLength.toFixed(3)).sort().join(';');
                    const key = `${stock.isScrap}-${stock.length}-${stock.remaining.toFixed(4)}-${cutsKey}`;

                    const last = acc[acc.length - 1];
                    if (last && last.key === key) {
                        last.count++;
                        last.stocks.push(stock);
                    } else {
                        acc.push({ key, stocks: [stock], count: 1, startIndex: i + 1 });
                    }
                    return acc;
                }, []);

                return (
                    <div key={dia} className="card mb-4">
                        <h3>Dia: {dia}mm</h3>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th style={{ width: '15%' }}>Stock Bar(s)</th>
                                        <th style={{ width: '8%', textAlign: 'center' }}>Qty</th>
                                        <th style={{ width: '40%' }}>How to Cut (Per Bar)</th>
                                        <th style={{ width: '12%' }}>Waste</th>
                                        <th style={{ width: '25%' }}>For Elements</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupedStocks.map((group, idx) => {
                                        // Generate Cutting Pattern Summary
                                        const patternCounts = {};
                                        group.stocks[0].cuts.forEach(c => {
                                            const len = c.cuttingLength.toFixed(3);
                                            patternCounts[len] = (patternCounts[len] || 0) + 1;
                                        });

                                        // Visual Tags for Cuts
                                        const cutTags = Object.entries(patternCounts).map(([len, count]) => (
                                            <div key={len} style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                marginRight: '8px',
                                                marginBottom: '4px',
                                                background: '#e0f2fe',
                                                border: '1px solid #bae6fd',
                                                borderRadius: '4px',
                                                padding: '2px 8px'
                                            }}>
                                                <span style={{ fontWeight: 'bold', color: '#0369a1', marginRight: '4px' }}>{len}m</span>
                                                <span style={{ fontSize: '0.85em', color: '#64748b' }}>x {count} pcs</span>
                                            </div>
                                        ));

                                        // Aggregate all marks
                                        const allMarks = [...new Set(group.stocks.flatMap(s => s.cuts.map(c => c.barMark)))].sort();
                                        const marksStr = allMarks.length > 8
                                            ? allMarks.slice(0, 8).join(', ') + ` +${allMarks.length - 8} more`
                                            : allMarks.join(', ');

                                        const isScrap = group.stocks[0].isScrap;
                                        const stockLen = group.stocks[0].length;
                                        const remaining = group.stocks[0].remaining.toFixed(3);

                                        // Color code waste
                                        const wasteColor = remaining > 1 ? '#ef4444' : remaining > 0.5 ? '#f59e0b' : '#22c55e';

                                        return (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ verticalAlign: 'middle' }}>
                                                    {isScrap ? (
                                                        <div className="flex flex-col">
                                                            <span className="badge bg-yellow-100 text-yellow-800 mb-1">Old Stock</span>
                                                            <span className="text-sm text-gray-500">{stockLen}m Len</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col">
                                                            <span style={{ fontWeight: '600', color: '#334155' }}>
                                                                #{group.count > 1 ? `${group.startIndex} - ${group.startIndex + group.count - 1}` : group.startIndex}
                                                            </span>
                                                            <span className="text-xs text-gray-400">Standard 12m</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <span style={{
                                                        background: '#f8fafc',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '50%',
                                                        width: '32px',
                                                        height: '32px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 'bold',
                                                        color: '#475569'
                                                    }}>
                                                        {group.count}
                                                    </span>
                                                </td>
                                                <td style={{ verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                                        {cutTags}
                                                    </div>
                                                </td>
                                                <td style={{ verticalAlign: 'middle' }}>
                                                    <span style={{ fontWeight: 'bold', color: wasteColor }}>{remaining} m</span>
                                                </td>
                                                <td style={{ verticalAlign: 'middle' }}>
                                                    <span className="text-sm text-gray-500" style={{ lineHeight: '1.2', display: 'block' }}>
                                                        {marksStr}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}

        </div>
    );
};
const Estimation = ({ onNavigate, pageData, setPageData, currentUser }) => {
    // Permission Check
    const permission = checkPermission(currentUser, 'estimation');
    const canAdd = canEnterData(permission);

    if (permission === 'no_access') {
        return (
            <div className="estimation-container text-center py-8">
                <h2 className="text-xl text-red-600">🚫 Access Denied</h2>
                <p className="text-muted">You do not have permission to view this module.</p>
                <button onClick={() => onNavigate('dashboard')} className="btn btn-outline mt-4">Go to Dashboard</button>
            </div>
        );
    }
    const {
        estimations, addEstimation, updateEstimation, deleteEstimation,
        customShapes,
        activeEstimationFolder,
        setActiveEstimationFolder
    } = useData();

    // State
    // Remove local activeFolder state, use context instead
    const activeFolder = activeEstimationFolder;
    const setActiveFolder = setActiveEstimationFolder;

    const [view, setView] = useState('list'); // 'list', 'detail', 'optimization'
    const [activeEstimation, setActiveEstimation] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '', type: 'steel' });

    const hasGeneralEditPerm = canEditDelete(permission); // General permission check
    // Check if the current ACTIVE estimation is editable
    const reportCreatedAt = activeEstimation?.createdAt || activeEstimation?.date;
    const canEditCurrent = !activeEstimation ? true : canEditDelete(permission, reportCreatedAt);

    // Use canEditCurrent for detail view actions, hasGeneralEditPerm for list view actions (if we want to be strict there too, we'd need per-item checks in the list)
    const canEdit = hasGeneralEditPerm; // Keep existing variable for general availability check if needed, but rely on canEditCurrent for active doc.

    // Concrete Estimation State
    const [concreteForm, setConcreteForm] = useState({
        shape: 'RECTANGLE',
        count: 1,
        dims: {}
    });

    const CONCRETE_SHAPES = {
        RECTANGLE: {
            label: 'Rectangle / Cube',
            fields: ['Length', 'Width', 'Depth']
        },
        TRAPEZOIDAL: {
            label: 'Trapezoidal Footing',
            fields: ['Top Length', 'Top Width', 'Bottom Length', 'Bottom Width', 'Depth']
        },
        CIRCULAR: {
            label: 'Circular / Cylinder',
            fields: ['Diameter', 'Depth']
        },
        AREA: {
            label: 'Area Based',
            fields: ['Area', 'Thickness']
        },
        TRIANGLE: {
            label: 'Triangle',
            fields: ['Base', 'Height', 'Depth']
        }
    };

    const calculateConcreteVolume = (shape, dims) => {
        let vol = 0;
        const d = (key) => parseFloat(dims[key]) || 0;

        switch (shape) {
            case 'RECTANGLE':
                vol = d('Length') * d('Width') * d('Depth');
                break;
            case 'TRAPEZOIDAL':
                const A1 = d('Top Length') * d('Top Width');
                const A2 = d('Bottom Length') * d('Bottom Width');
                const h = d('Depth');
                vol = (h / 3) * (A1 + A2 + Math.sqrt(A1 * A2));
                break;
            case 'CIRCULAR':
                const r = d('Diameter') / 2;
                vol = Math.PI * r * r * d('Depth');
                break;
            case 'AREA':
                vol = d('Area') * d('Thickness');
                break;
            case 'TRIANGLE':
                vol = 0.5 * d('Base') * d('Height') * d('Depth');
                break;
            default:
                vol = 0;
        }
        return vol;
    };

    // --- Masonry Logic ---
    const MASONRY_MATERIALS = {
        AAC: { label: 'AAC Block', l: 600, w: 200, h: 200 }, // mm
        RED_BRICK: { label: 'Red Brick', l: 190, w: 90, h: 90 },
        FLY_ASH: { label: 'Fly Ash Brick', l: 230, w: 110, h: 75 },
        CUSTOM: { label: 'Custom Size', l: 0, w: 0, h: 0 }
    };

    const CONCRETE_GRADES = {
        M10: '1:3:6',
        M15: '1:2:4',
        M20: '1:1.5:3',
        M25: '1:1:2',
        M30: 'Design Mix',
        M35: 'Design Mix',
        M40: 'Design Mix',
        CUSTOM: ''
    };

    const [masonryForm, setMasonryForm] = useState({
        material: 'AAC', // AAC, RED_BRICK, FLY_ASH, CUSTOM
        customDims: { l: 0, w: 0, h: 0 }, // mm
        wallDims: { l: 0, h: 0, t: 0 }, // meters (t in mm usually, but let's standardize) -> Let's ask user for Length(m), Height(m), Thickness(mm)
        mortarRatio: '1:6',
        mortarThickness: 10, // mm
        dimsIncludeMortar: false, // New flag
        manualQty: 0,
        isFixed: false, // New flag for locking dimensions
        deductions: [] // { l, h, count }
    });

    const [flooringForm, setFlooringForm] = useState({
        description: '',
        roomDims: { l: 0, w: 0 },
        manualArea: '', // Allow manual area input
        tileSize: '600x600', // mm
        beddingThickness: 50, // mm
        ratio: '1:6', // or CHEMICAL
        wastage: 5 // %
    });

    const [plasterForm, setPlasterForm] = useState({
        description: '',
        manualArea: '',
        wallDims: { l: 0, h: 0 },
        thickness: 12,
        ratio: '1:4',
        deductions: []
    });

    const calculateMasonry = (form) => {
        // 1. Get Material Dims (mm)
        // Always use customDims if available (since we allow editing for all materials now)
        // If customDims are 0, fallback to material defaults (though customDims should be populated)
        let matL = parseFloat(form.customDims?.l) || 0;
        let matW = parseFloat(form.customDims?.w) || 0;
        let matH = parseFloat(form.customDims?.h) || 0;

        // If dimensions include mortar (Nominal), we derive the Actual dimensions for mortar calc
        // by subtracting mortar thickness.
        // If dimensions are Actual, we add mortar thickness for count calc.
        const dimsIncludeMortar = form.dimsIncludeMortar || false;

        if (matL === 0 && matW === 0 && matH === 0) {
            const mat = MASONRY_MATERIALS[form.material];
            if (mat) {
                matL = mat.l;
                matW = mat.w;
                matH = mat.h;
            }
        }

        if (matL === 0 || matW === 0 || matH === 0) return { count: 0, vol: 0, mortar: 0 };

        // 2. Get Wall Dims
        const wallL = parseFloat(form.wallDims.l) || 0; // m
        const wallH = parseFloat(form.wallDims.h) || 0; // m
        const wallT = parseFloat(form.wallDims.t) || 0; // m

        if (wallL === 0 || wallH === 0 || wallT === 0) return { count: 0, vol: 0, mortar: 0 };

        // Convert Wall to Volume (m3)
        let wallVol = wallL * wallH * wallT;

        // Apply Deductions
        if (form.deductions && form.deductions.length > 0) {
            const deductionVol = form.deductions.reduce((sum, d) => {
                const dL = parseFloat(d.l) || 0;
                const dH = parseFloat(d.h) || 0;
                const dCount = parseFloat(d.count) || 0;
                return sum + (dL * dH * wallT * dCount);
            }, 0);
            wallVol = Math.max(0, wallVol - deductionVol);
        }

        // 3. Calculate with Mortar
        // 3. Calculate with Mortar
        // Standard mortar thickness ~10mm, Chemical ~3mm. Use user input if available.
        const mortarThick = parseFloat(form.mortarThickness) || parseFloat(formData.defaultMortarThickness) || ((form.mortarRatio === 'CHEMICAL') ? 3 : 10); // mm

        let effL, effW, effH;
        let actualL, actualW, actualH;

        if (dimsIncludeMortar) {
            // Inputs are Nominal (Effective)
            effL = matL;
            effW = matW;
            effH = matH;
            // Actual is Nominal - Mortar
            actualL = Math.max(0, matL - mortarThick);
            actualW = Math.max(0, matW - mortarThick);
            actualH = Math.max(0, matH - mortarThick);
        } else {
            // Inputs are Actual
            actualL = matL;
            actualW = matW;
            actualH = matH;

            // Determine Effective Dimensions for Unit Volume Calculation
            const tolerance = 5; // mm
            effL = matL + mortarThick;
            effW = matW + mortarThick;
            effH = matH + mortarThick;

            // Check if Wall Thickness matches any dimension
            // wallT is in meters, mat dims are in mm
            const wallTMm = wallT * 1000;
            if (Math.abs(wallTMm - matL) <= tolerance) {
                effL = matL;
            } else if (Math.abs(wallTMm - matW) <= tolerance) {
                effW = matW;
            } else if (Math.abs(wallTMm - matH) <= tolerance) {
                effH = matH;
            }
        }

        // Volume of one brick with mortar (mm3) -> convert to m3
        const volOneWithMortar = (effL * effW * effH) / 1000000000;

        // Number of bricks
        const count = Math.ceil(wallVol / volOneWithMortar);

        // Actual Volume of Bricks only (m3)
        const volBricks = (count * (actualL * actualW * actualH)) / 1000000000;

        // Mortar Volume (Wet) = Total Vol - Brick Vol
        // Mortar Volume (Wet) = Total Vol - Brick Vol
        const mortarWet = Math.max(0, wallVol - volBricks);

        let mortarDry = mortarWet * 1.33;
        let chemicalWeight = 0;
        let chemicalBags = 0;

        if (form.mortarRatio === 'CHEMICAL') {
            // Detailed Joint Calculation Method for Chemical Adhesive
            const jointThickM = mortarThick / 1000;
            const blockH_M = matH / 1000;
            const blockL_M = matL / 1000;

            // 1. Calculate Layers
            const layers = wallH / blockH_M; // Keep accurate float for volume, or use ceil? User example was exact.
            // Let's use exact volume approach based on joints.
            // But to match user Example:
            // "Number of Block Layers = 3.0/0.2 = 15 layers"
            // "Horizontal joints = 15 - 1 = 14"
            const numHorizJoints = Math.max(0, layers - 1); // Approximation for standard wall

            // Horizontal Joint Volume
            // Area of ONE Horiz Joint = Wall Length * Wall Thickness
            // Total Horiz Joint Vol = (WallL * WallT) * JointThick * NumHorizJoints
            const horizJointVol = (wallL * wallT) * jointThickM * numHorizJoints;

            // 2. Vertical Joints
            // "Blocks per layer = 44.0/0.6 = 73.33 -> 73 blocks"
            // "Vertical joints per layer = 73 - 1 = 72"
            const blocksPerLayer = wallL / blockL_M;
            const vertJointsPerLayer = Math.max(0, blocksPerLayer - 1);
            const totalVertJoints = vertJointsPerLayer * layers;

            // Vertical Joint Volume
            // Area of ONE Vert Joint = Block Height * Wall Thickness
            // Total Vert Joint Vol = Total Vert Joints * (BlockH * WallT * JointThick)
            const vertJointVol = totalVertJoints * (blockH_M * wallT * jointThickM);

            const totalAdhesiveVol = horizJointVol + vertJointVol;

            // Weight (Density 1600 kg/m3)
            chemicalWeight = totalAdhesiveVol * 1600;
            mortarDry = 0;

            // Bags (Assuming 40kg bag standard, or let user know)
            chemicalBags = chemicalWeight / 40;
        }

        return {
            count: count,
            vol: wallVol,
            mortarWet: mortarWet,
            mortarDry: mortarDry,
            chemicalWeight: chemicalWeight,
            chemicalBags: chemicalBags
        };
    };

    // Restore state from pageData if available
    useEffect(() => {
        if (pageData && pageData.activeEstimationId && pageData.view === 'detail') {
            const estimation = estimations.find(e => (e._id || e.id) === pageData.activeEstimationId);
            if (estimation) {
                setActiveEstimation(estimation);
                setView('detail');
                if (estimation.type === 'masonry') {
                    setMasonryForm(prev => ({
                        ...prev,
                        material: estimation.defaultMaterial || 'AAC',
                        customDims: estimation.defaultCustomDims || { l: 0, w: 0, h: 0 },
                        mortarRatio: estimation.defaultMortarRatio || '1:6',
                        mortarThickness: estimation.defaultMortarThickness || 10,
                        dimsIncludeMortar: false
                    }));
                }
            }
            // Clear pageData to avoid sticking to this state if navigating back from elsewhere
            if (setPageData) {
                // We don't clear immediately to allow the restore to happen,
                // but we should clear it when going back to list or unmounting.
                // For now, we'll just rely on overwriting it when needed.
            }
        }
    }, [pageData, estimations]);



    const [editingEstId, setEditingEstId] = useState(null);

    const handleCreateClick = () => {
        setEditingEstId(null);
        if (activeFolder) {
            const type = activeFolder.toLowerCase();
            setFormData({
                title: '',
                description: '',
                type: type,
                defaultConcreteGrade: type === 'concrete' ? 'M20' : undefined,
                defaultConcreteRatio: type === 'concrete' ? '1:1.5:3' : undefined,
                defaultMaterial: type === 'masonry' ? 'AAC' : undefined,
                defaultMortarThickness: type === 'masonry' ? 10 : undefined,
                defaultPlasterRatio: type === 'plaster' ? '1:4' : undefined,
                defaultPlasterThickness: type === 'plaster' ? '12' : undefined
            });
        } else {
            setFormData({ title: '', description: '', type: 'steel' });
        }
        setShowModal(true);
    };

    const handleEditEstimation = (est) => {
        setEditingEstId(est._id || est.id);
        setFormData({
            title: est.title,
            description: est.description || '',
            type: est.type,
            defaultMaterial: est.defaultMaterial,
            defaultCustomDims: est.defaultCustomDims,
            defaultMortarRatio: est.defaultMortarRatio,
            defaultConcreteGrade: est.defaultConcreteGrade,
            defaultConcreteRatio: est.defaultConcreteRatio,
            defaultPlasterRatio: est.defaultPlasterRatio,
            defaultPlasterThickness: est.defaultPlasterThickness,
            defaultMortarThickness: est.defaultMortarThickness,
            defaultFlooringSize: est.defaultFlooringSize,      // Add Flooring Fields
            defaultBeddingThickness: est.defaultBeddingThickness,
            defaultFlooringRatio: est.defaultFlooringRatio,
            defaultFlooringWastage: est.defaultFlooringWastage,
            wallDims: { l: 0, h: 0, t: 0 }
        });
        setShowModal(true);
    };

    const handleCreateSubmit = (e) => {
        e.preventDefault();

        const dataToSave = {
            title: formData.title,
            description: formData.description,
            type: formData.type,
            defaultMaterial: formData.defaultMaterial,
            defaultCustomDims: formData.defaultCustomDims,
            defaultMortarRatio: formData.defaultMortarRatio,
            defaultConcreteGrade: formData.defaultConcreteGrade,
            defaultConcreteRatio: formData.defaultConcreteRatio,
            defaultPlasterRatio: formData.defaultPlasterRatio,
            defaultPlasterThickness: formData.defaultPlasterThickness,
            defaultMortarThickness: formData.defaultMortarThickness,
            defaultFlooringSize: formData.defaultFlooringSize,        // Add Flooring Fields
            defaultBeddingThickness: formData.defaultBeddingThickness,
            defaultFlooringRatio: formData.defaultFlooringRatio,
            defaultFlooringWastage: formData.defaultFlooringWastage
        };

        if (editingEstId) {
            const targetEst = estimations.find(est => (est.id == editingEstId || est._id == editingEstId));
            if (targetEst) {
                const estDate = targetEst.createdAt || targetEst.date;
                if (!canEditDelete(permission, estDate)) {
                    alert("You cannot edit this estimation (Time limit exceeded).");
                    return;
                }
            }
            updateEstimation(editingEstId, dataToSave);
        } else {
            addEstimation({
                ...dataToSave,
                items: [],
                date: new Date().toISOString()
            });
        }
        setShowModal(false);
        setEditingEstId(null);
    };

    const handleOpenEstimation = (estimation) => {
        setActiveEstimation(estimation);
        setView('detail');
        if (estimation.type === 'masonry') {
            setMasonryForm(prev => ({
                ...prev,
                material: estimation.defaultMaterial || 'AAC',
                customDims: estimation.defaultCustomDims || { l: 0, w: 0, h: 0 },
                wallDims: { l: 0, h: 0, t: 0 },
                mortarRatio: estimation.defaultMortarRatio || '1:6',
                mortarThickness: estimation.defaultMortarThickness || 10,
                dimsIncludeMortar: false
            }));
        }
    };

    const handleDeleteEstimation = (e, id) => {
        e.stopPropagation();

        const targetEst = estimations.find(est => (est.id == id || est._id == id));
        if (targetEst) {
            const estDate = targetEst.createdAt || targetEst.date;
            if (!canEditDelete(permission, estDate)) {
                alert("You cannot delete this estimation (Restricted access or Time limit exceeded).");
                return;
            }
        }
        const password = prompt("Enter password to delete:");
        if (password !== 'AlwaysVini') {
            alert("Incorrect password!");
            return;
        }
        if (window.confirm('Are you sure you want to delete this estimation?')) {
            deleteEstimation(id);
        }
    };

    // --- Detail View Logic ---
    const [itemForm, setItemForm] = useState({ description: '', unit: '', quantity: '', rate: '' });

    // Steel Form State
    const [steelForm, setSteelForm] = useState({
        barMark: '',
        description: '',
        shape: 'STRAIGHT', // Can be ID of custom shape
        dia: 8,
        dims: { L: 0 }, // Dynamic based on shape
        noMembers: 1,
        barsPerMember: 1,
        spacing: 150,
        spanLength: 0, // New field for auto-calculation
        customBends: {}, // { 45: 0, 90: 0, ... }
        customSegments: ['A', 'B'] // For ad-hoc custom
    });

    // Resolve current shape definition (Standard or Custom)
    const currentShapeDef = useMemo(() => {
        if (BAR_SHAPES[steelForm.shape]) return BAR_SHAPES[steelForm.shape];
        const custom = customShapes.find(s => (s.id == steelForm.shape || s._id == steelForm.shape));
        if (custom) {
            // Robust parsing for segments
            let safeSegments = custom.segments;
            if (typeof safeSegments === 'string') {
                try { safeSegments = JSON.parse(safeSegments); } catch (e) { safeSegments = []; }
            }
            if (!Array.isArray(safeSegments)) safeSegments = [];

            // Robust parsing for deductions
            let safeDeductions = custom.deductions;
            if (typeof safeDeductions === 'string') {
                try { safeDeductions = JSON.parse(safeDeductions); } catch (e) { safeDeductions = {}; }
            }
            if (!safeDeductions || typeof safeDeductions !== 'object') safeDeductions = {};

            // Check type OR if segments exist (fallback)
            if (custom.type === 'SEGMENT_BASED' || safeSegments.length > 0) {
                return {
                    ...custom,
                    segments: safeSegments,
                    deductions: safeDeductions,
                    fields: safeSegments.map(s => s.label),
                    image: '',
                    type: 'SEGMENT_BASED'
                };
            }
            return {
                ...custom,
                deductions: safeDeductions,
                fields: custom.variables,
                image: '',
                type: 'CUSTOM_DEFINED'
            };
        }
        return BAR_SHAPES.STRAIGHT;
    }, [steelForm.shape, customShapes]);

    const [editingItemIndex, setEditingItemIndex] = useState(null);

    const activeItems = useMemo(() => {
        if (!activeEstimation?.items) return [];
        if (Array.isArray(activeEstimation.items)) return activeEstimation.items;
        if (typeof activeEstimation.items === 'string') {
            try { return JSON.parse(activeEstimation.items); } catch (e) { return []; }
        }
        return [];
    }, [activeEstimation]);

    const totalAmount = useMemo(() => {
        if (activeEstimation?.type === 'steel') return 0; // Steel uses weight
        return activeItems.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.rate)), 0);
    }, [activeItems, activeEstimation]);

    const totalSteelWeight = useMemo(() => {
        if (activeEstimation?.type !== 'steel') return 0;
        return activeItems.reduce((sum, item) => sum + (parseFloat(item.totalWeight) || 0), 0);
    }, [activeItems, activeEstimation]);

    const weightByDia = useMemo(() => {
        if (activeEstimation?.type !== 'steel') return {};
        const weights = {};
        activeItems.forEach(item => {
            const d = item.dia;
            const wt = parseFloat(item.totalWeight) || 0;
            weights[d] = (weights[d] || 0) + wt;
        });
        return weights;
    }, [activeItems, activeEstimation]);

    // --- Auto-Save System ---
    // 1. Persist Active Estimation (Navigation)
    useEffect(() => {
        const savedEstId = localStorage.getItem('vini_active_est_id');
        if (savedEstId && estimations.length > 0 && !activeEstimation && !pageData) {
            const found = estimations.find(e => e._id === savedEstId || e.id === savedEstId || e.id === parseInt(savedEstId));
            if (found) {
                setActiveEstimation(found);
                setView('detail');
                if (found.type === 'masonry') {
                    setMasonryForm(prev => ({
                        ...prev,
                        material: found.defaultMaterial || 'AAC',
                        customDims: found.defaultCustomDims || { l: 0, w: 0, h: 0 },
                        mortarRatio: found.defaultMortarRatio || '1:6',
                        mortarThickness: found.defaultMortarThickness || 10
                    }));
                } else if (found.type === 'flooring') {
                    setFlooringForm(prev => ({
                        ...prev,
                        tileSize: found.defaultFlooringSize || '600x600',
                        beddingThickness: found.defaultBeddingThickness || 50,
                        ratio: found.defaultFlooringRatio || '1:6',
                        wastage: found.defaultFlooringWastage || 5
                    }));
                }
            }
        }
    }, [estimations]); // Run when estimations are loaded

    useEffect(() => {
        if (activeEstimation) {
            localStorage.setItem('vini_active_est_id', activeEstimation.id);
        } else {
            if (view === 'list') {
                localStorage.removeItem('vini_active_est_id');
            }
        }
    }, [activeEstimation, view]);

    // 2. Persist Form Drafts
    useEffect(() => {
        const savedSteel = localStorage.getItem('vini_est_draft_steel');
        if (savedSteel) {
            try { setSteelForm(prev => ({ ...prev, ...JSON.parse(savedSteel) })); } catch (e) { }
        }

        const savedConcrete = localStorage.getItem('vini_est_draft_concrete');
        if (savedConcrete) {
            try { setConcreteForm(prev => ({ ...prev, ...JSON.parse(savedConcrete) })); } catch (e) { }
        }

        const savedMasonry = localStorage.getItem('vini_est_draft_masonry');
        if (savedMasonry) {
            try { setMasonryForm(prev => ({ ...prev, ...JSON.parse(savedMasonry) })); } catch (e) { }
        }

        const savedItem = localStorage.getItem('vini_est_draft_item');
        if (savedItem) {
            try { setItemForm(prev => ({ ...prev, ...JSON.parse(savedItem) })); } catch (e) { }
        }
    }, []);

    useEffect(() => {
        if (editingItemIndex === null) {
            localStorage.setItem('vini_est_draft_steel', JSON.stringify(steelForm));
        }
    }, [steelForm, editingItemIndex]);

    useEffect(() => {
        if (editingItemIndex === null) {
            localStorage.setItem('vini_est_draft_concrete', JSON.stringify(concreteForm));
        }
    }, [concreteForm, editingItemIndex]);

    useEffect(() => {
        if (editingItemIndex === null) {
            localStorage.setItem('vini_est_draft_masonry', JSON.stringify(masonryForm));
        }
    }, [masonryForm, editingItemIndex]);

    useEffect(() => {
        if (editingItemIndex === null) {
            localStorage.setItem('vini_est_draft_item', JSON.stringify(itemForm));
        }
    }, [itemForm, editingItemIndex]);

    // Update dims when shape changes
    const handleShapeChange = (e) => {
        const newShapeId = e.target.value;
        let newDims = {};

        // Check standard
        if (BAR_SHAPES[newShapeId]) {
            BAR_SHAPES[newShapeId].fields.forEach(f => newDims[f] = 0);
        } else {
            // Check custom defined
            const custom = customShapes.find(s => (s.id == newShapeId || s._id == newShapeId));
            if (custom) {
                // Robust parsing for segments
                let safeSegments = custom.segments;
                if (typeof safeSegments === 'string') {
                    try { safeSegments = JSON.parse(safeSegments); } catch (e) { safeSegments = []; }
                }
                if (!Array.isArray(safeSegments)) safeSegments = [];

                if (custom.type === 'SEGMENT_BASED' || safeSegments.length > 0) {
                    safeSegments.forEach(s => {
                        newDims[s.label] = s.length || 0;
                        newDims[`${s.label}_mult`] = s.multiplier || 1;
                    });
                } else {
                    if (Array.isArray(custom.variables)) {
                        custom.variables.forEach(v => newDims[v] = 0);
                    }
                }
            }
        }

        setSteelForm(prev => ({
            ...prev,
            shape: newShapeId,
            dims: newDims,
            customBends: {}
        }));
    };

    const handleDimChange = (field, value) => {
        setSteelForm(prev => ({
            ...prev,
            dims: { ...prev.dims, [field]: parseFloat(value) || 0 }
        }));
    };

    // --- Deduction Handlers ---
    const [newDeduction, setNewDeduction] = useState({ name: '', l: '', h: '', count: 1 });
    const addDeduction = () => {
        if (!newDeduction.l || !newDeduction.h) return;

        if (activeEstimation.type === 'plaster') {
            setItemForm(prev => ({
                ...prev,
                deductions: [...(prev.deductions || []), { ...newDeduction }]
            }));
        } else {
            setMasonryForm(prev => ({
                ...prev,
                deductions: [...(prev.deductions || []), { ...newDeduction }]
            }));
        }
        setNewDeduction({ name: '', l: '', h: '', count: 1 });
    };

    const removeDeduction = (idx) => {
        if (activeEstimation.type === 'plaster') {
            setItemForm(prev => ({
                ...prev,
                deductions: (prev.deductions || []).filter((_, i) => i !== idx)
            }));
        } else {
            setMasonryForm(prev => ({
                ...prev,
                deductions: prev.deductions.filter((_, i) => i !== idx)
            }));
        }
    };

    // --- General Item Handlers ---
    const handleAddItem = async (e) => {
        e.preventDefault();
        let newItem = {
            description: itemForm.description,
            unit: itemForm.unit,
            quantity: parseFloat(itemForm.quantity),
            rate: parseFloat(itemForm.rate) || 0
        };

        if (activeEstimation.type === 'concrete') {
            const vol = calculateConcreteVolume(concreteForm.shape, concreteForm.dims);
            newItem = {
                ...newItem,
                shape: concreteForm.shape,
                dims: concreteForm.dims,
                count: concreteForm.count,
                volume: vol,
                quantity: (vol * concreteForm.count).toFixed(3)
            };
        } else if (activeEstimation.type === 'masonry') {
            const res = calculateMasonry(masonryForm);
            newItem = {
                ...newItem,
                material: masonryForm.material,
                customDims: masonryForm.customDims,
                wallDims: masonryForm.wallDims,
                mortarRatio: masonryForm.mortarRatio,
                mortarThickness: masonryForm.mortarThickness,
                count: res.count,
                mortar: res.mortarDry,
                mortarWet: res.mortarWet,
                chemicalWeight: res.chemicalWeight,
                chemicalBags: res.chemicalBags,
                deductions: masonryForm.deductions
            };
        } else if (activeEstimation.type === 'plaster') {
            const area = parseFloat(itemForm.manualArea) || ((itemForm.wallDims?.l || 0) * (itemForm.wallDims?.h || 0));
            const thickness = itemForm.thickness || activeEstimation.defaultPlasterThickness || 12;
            const volume = area * (thickness / 1000);

            newItem = {
                description: itemForm.description,
                wallDims: itemForm.wallDims || { l: 0, h: 0 },
                thickness: thickness,
                ratio: itemForm.ratio || activeEstimation.defaultPlasterRatio || '1:4',
                area: area,
                volume: volume,
                manualArea: itemForm.manualArea,
                deductions: itemForm.deductions || []
            };
        } else if (activeEstimation.type === 'flooring') {
            const l = parseFloat(flooringForm.roomDims.l) || 0;
            const w = parseFloat(flooringForm.roomDims.w) || 0;
            const area = parseFloat(flooringForm.manualArea) || (l * w);

            // Tile Calculation
            const tileSize = activeEstimation.defaultFlooringSize || '600x600';
            const [tDim1, tDim2] = tileSize.toLowerCase().split('x').map(d => parseFloat(d) / 1000);
            const oneTileArea = (tDim1 || 0.6) * (tDim2 || 0.6);
            const rawTiles = area / oneTileArea;
            const wastagePercent = activeEstimation.defaultFlooringWastage || 5;
            const wasteTiles = rawTiles * (wastagePercent / 100);
            const totalTiles = Math.ceil(rawTiles + wasteTiles);

            // Bedding Calculation
            const thickM = (parseFloat(activeEstimation.defaultBeddingThickness) || 50) / 1000;
            const beddingVol = area * thickM;

            newItem = {
                description: flooringForm.description,
                roomDims: { l, w },
                tileSize: tileSize,
                tileCount: totalTiles,
                beddingThickness: activeEstimation.defaultBeddingThickness || '50',
                ratio: activeEstimation.defaultFlooringRatio || '1:6',
                volume: beddingVol, // Mortar Volume
                wastage: wastagePercent,
                area: area,
                manualArea: flooringForm.manualArea
            };
        } else {
            // For general type, newItem is already defined above
        }

        const success = await saveItem(newItem);
        if (success) {
            if (activeEstimation.type === 'masonry') {
                // Fixed Dimension Logic
                setMasonryForm(prev => {
                    if (prev.isFixed) {
                        // Lock Height & Thickness, Reset Length
                        return {
                            ...prev,
                            wallDims: { l: 0, h: prev.wallDims.h, t: prev.wallDims.t },
                            deductions: []
                        };
                    } else {
                        // Reset All
                        return {
                            ...prev,
                            wallDims: { l: 0, h: 0, t: 0 },
                            deductions: []
                        };
                    }
                });
            }
        }
    };

    // --- Steel Item Handlers ---
    const handleAddSteelItem = async (e) => {
        e.preventDefault();
        if (!steelForm.barMark) return alert("Bar Mark is required");

        let dims = { ...steelForm.dims };
        if (steelForm.shape === 'CUSTOM') {
            dims = {};
            steelForm.customSegments.forEach(seg => {
                dims[seg.name] = parseFloat(seg.value) || 0;
            });
        }

        const cutLen = calculateCuttingLength(
            steelForm.shape,
            dims,
            steelForm.dia,
            steelForm.customBends,
            currentShapeDef.type === 'CUSTOM_DEFINED' || currentShapeDef.type === 'SEGMENT_BASED' ? currentShapeDef : null
        );

        const totalBars = parseFloat(steelForm.noMembers) * parseFloat(steelForm.barsPerMember);

        // Let's assume input dims are in mm, so convert to meters
        const cutLenM = cutLen / 1000;
        const totalLenM = totalBars * cutLenM;
        const unitWt = UNIT_WEIGHTS[steelForm.dia] || 0;
        const totalWt = totalLenM * unitWt;

        const newItem = {
            barMark: steelForm.barMark,
            description: steelForm.description,
            shape: steelForm.shape,
            dia: parseInt(steelForm.dia),
            spacing: parseFloat(steelForm.spacing),
            noMembers: parseFloat(steelForm.noMembers),
            barsPerMember: parseFloat(steelForm.barsPerMember),
            dims: dims,
            customBends: steelForm.customBends,
            cuttingLength: cutLenM, // stored in meters
            totalLength: totalLenM,
            unitWeight: unitWt,
            totalWeight: totalWt
        };
        const success = await saveItem(newItem);
        if (success) {
            // Reset form but keep some defaults
            setSteelForm(prev => ({
                ...prev,
                barMark: '',
                description: '',
                dims: Object.keys(prev.dims).reduce((acc, k) => ({ ...acc, [k]: 0 }), {})
            }));
        }
    };

    const saveItem = async (newItem) => {
        // Sanitize newItem to remove NaN/Nulls in numbers
        const sanitizedItem = { ...newItem };
        Object.keys(sanitizedItem).forEach(key => {
            if (typeof sanitizedItem[key] === 'number') {
                if (isNaN(sanitizedItem[key])) sanitizedItem[key] = 0;
            }
        });

        let updatedItems;
        if (editingItemIndex !== null) {
            updatedItems = [...activeItems];
            updatedItems[editingItemIndex] = sanitizedItem;
        } else {
            updatedItems = [...activeItems, sanitizedItem];
        }

        const estId = activeEstimation._id || activeEstimation.id;
        console.log("Saving Item to Estimation:", estId);

        try {
            const res = await updateEstimation(estId, { items: updatedItems });
            if (res && res.success) {
                setActiveEstimation({ ...activeEstimation, items: updatedItems });

                // Reset Generic Forms (that are cleared regardless of type)
                setPlasterForm({
                    description: '', manualArea: '', wallDims: { l: 0, h: 0 },
                    thickness: 12, ratio: '1:4', deductions: []
                });

                setFlooringForm({
                    description: '', roomDims: { l: 0, w: 0 },
                    tileSize: '600x600', // mm
                    beddingThickness: 50, // mm
                    ratio: '1:6', // or CHEMICAL
                    wastage: 5 // %
                });

                setItemForm({ description: '', unit: '', quantity: '', rate: '', wallDims: { l: 0, h: 0 }, thickness: 0, ratio: '1:4', manualArea: 0 });
                setEditingItemIndex(null);
                return true;
            } else {
                alert("Failed to save item: " + (res?.message || "Unknown Error"));
                return false;
            }
        } catch (e) {
            console.error("Save Error:", e);
            alert("Save Exception: " + e.message);
            return false;
        }
    };

    const handleEditItem = (index) => {
        const item = activeItems[index];
        setEditingItemIndex(index);
        setItemForm({
            description: item.description,
            unit: item.unit || '',
            quantity: item.quantity,
            rate: item.rate || '',
            wallDims: item.wallDims || { l: 0, h: 0 },
            thickness: item.thickness || 0,
            ratio: item.ratio || '1:4',
            manualArea: item.manualArea || 0,
            deductions: item.deductions || []
        });

        const isSteel = activeEstimation?.type === 'steel';
        const isConcrete = activeEstimation?.type === 'concrete';
        const isMasonry = activeEstimation?.type === 'masonry';

        if (isSteel) {
            setSteelForm({
                barMark: item.barMark,
                description: item.description || '',
                shape: item.shape,
                dia: item.dia,
                spacing: item.spacing,
                noMembers: item.noMembers,
                barsPerMember: item.barsPerMember,
                dims: item.dims || {},
                customSegments: item.customSegments || [],
                customBends: item.customBends || {}
            });
        } else if (isConcrete) {
            setConcreteForm({
                shape: item.shape || 'RECTANGLE',
                count: item.count || 1,
                dims: item.dims || {}
            });
        } else if (isMasonry) {
            setMasonryForm({
                material: item.material || 'AAC',
                customDims: item.customDims || { l: 0, w: 0, h: 0 },
                wallDims: item.wallDims || { l: 0, h: 0, t: 0 },
                mortarRatio: item.mortarRatio || '1:6',
                mortarThickness: item.mortarThickness || 10,
                dimsIncludeMortar: item.dimsIncludeMortar || false,
                manualQty: item.manualQty || 0,
                deductions: item.deductions || []
            });
        }
    };

    const handleDeleteItem = (index) => {

        const updatedItems = activeItems.filter((_, i) => i !== index);
        updateEstimation(activeEstimation._id || activeEstimation.id, { items: updatedItems });
        setActiveEstimation({ ...activeEstimation, items: updatedItems });
    };

    // --- Custom Shape Handlers ---
    const addCustomSegment = () => {
        const nextChar = String.fromCharCode(65 + steelForm.customSegments.length); // A, B, C...
        setSteelForm({
            ...steelForm,
            customSegments: [...steelForm.customSegments, { name: nextChar, value: 0 }]
        });
    };

    const removeCustomSegment = (index) => {
        const newSegments = [...steelForm.customSegments];
        newSegments.splice(index, 1);
        setSteelForm({ ...steelForm, customSegments: newSegments });
    };

    const updateCustomSegment = (index, val) => {
        const newSegments = [...steelForm.customSegments];
        newSegments[index].value = val;
        setSteelForm({ ...steelForm, customSegments: newSegments });
    };

    const handleSaveScrap = (newScrap) => {
        updateEstimation(activeEstimation._id || activeEstimation.id, { scrapStock: newScrap });
        setActiveEstimation({ ...activeEstimation, scrapStock: newScrap });
    };

    // --- RENDER LOGIC ---
    // 1. Optimization View
    if (view === 'optimization' && activeEstimation) {
        return (
            <OptimizationResults
                items={activeEstimation.items}
                title={activeEstimation.title}
                initialScrap={activeEstimation.scrapStock || []}
                onSaveScrap={handleSaveScrap}
                onBack={() => setView('detail')}
            />
        );
    }

    // 2. Detail View
    if (view === 'detail' && activeEstimation) {
        const isSteel = activeEstimation?.type === 'steel';
        const isConcrete = activeEstimation?.type === 'concrete';
        const isMasonry = activeEstimation?.type === 'masonry';
        const isPlaster = activeEstimation?.type === 'plaster';
        const isFlooring = activeEstimation?.type === 'flooring';

        const handleExportDetailCSV = () => {
            let csvContent = "data:text/csv;charset=utf-8,";
            if (isSteel) {
                csvContent += "Bar Mark,Description,Shape,Diameter,No. Members,No. Bars,Total Bars,Cut Length (m),Total Length (m),Total Weight (kg),Segment Lengths\n";
                activeItems.forEach(item => {
                    let shapeName = item.shape;
                    // Resolve Shape Name logic
                    if (BAR_SHAPES[item.shape]) {
                        shapeName = BAR_SHAPES[item.shape].name;
                    } else {
                        const custom = customShapes.find(s => String(s.id) === String(item.shape) || String(s._id) === String(item.shape));
                        if (custom) {
                            shapeName = custom.name;
                        } else if (item.shape && item.shape.length > 10) {
                            shapeName = "Custom Shape";
                        }
                    }

                    const totalBars = (parseFloat(item.noMembers) || 0) * (parseFloat(item.barsPerMember) || 0);
                    const cutLengthM = (parseFloat(item.cuttingLength) || 0); // Already in m
                    const segmentLengths = item.dims ? Object.entries(item.dims).map(([key, val]) => `${key}=${val}`).join('; ') : '';
                    csvContent += `${item.barMark},"${item.description || ''}",${shapeName},${item.dia},${item.noMembers},${item.barsPerMember},${totalBars},${cutLengthM.toFixed(3)},${item.totalLength.toFixed(2)},${item.totalWeight.toFixed(2)},"${segmentLengths}"\n`;
                });

                // Add Weight Summary by Diameter
                csvContent += "\nWeight Summary by Diameter\nDiameter (mm),Total Weight (kg)\n";
                const weightByDia = {};
                activeItems.forEach(item => {
                    const dia = item.dia;
                    weightByDia[dia] = (weightByDia[dia] || 0) + (parseFloat(item.totalWeight) || 0);
                });
                Object.entries(weightByDia)
                    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                    .map(([dia, wt]) => {
                        csvContent += `${dia},${wt.toFixed(2)}\n`;
                    });
            } else if (isConcrete) {
                csvContent += "Description,Shape,Dimensions,1 Item (m3),Count,Quantity (m3)\n";
                activeItems.forEach(item => {
                    const dimsStr = item.dims ? Object.entries(item.dims).map(([k, v]) => `${k}=${v}`).join('; ') : '';
                    csvContent += `"${item.description}",${item.shape},"${dimsStr}",${item.volume},${item.count},${item.quantity}\n`;
                });
                // Add Material Breakdown
                const totalVol = activeItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
                const ratioStr = activeEstimation.defaultConcreteRatio || '1:1.5:3';
                const parts = ratioStr.split(':').map(Number);
                if (parts.length === 3 && !parts.some(isNaN)) {
                    const totalParts = parts[0] + parts[1] + parts[2];
                    const dryVol = totalVol * 1.54;
                    const cementBags = Math.ceil((dryVol * parts[0] / totalParts) / 0.035);
                    const sandVol = (dryVol * parts[1] / totalParts).toFixed(2);
                    const aggVol = (dryVol * parts[2] / totalParts).toFixed(2);
                    csvContent += `\nMaterial Breakdown (Ratio ${ratioStr})\nTotal Cement (Bags),${cementBags}\nTotal Sand (m3),${sandVol}\nTotal Aggregate (m3),${aggVol}\n`;
                }
            } else if (isMasonry) {
                csvContent += "Description,Material,Block Dims (LxWxH),Wall Dims (LxHxT),Deductions,Mortar Ratio,Count,Mortar Vol (m3)\n";
                activeItems.forEach(item => {
                    const wallDims = `${item.wallDims?.l}m x ${item.wallDims?.h}m x ${item.wallDims?.t}m`;
                    const matLabel = MASONRY_MATERIALS[item.material]?.label || item.material;
                    const blockDims = `${item.customDims?.l || 0}x${item.customDims?.w || 0}x${item.customDims?.h || 0}mm`;
                    const dedStr = (item.deductions && item.deductions.length > 0)
                        ? item.deductions.map(d => `${d.name || 'Ded'}: ${d.l}x${d.h}m (${d.count})`).join('; ')
                        : '-';
                    csvContent += `"${item.description}",${matLabel},"${blockDims}","${wallDims}","${dedStr}",${item.mortarRatio},${item.count},${item.mortar?.toFixed(3)}\n`;
                });
                // Add Material Breakdown
                const totalCement = Math.ceil(activeItems.reduce((sum, item) => {
                    if (item.mortarRatio === 'CHEMICAL') return sum;
                    const ratioParts = item.mortarRatio.split(':').map(Number);
                    const totalParts = ratioParts[0] + ratioParts[1];
                    const cementVol = (item.mortar || 0) * (ratioParts[0] / totalParts);
                    return sum + (cementVol / 0.035);
                }, 0));
                const totalSand = activeItems.reduce((sum, item) => {
                    if (item.mortarRatio === 'CHEMICAL') return sum;
                    const ratioParts = item.mortarRatio.split(':').map(Number);
                    const totalParts = ratioParts[0] + ratioParts[1];
                    const sandVol = (item.mortar || 0) * (ratioParts[1] / totalParts);
                    return sum + sandVol;
                }, 0).toFixed(2);
                const totalChemical = Math.ceil(activeItems.reduce((sum, item) => {
                    if (item.mortarRatio !== 'CHEMICAL') return sum;
                    return sum + ((item.mortar || 0) * 1500);
                }, 0));
                csvContent += `\nMaterial Breakdown\nTotal Cement (Bags),${totalCement}\nTotal Sand (m3),${totalSand}\nTotal Chemical (kg),${totalChemical}\n`;
            } else if (isPlaster) {
                csvContent += "Description,Dimensions (LxH),Deductions,Thickness (mm),Ratio,Area (m2),Volume (m3)\n";
                activeItems.forEach(item => {
                    const dedStr = (item.deductions && item.deductions.length > 0)
                        ? item.deductions.map(d => `${d.name || 'Ded'}: ${d.l}x${d.h}m (${d.count})`).join('; ')
                        : '-';
                    csvContent += `"${item.description}","${item.wallDims?.l}x${item.wallDims?.h}","${dedStr}",${item.thickness},${item.ratio},${item.area?.toFixed(2)},${item.volume?.toFixed(3)}\n`;
                });
                // Add Material Breakdown
                const totalCement = Math.ceil(activeItems.reduce((sum, item) => {
                    const ratioParts = (item.ratio || '1:4').split(':').map(Number);
                    const totalParts = ratioParts[0] + ratioParts[1];
                    const dryVol = (item.volume || 0) * 1.33;
                    const cementVol = dryVol * (ratioParts[0] / totalParts);
                    return sum + (cementVol / 0.035);
                }, 0));
                const totalSand = activeItems.reduce((sum, item) => {
                    const ratioParts = (item.ratio || '1:4').split(':').map(Number);
                    const totalParts = ratioParts[0] + ratioParts[1];
                    const dryVol = (item.volume || 0) * 1.33;
                    return sum + (dryVol * (ratioParts[1] / totalParts));
                }, 0).toFixed(2);
                csvContent += `\nMaterial Breakdown\nTotal Cement (Bags),${totalCement}\nTotal Sand (m3),${totalSand}\n`;
            } else if (isFlooring) {
                csvContent += "Description,Room Dims (LxW),Area (m2),Tile Size,Count (Nos),Wastage (%),Bedding (mm),Ratio,Mortar Vol (m3)\n";
                activeItems.forEach(item => {
                    csvContent += `"${item.description}","${item.roomDims?.l}x${item.roomDims?.w}","${item.area?.toFixed(2)}","${item.tileSize}","${item.tileCount}","${item.wastage}",${item.beddingThickness},${item.ratio},${item.volume?.toFixed(3)}\n`;
                });
                // Material Breakdown
                const totalTiles = activeItems.reduce((sum, item) => sum + (parseInt(item.tileCount) || 0), 0);
                const totalVol = activeItems.reduce((sum, item) => sum + (parseFloat(item.volume) || 0), 0);

                const totalCement = Math.ceil(activeItems.reduce((sum, item) => {
                    if (item.ratio === 'CHEMICAL') return sum;
                    const ratioParts = (item.ratio || '1:6').split(':').map(Number);
                    const totalParts = ratioParts[0] + ratioParts[1];
                    const dryVol = (item.volume || 0) * 1.33;
                    const cementVol = dryVol * (ratioParts[0] / totalParts);
                    // Slurry: 3.5kg/m2 -> Area * 3.5 / 50
                    const area = (item.area || ((item.roomDims?.l || 0) * (item.roomDims?.w || 0)));
                    const slurryBags = (area * 3.5) / 50;
                    return sum + (cementVol / 0.035) + slurryBags;
                }, 0));

                const totalSand = activeItems.reduce((sum, item) => {
                    if (item.ratio === 'CHEMICAL') return sum;
                    const ratioParts = (item.ratio || '1:6').split(':').map(Number);
                    const totalParts = ratioParts[0] + ratioParts[1];
                    const dryVol = (item.volume || 0) * 1.33;
                    return sum + (dryVol * (ratioParts[1] / totalParts));
                }, 0).toFixed(2);

                const totalGrout = Math.ceil(activeItems.reduce((sum, item) => {
                    const area = (item.area || ((item.roomDims?.l || 0) * (item.roomDims?.w || 0)));
                    return sum + (area * (50 / 70));
                }, 0));

                csvContent += `\nMaterial Breakdown\nTotal Tiles,${totalTiles}\nTotal Mortar Vol (m3),${totalVol.toFixed(3)}\nTotal Cement (Bags - inc Slurry),${totalCement}\nTotal Sand (m3),${totalSand}\nTotal Grout/Filler (kg),${totalGrout}\n`;
            } else {
                csvContent += "Description,Unit,Quantity,Rate,Amount\n";
                activeItems.forEach(item => {
                    csvContent += `"${item.description}",${item.unit},${item.quantity},${item.rate},${(item.quantity * item.rate).toFixed(2)}\n`;
                });
            }
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `${activeEstimation.title}_detail.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        return (
            <div className="estimation-detail">
                <div className="page-header">
                    <div className="header-content">
                        <div className="header-actions" style={{ justifyContent: 'space-between', width: '100%' }}>
                            <button className="btn-back" onClick={() => {
                                setView('list');
                                setActiveEstimation(null);
                                if (setPageData) setPageData(null);
                            }}> Back</button>
                            <div className="flex gap-2">
                                <button className="btn btn-secondary" onClick={() => {
                                    if (!activeEstimation || activeItems.length === 0) {
                                        alert("No data to download.");
                                        return;
                                    }
                                    generateEstimationPDF(activeEstimation, activeItems, customShapes, BAR_SHAPES);
                                }}>Download PDF</button>
                                <button className="btn btn-secondary" onClick={handleExportDetailCSV}> Export Excel</button>
                                {isSteel && <button className="btn btn-primary" onClick={() => setView('optimization')}> Optimize Cuts</button>}
                            </div>
                        </div>
                        <h1>{activeEstimation.title}</h1>
                        <p className="text-muted">{activeEstimation.description} <span className="badge">{isSteel ? 'Steel BBS' : isConcrete ? 'Concrete' : 'General'}</span></p>
                    </div>
                    {isMasonry && (
                        <div className="bg-gray-50 p-3 rounded border mb-4 text-sm flex gap-4" style={{ marginTop: '10px' }}>
                            <div><strong>Default Material:</strong> {MASONRY_MATERIALS[activeEstimation.defaultMaterial]?.label || activeEstimation.defaultMaterial}</div>
                            <div><strong>Block Size:</strong> {activeEstimation.defaultCustomDims?.l}x{activeEstimation.defaultCustomDims?.w}x{activeEstimation.defaultCustomDims?.h} mm</div>
                            <div><strong>Mortar Ratio:</strong> {activeEstimation.defaultMortarRatio}</div>
                        </div>
                    )}
                    {isConcrete && (
                        <div className="bg-gray-50 p-3 rounded border mb-4 text-sm flex gap-4" style={{ marginTop: '10px' }}>
                            <div><strong>Grade:</strong> {activeEstimation.defaultConcreteGrade || 'N/A'}</div>
                            <div><strong>Ratio:</strong> {activeEstimation.defaultConcreteRatio || 'N/A'}</div>
                        </div>
                    )}
                </div>

                <div className="estimation-content">
                    {canEditCurrent && (
                        <div className="card item-form-card no-print">
                            <h3>{editingItemIndex !== null ? 'Edit Item' : 'Add New Item'}</h3>
                            {isSteel ? (
                                <form onSubmit={handleAddSteelItem} className="item-form steel-form">
                                    <div className="form-row">
                                        <div className="form-group"><label>Bar Mark</label><input type="text" required value={steelForm.barMark} onChange={e => setSteelForm({ ...steelForm, barMark: e.target.value })} placeholder="e.g. B1" /></div>
                                        <div className="form-group grow-2"><label>Description</label><input type="text" value={steelForm.description} onChange={e => setSteelForm({ ...steelForm, description: e.target.value })} placeholder="Optional description" /></div>
                                        <div className="form-group">
                                            <label>Shape</label>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <select value={steelForm.shape} onChange={handleShapeChange} style={{ flex: 1 }}>
                                                    {/* <optgroup label="Standard Shapes">{Object.values(BAR_SHAPES).map(shape => <option key={shape.id} value={shape.id}>{shape.image} {shape.name}</option>)}</optgroup> */}
                                                    <optgroup label="Custom Shapes">{customShapes.map(shape => <option key={shape.id || shape._id} value={shape.id || shape._id}> {shape.name}</option>)}</optgroup>
                                                </select>
                                                <button type="button" className="btn btn-secondary" onClick={() => { if (setPageData) setPageData({ activeEstimationId: activeEstimation.id, view: 'detail' }); onNavigate('shape-manager'); }}>Manage Shapes</button>
                                            </div>
                                        </div>
                                        <div className="form-group"><label>Diameter (mm)</label><select value={steelForm.dia} onChange={e => setSteelForm({ ...steelForm, dia: parseInt(e.target.value) })}>{[6, 8, 10, 12, 16, 20, 25, 32].map(d => <option key={d} value={d}>{d} mm</option>)}</select></div>
                                    </div>
                                    {currentShapeDef.type === 'SEGMENT_BASED' ? (
                                        <div className="segments-table-container mb-4">
                                            <table className="segments-table">
                                                <thead><tr><th>Segment</th><th>Length (mm)</th><th>Multiplier</th><th>Bend</th><th>Deduction</th></tr></thead>
                                                <tbody>{currentShapeDef.segments.map((seg, idx) => (
                                                    <tr key={idx}>
                                                        <td className="seg-label">{seg.label}</td>
                                                        <td><input type="number" className="input-cell" value={steelForm.dims[seg.label] || ''} onChange={e => handleDimChange(seg.label, e.target.value)} placeholder="0" /></td>
                                                        <td>x {seg.multiplier || 1}</td>
                                                        <td>{idx < currentShapeDef.segments.length - 1 ? '90' : '-'}</td>
                                                        <td>{idx < currentShapeDef.segments.length - 1 ? '-2d' : '-'}</td>
                                                    </tr>
                                                ))}</tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="form-row">{currentShapeDef.fields.map(field => (
                                            <div key={field} className="form-group"><label>{field} (mm)</label><input type="number" required value={steelForm.dims[field] || ''} onChange={e => handleDimChange(field, e.target.value)} /></div>
                                        ))}</div>
                                    )}
                                    {steelForm.shape === 'CUSTOM' && (
                                        <div className="custom-shape-inputs" style={{ width: '100%' }}>
                                            <div className="flex gap-2 mb-2 items-center"><label className="font-bold">Segments:</label><button type="button" className="btn-xs btn-secondary" onClick={addCustomSegment}>+ Add Segment</button></div>
                                            <div className="flex flex-wrap gap-2">{steelForm.customSegments.map((seg, idx) => (
                                                <div key={idx} className="form-group" style={{ minWidth: '80px' }}><label>{seg.name} (mm)</label><div className="flex"><input type="number" value={seg.value} onChange={e => updateCustomSegment(idx, e.target.value)} style={{ width: '80px' }} /><button type="button" className="text-red-500 ml-1" onClick={() => removeCustomSegment(idx)}></button></div></div>
                                            ))}</div>
                                        </div>
                                    )}
                                    <div className="form-row">
                                        <div className="form-group"><label>No. Members</label><input type="number" required value={steelForm.noMembers} onChange={e => setSteelForm({ ...steelForm, noMembers: parseFloat(e.target.value) || 0 })} /></div>
                                        <div className="form-group">
                                            <label>Span Length (mm)</label>
                                            <input type="number" value={steelForm.spanLength || ''} onChange={e => {
                                                const span = parseFloat(e.target.value) || 0;
                                                const spacing = steelForm.spacing || 150;
                                                const bars = spacing > 0 ? Math.ceil(span / spacing) + 1 : 0;
                                                setSteelForm({ ...steelForm, spanLength: span, barsPerMember: bars });
                                            }} placeholder="Calculate Bars" />
                                        </div>
                                        <div className="form-group">
                                            <label>Spacing (mm)</label>
                                            <input type="number" value={steelForm.spacing} onChange={e => {
                                                const spacing = parseFloat(e.target.value) || 0;
                                                const span = steelForm.spanLength || 0;
                                                const bars = (span > 0 && spacing > 0) ? Math.ceil(span / spacing) + 1 : steelForm.barsPerMember;
                                                setSteelForm({ ...steelForm, spacing: spacing, barsPerMember: bars });
                                            }} />
                                        </div>
                                        <div className="form-group"><label>Number of Bars</label><input type="number" required value={steelForm.barsPerMember} onChange={e => setSteelForm({ ...steelForm, barsPerMember: parseFloat(e.target.value) || 0 })} /></div>
                                    </div>
                                    <div className="form-actions mt-2">
                                        <button type="submit" className="btn btn-primary">{editingItemIndex !== null ? 'Update Bar' : 'Add Bar'}</button>
                                        {editingItemIndex !== null && <button type="button" className="btn btn-secondary" onClick={() => { setEditingItemIndex(null); setSteelForm({ barMark: '', shape: 'STRAIGHT', dia: 8, spacing: 0, noMembers: 1, barsPerMember: 0, dims: { A: 0, B: 0, C: 0, L: 0 }, customSegments: [], customBends: {} }); }}>Cancel</button>}
                                    </div>
                                </form>
                            ) : isConcrete ? (
                                <form onSubmit={handleAddItem} className="item-form">
                                    <div className="form-row" style={{ width: '100%' }}>
                                        <div className="form-group"><label>Shape</label><select value={concreteForm.shape} onChange={e => setConcreteForm({ ...concreteForm, shape: e.target.value, dims: {} })}>{Object.entries(CONCRETE_SHAPES).map(([key, def]) => <option key={key} value={key}>{def.label}</option>)}</select></div>
                                        <div className="form-group grow-2"><label>Description</label><input type="text" required placeholder="e.g. Footing F1" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} /></div>
                                    </div>
                                    <div className="form-row" style={{ width: '100%' }}>
                                        {CONCRETE_SHAPES[concreteForm.shape].fields.map(field => (
                                            <div key={field} className="form-group"><label>{field} (m)</label><input type="number" step="0.001" required value={concreteForm.dims[field] || ''} onChange={e => {
                                                const newDims = { ...concreteForm.dims, [field]: parseFloat(e.target.value) || 0 };
                                                setConcreteForm({ ...concreteForm, dims: newDims });
                                                const qty = calculateConcreteVolume(concreteForm.shape, newDims);
                                                setItemForm(prev => ({ ...prev, quantity: qty.toFixed(3) }));
                                            }} /></div>
                                        ))}
                                    </div>
                                    <div className="form-row" style={{ width: '100%' }}>
                                        <div className="form-group"><label>No. of Items</label><input type="number" required value={concreteForm.count} onChange={e => { const count = parseFloat(e.target.value) || 0; setConcreteForm({ ...concreteForm, count }); const vol = calculateConcreteVolume(concreteForm.shape, concreteForm.dims); setItemForm(prev => ({ ...prev, quantity: (vol * count).toFixed(3) })); }} /></div>
                                        <div className="form-group"><label>Total Quantity (m3)</label><input type="number" readOnly value={itemForm.quantity} className="bg-gray-100" /></div>
                                    </div>
                                    <div className="form-actions">
                                        <button type="submit" className="btn btn-primary">{editingItemIndex !== null ? 'Update Item' : 'Add Item'}</button>
                                        {editingItemIndex !== null && <button type="button" className="btn btn-secondary" onClick={() => { setEditingItemIndex(null); setItemForm({ description: '', unit: '', quantity: '', rate: '', wallDims: { l: 0, h: 0 }, thickness: 0, ratio: '1:4', manualArea: 0 }); setConcreteForm({ shape: 'RECTANGLE', count: 1, dims: {} }); }}>Cancel</button>}
                                    </div>
                                </form>
                            ) : isMasonry ? (
                                <form onSubmit={handleAddItem} className="item-form">
                                    <div className="form-row" style={{ width: '100%' }}>
                                        <div className="form-group grow-2"><label>Description</label><input type="text" required placeholder="e.g. Wall W1" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} /></div>
                                    </div>
                                    <div className="form-row" style={{ width: '100%' }}>
                                        <div className="form-group"><label>Wall Length (m)</label><input type="number" step="0.01" required value={masonryForm.wallDims.l} onChange={e => setMasonryForm({ ...masonryForm, wallDims: { ...masonryForm.wallDims, l: parseFloat(e.target.value) || 0 } })} /></div>
                                        <div className="form-group"><label>Wall Height (m)</label><input type="number" step="0.01" required value={masonryForm.wallDims.h} onChange={e => setMasonryForm({ ...masonryForm, wallDims: { ...masonryForm.wallDims, h: parseFloat(e.target.value) || 0 } })} /></div>
                                        <div className="form-group"><label>Wall Thickness (m)</label><input type="number" step="0.001" required value={masonryForm.wallDims.t} onChange={e => setMasonryForm({ ...masonryForm, wallDims: { ...masonryForm.wallDims, t: parseFloat(e.target.value) || 0 } })} /></div>
                                    </div>
                                    <div className="form-row" style={{ width: '100%', alignItems: 'center' }}>
                                        <div className="form-group">
                                            <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                                                <input type="checkbox" checked={masonryForm.dimsIncludeMortar} onChange={e => setMasonryForm({ ...masonryForm, dimsIncludeMortar: e.target.checked })} />
                                                <span className="text-sm">Block Dims include Mortar?</span>
                                            </label>
                                        </div>
                                        <div className="form-group">
                                            <label className="flex items-center gap-2" style={{ cursor: 'pointer', color: '#dc2626', fontWeight: 'bold' }}>
                                                <input type="checkbox" checked={masonryForm.isFixed} onChange={e => setMasonryForm({ ...masonryForm, isFixed: e.target.checked })} />
                                                <span className="text-sm">Lock H & T</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Deductions Section */}
                                    <div className="card p-3 mb-3 bg-gray-50 border border-gray-200 shadow-sm rounded-lg">
                                        <h5 className="text-sm font-bold mb-3 text-gray-700 flex items-center gap-2">
                                            <span role="img" aria-label="cut">✂️</span> Deductions (Doors/Windows)
                                        </h5>

                                        {/* Deduction Inputs */}
                                        <div className="grid grid-cols-12 gap-2 mb-3 items-end">
                                            <div className="col-span-4">
                                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Name</label>
                                                <input type="text" placeholder="e.g. D1" value={newDeduction.name} onChange={e => setNewDeduction({ ...newDeduction, name: e.target.value })} className="w-full form-input text-sm p-1 border rounded" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-xs font-semibold text-gray-600 mb-1 block">L (m)</label>
                                                <input type="number" placeholder="0.00" value={newDeduction.l} onChange={e => setNewDeduction({ ...newDeduction, l: parseFloat(e.target.value) })} className="w-full form-input text-sm p-1 border rounded" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-xs font-semibold text-gray-600 mb-1 block">H (m)</label>
                                                <input type="number" placeholder="0.00" value={newDeduction.h} onChange={e => setNewDeduction({ ...newDeduction, h: parseFloat(e.target.value) })} className="w-full form-input text-sm p-1 border rounded" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Qty</label>
                                                <input type="number" placeholder="1" value={newDeduction.count} onChange={e => setNewDeduction({ ...newDeduction, count: parseFloat(e.target.value) })} className="w-full form-input text-sm p-1 border rounded" />
                                            </div>
                                            <div className="col-span-2">
                                                <button type="button" className="btn btn-secondary btn-sm w-full bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200" onClick={addDeduction}>+ Add</button>
                                            </div>
                                        </div>

                                        {/* Deduction List */}
                                        {masonryForm.deductions && masonryForm.deductions.length > 0 && (
                                            <div className="bg-white border border-gray-200 rounded-md overflow-hidden mt-3">
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                                    <thead style={{ backgroundColor: '#f9fafb', color: '#6b7280', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                                                        <tr>
                                                            <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Name</th>
                                                            <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Size (L x H)</th>
                                                            <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Qty</th>
                                                            <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {masonryForm.deductions.map((d, idx) => (
                                                            <tr key={idx} style={{ borderBottom: idx === masonryForm.deductions.length - 1 ? 'none' : '1px solid #f3f4f6' }}>
                                                                <td style={{ padding: '12px 16px', color: '#111827', fontWeight: '500' }}>{d.name || <span className="text-gray-400 italic">--</span>}</td>
                                                                <td style={{ padding: '12px 16px', color: '#4b5563' }}>{d.l}m x {d.h}m</td>
                                                                <td style={{ padding: '12px 16px', color: '#111827', textAlign: 'center' }}>{d.count}</td>
                                                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                                    <button type="button"
                                                                        onClick={() => removeDeduction(idx)}
                                                                        style={{ color: '#ef4444', padding: '4px 8px', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                                                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                                                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    <div className="form-row" style={{ width: '100%' }}>
                                        <div className="form-group">
                                            <label>Mortar Ratio</label>
                                            <select value={masonryForm.mortarRatio} onChange={e => {
                                                const ratio = e.target.value;
                                                const startThickness = ratio === 'CHEMICAL' ? 3 : 10;
                                                setMasonryForm({ ...masonryForm, mortarRatio: ratio, mortarThickness: startThickness });
                                            }}>
                                                <option value="1:3">1:3</option>
                                                <option value="1:4">1:4</option>
                                                <option value="1:5">1:5</option>
                                                <option value="1:6">1:6</option>
                                                <option value="CHEMICAL">Chemical</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Mortar Thickness (mm)</label>
                                            <input type="number" step="0.1" value={masonryForm.mortarThickness || 10} onChange={e => setMasonryForm({ ...masonryForm, mortarThickness: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                    </div>
                                    <div className="form-row" style={{ width: '100%' }}>
                                        <div className="form-group"><label>Calculated Bricks/Blocks</label><input type="number" readOnly value={calculateMasonry(masonryForm).count} className="bg-gray-100" /></div>
                                        <div className="form-group"><label>Wet Mortar Vol (m3)</label><input type="number" readOnly value={calculateMasonry(masonryForm).mortarWet?.toFixed(3)} className="bg-gray-100" /></div>
                                        {masonryForm.mortarRatio === 'CHEMICAL' ? (
                                            <div className="form-group"><label>Chemical Weight (kg)</label><input type="number" readOnly value={calculateMasonry(masonryForm).chemicalWeight?.toFixed(2)} className="bg-gray-100" /></div>
                                        ) : (
                                            <div className="form-group"><label>Dry Mortar Vol (m3)</label><input type="number" readOnly value={calculateMasonry(masonryForm).mortarDry?.toFixed(3)} className="bg-gray-100" /></div>
                                        )}
                                    </div>
                                    <div className="form-actions">
                                        <button type="submit" className="btn btn-primary">{editingItemIndex !== null ? 'Update Item' : 'Add Item'}</button>
                                        {editingItemIndex !== null && <button type="button" className="btn btn-secondary" onClick={() => { setEditingItemIndex(null); setItemForm({ description: '', unit: '', quantity: '', rate: '', wallDims: { l: 0, h: 0 }, thickness: 0, ratio: '1:4', manualArea: 0 }); setMasonryForm({ material: 'AAC', customDims: { l: 0, w: 0, h: 0 }, wallDims: { l: 0, h: 0, t: 0 }, mortarRatio: '1:6', dimsIncludeMortar: false, manualQty: 0, isFixed: false }); }}>Cancel</button>}
                                    </div>
                                </form>
                            ) : isPlaster ? (
                                <form onSubmit={handleAddItem} className="item-form">
                                    <div className="form-row" style={{ width: '100%' }}>
                                        <div className="form-group grow-2"><label>Description</label><input type="text" required placeholder="e.g. Wall P1" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} /></div>
                                    </div>
                                    <div className="form-row" style={{ width: '100%' }}>
                                        <div className="form-group"><label>Length (m)</label><input type="number" step="0.01" value={itemForm.wallDims?.l || ''} onChange={e => {
                                            const val = parseFloat(e.target.value) || 0;
                                            const h = itemForm.wallDims?.h || 0;
                                            const area = val * h;
                                            setItemForm({ ...itemForm, wallDims: { ...itemForm.wallDims, l: val }, manualArea: area > 0 ? parseFloat(area.toFixed(2)) : itemForm.manualArea });
                                        }} placeholder="Optional" /></div>
                                        <div className="form-group"><label>Height (m)</label><input type="number" step="0.01" value={itemForm.wallDims?.h || ''} onChange={e => {
                                            const val = parseFloat(e.target.value) || 0;
                                            const l = itemForm.wallDims?.l || 0;
                                            const area = l * val;
                                            setItemForm({ ...itemForm, wallDims: { ...itemForm.wallDims, h: val }, manualArea: area > 0 ? parseFloat(area.toFixed(2)) : itemForm.manualArea });
                                        }} placeholder="Optional" /></div>
                                        <div className="form-group"><label>OR Area (m2)</label><input type="number" step="0.01" value={itemForm.manualArea || ''} onChange={e => setItemForm({ ...itemForm, manualArea: parseFloat(e.target.value) || 0 })} placeholder="Enter Area" /></div>
                                    </div>

                                    {/* Deductions Section for Plaster */}
                                    <div className="card p-3 mb-3 bg-gray-50 border border-gray-200 shadow-sm rounded-lg">
                                        <h5 className="text-sm font-bold mb-3 text-gray-700 flex items-center gap-2">
                                            <span role="img" aria-label="cut">✂️</span> Deductions (Doors/Windows)
                                        </h5>

                                        {/* Deduction Inputs */}
                                        <div className="grid grid-cols-12 gap-2 mb-3 items-end">
                                            <div className="col-span-4">
                                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Name</label>
                                                <input type="text" placeholder="e.g. D1" value={newDeduction.name} onChange={e => setNewDeduction({ ...newDeduction, name: e.target.value })} className="w-full form-input text-sm p-1 border rounded" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-xs font-semibold text-gray-600 mb-1 block">L (m)</label>
                                                <input type="number" placeholder="0.00" value={newDeduction.l} onChange={e => setNewDeduction({ ...newDeduction, l: parseFloat(e.target.value) })} className="w-full form-input text-sm p-1 border rounded" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-xs font-semibold text-gray-600 mb-1 block">H (m)</label>
                                                <input type="number" placeholder="0.00" value={newDeduction.h} onChange={e => setNewDeduction({ ...newDeduction, h: parseFloat(e.target.value) })} className="w-full form-input text-sm p-1 border rounded" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Qty</label>
                                                <input type="number" placeholder="1" value={newDeduction.count} onChange={e => setNewDeduction({ ...newDeduction, count: parseFloat(e.target.value) })} className="w-full form-input text-sm p-1 border rounded" />
                                            </div>
                                            <div className="col-span-2">
                                                <button type="button" className="btn btn-secondary btn-sm w-full bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200" onClick={addDeduction}>+ Add</button>
                                            </div>
                                        </div>

                                        {/* Deduction List */}
                                        {itemForm.deductions && itemForm.deductions.length > 0 && (
                                            <div className="bg-white border border-gray-200 rounded-md overflow-hidden mt-3">
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                                    <thead style={{ backgroundColor: '#f9fafb', color: '#6b7280', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                                                        <tr>
                                                            <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Name</th>
                                                            <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Size (L x H)</th>
                                                            <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Qty</th>
                                                            <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {itemForm.deductions.map((d, idx) => (
                                                            <tr key={idx} style={{ borderBottom: idx === itemForm.deductions.length - 1 ? 'none' : '1px solid #f3f4f6' }}>
                                                                <td style={{ padding: '12px 16px', color: '#111827', fontWeight: '500' }}>{d.name || <span className="text-gray-400 italic">--</span>}</td>
                                                                <td style={{ padding: '12px 16px', color: '#4b5563' }}>{d.l}m x {d.h}m</td>
                                                                <td style={{ padding: '12px 16px', color: '#111827', textAlign: 'center' }}>{d.count}</td>
                                                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                                    <button type="button"
                                                                        onClick={() => removeDeduction(idx)}
                                                                        style={{ color: '#ef4444', padding: '4px 8px', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                                                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                                                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    <div className="form-row" style={{ width: '100%' }}>
                                        <div className="form-group"><label>Thickness (mm)</label><input type="number" value={itemForm.thickness || activeEstimation.defaultPlasterThickness || 12} onChange={e => setItemForm({ ...itemForm, thickness: parseFloat(e.target.value) || 0 })} required /></div>
                                        <div className="form-group">
                                            <label>Ratio</label>
                                            <select value={itemForm.ratio || activeEstimation.defaultPlasterRatio || '1:4'} onChange={e => setItemForm({ ...itemForm, ratio: e.target.value })}>
                                                <option value="1:3">1:3</option>
                                                <option value="1:4">1:4</option>
                                                <option value="1:5">1:5</option>
                                                <option value="1:6">1:6</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-row" style={{ width: '100%' }}>
                                        <div className="form-group">
                                            <label>Wet Volume (m3)</label>
                                            <input type="number" readOnly value={(() => {
                                                const area = parseFloat(itemForm.manualArea) || ((itemForm.wallDims?.l || 0) * (itemForm.wallDims?.h || 0));
                                                const deductionArea = (itemForm.deductions || []).reduce((sum, d) => sum + ((parseFloat(d.l) || 0) * (parseFloat(d.h) || 0) * (parseFloat(d.count) || 0)), 0);
                                                const netArea = Math.max(0, area - deductionArea);
                                                const thickness = itemForm.thickness || activeEstimation.defaultPlasterThickness || 12;
                                                return (netArea * (thickness / 1000)).toFixed(3);
                                            })()} className="bg-gray-100" />
                                        </div>
                                        <div className="form-group">
                                            <label>Dry Volume (m3)</label>
                                            <input type="number" readOnly value={(() => {
                                                const area = parseFloat(itemForm.manualArea) || ((itemForm.wallDims?.l || 0) * (itemForm.wallDims?.h || 0));
                                                const deductionArea = (itemForm.deductions || []).reduce((sum, d) => sum + ((parseFloat(d.l) || 0) * (parseFloat(d.h) || 0) * (parseFloat(d.count) || 0)), 0);
                                                const netArea = Math.max(0, area - deductionArea);
                                                const thickness = itemForm.thickness || activeEstimation.defaultPlasterThickness || 12;
                                                return ((netArea * (thickness / 1000)) * 1.33).toFixed(3);
                                            })()} className="bg-gray-100" />
                                        </div>
                                    </div>
                                    <div className="form-actions">
                                        <button type="submit" className="btn btn-primary">{editingItemIndex !== null ? 'Update Item' : 'Add Item'}</button>
                                        {editingItemIndex !== null && <button type="button" className="btn btn-secondary" onClick={() => { setEditingItemIndex(null); setItemForm({ description: '', unit: '', quantity: '', rate: '', wallDims: { l: 0, h: 0 }, thickness: 0, ratio: '1:4', manualArea: 0 }); }}>Cancel</button>}
                                    </div>
                                </form >
                            ) : isFlooring ? (
                                <form onSubmit={handleAddItem} className="item-form">
                                    <div className="form-row" style={{ width: '100%' }}>
                                        <div className="form-group grow-2"><label>Description</label><input type="text" required placeholder="e.g. Master Bedroom" value={flooringForm.description} onChange={e => setFlooringForm({ ...flooringForm, description: e.target.value })} /></div>
                                    </div>
                                    <div className="form-row" style={{ width: '100%' }}>
                                        <div className="form-group"><label>Room L (m)</label><input type="number" step="0.01" required value={flooringForm.roomDims.l} onChange={e => setFlooringForm({ ...flooringForm, roomDims: { ...flooringForm.roomDims, l: parseFloat(e.target.value) || 0 } })} /></div>
                                        <div className="form-group"><label>Room W (m)</label><input type="number" step="0.01" required value={flooringForm.roomDims.w} onChange={e => setFlooringForm({ ...flooringForm, roomDims: { ...flooringForm.roomDims, w: parseFloat(e.target.value) || 0 } })} /></div>
                                    </div>
                                    <div className="form-row" style={{ width: '100%' }}>
                                        <div className="form-group"><label>Calc Area (m2)</label>
                                            <input
                                                type="number"
                                                value={flooringForm.manualArea || (flooringForm.roomDims.l * flooringForm.roomDims.w).toFixed(2)}
                                                onChange={e => setFlooringForm({ ...flooringForm, manualArea: parseFloat(e.target.value) || '' })}
                                                className={flooringForm.manualArea ? "bg-white border-blue-500" : "bg-gray-100"}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-actions">
                                        <button type="submit" className="btn btn-primary">{editingItemIndex !== null ? 'Update Item' : 'Add Item'}</button>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handleAddItem} className="item-form">
                                    <div className="form-group grow-2"><label>Description</label><input type="text" required placeholder="e.g. Cement Bags" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} /></div>
                                    <div className="form-group"><label>Unit</label><input type="text" required placeholder="e.g. Bags" value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })} /></div>
                                    <div className="form-group"><label>Quantity</label><input type="number" required placeholder="0.00" value={itemForm.quantity} onChange={e => setItemForm({ ...itemForm, quantity: e.target.value })} /></div>
                                    <div className="form-group"><label>Rate</label><input type="number" required placeholder="0.00" value={itemForm.rate} onChange={e => setItemForm({ ...itemForm, rate: e.target.value })} /></div>
                                    <div className="form-actions">
                                        <button type="submit" className="btn btn-primary">{editingItemIndex !== null ? 'Update Item' : 'Add Item'}</button>
                                        {editingItemIndex !== null && <button type="button" className="btn btn-secondary" onClick={() => { setEditingItemIndex(null); setItemForm({ description: '', unit: '', quantity: '', rate: '', wallDims: { l: 0, h: 0 }, thickness: 0, ratio: '1:4', manualArea: 0 }); }}>Cancel</button>}
                                    </div>
                                </form>
                            )
                            }
                        </div >
                    )}
                    <div className="card items-list-card">
                        <h3>Estimation Items</h3>
                        {activeItems.length === 0 ? <p className="text-muted text-center p-4">No items added yet.</p> : (
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        {isSteel ? (
                                            <tr><th>Mark</th><th>Description</th><th>Shape</th><th>Dia</th><th>Spacing</th><th>No. Mem</th><th>Bars/Mem</th><th>Total Bars</th><th>Segment Lengths</th><th>Cut Len (m)</th><th>Total Len (m)</th><th>Total Wt (kg)</th>{canEditCurrent && <th className="no-print">Actions</th>}</tr>
                                        ) : isConcrete ? (
                                            <tr><th>Description</th><th>Shape</th><th>Dimensions</th><th>1 Item (m3)</th><th>Count</th><th>Quantity (m3)</th>{canEditCurrent && <th className="no-print">Actions</th>}</tr>
                                        ) : isMasonry ? (
                                            <tr><th>Description</th><th>Material</th><th>Wall Dims (L x H x T)</th><th>Deductions</th><th>Mortar</th><th>Count</th><th>Mortar Vol (m3)</th>{canEditCurrent && <th className="no-print">Actions</th>}</tr>
                                        ) : isPlaster ? (
                                            <tr><th>Description</th><th>Dimensions (L x H)</th><th>Deductions</th><th>Thickness (mm)</th><th>Ratio</th><th>Area (m2)</th><th>Volume (m3)</th>{canEditCurrent && <th className="no-print">Actions</th>}</tr>
                                        ) : isFlooring ? (
                                            <tr><th>Description</th><th>Room Dims</th><th>Area (m2)</th><th>Tile Size</th><th>Count (inc. Waste)</th><th>Bedding</th><th>Ratio</th><th>Mortar Vol</th>{canEditCurrent && <th className="no-print">Actions</th>}</tr>
                                        ) : (
                                            <tr><th>Description</th><th>Unit</th><th>Quantity</th><th>Rate</th><th>Amount</th>{canEditCurrent && <th className="no-print">Actions</th>}</tr>
                                        )}
                                    </thead>
                                    <tbody>
                                        {activeItems.map((item, index) => (
                                            <tr key={index}>
                                                {isSteel ? (
                                                    <>
                                                        <td>{item.barMark}</td>
                                                        <td>{item.description}</td>
                                                        <td>
                                                            {(() => {
                                                                const sId = item.shape;
                                                                // Check standard shapes
                                                                if (BAR_SHAPES[sId]) return BAR_SHAPES[sId].name;

                                                                // Check custom shapes safely (convert to string to ensure matching)
                                                                if (customShapes && customShapes.length > 0) {
                                                                    const custom = customShapes.find(s => String(s.id) === String(sId) || String(s._id) === String(sId));
                                                                    if (custom) return custom.name;
                                                                }

                                                                // Fallback
                                                                return sId;
                                                            })()}
                                                        </td>
                                                        <td>{item.dia}</td><td>{item.spacing}</td><td>{item.noMembers}</td><td>{item.barsPerMember}</td>
                                                        <td>{(parseFloat(item.noMembers) || 0) * (parseFloat(item.barsPerMember) || 0)}</td>
                                                        <td className="text-sm text-muted">
                                                            {item.dims ?
                                                                Object.entries(item.dims)
                                                                    .filter(([k]) => !k.endsWith('_mult'))
                                                                    .map(([k, v]) => `${k}=${v}`).join(', ')
                                                                : '-'
                                                            }
                                                        </td>
                                                        <td>{parseFloat(item.cuttingLength).toFixed(3)}</td><td>{parseFloat(item.totalLength).toFixed(2)}</td><td>{parseFloat(item.totalWeight).toFixed(2)}</td>
                                                    </>
                                                ) : isConcrete ? (
                                                    <>
                                                        <td>{item.description}</td>
                                                        <td>{CONCRETE_SHAPES[item.shape]?.label || item.shape}</td>
                                                        <td>{item.dims ? Object.entries(item.dims).map(([k, v]) => `${k}=${v}`).join(', ') : '-'}</td>
                                                        <td>{item.volume?.toFixed(3)}</td>
                                                        <td>{item.count}</td>
                                                        <td>{item.quantity}</td>
                                                    </>
                                                ) : isMasonry ? (
                                                    <>
                                                        <td>{item.description}</td>
                                                        <td>{MASONRY_MATERIALS[item.material]?.label || item.material}</td>
                                                        <td>{`${item.wallDims?.l}m x ${item.wallDims?.h}m x ${item.wallDims?.t}m`}</td>
                                                        <td className="text-sm">
                                                            {item.deductions && item.deductions.length > 0 ? (
                                                                <ul className="list-disc pl-4 m-0 text-muted">
                                                                    {item.deductions.map((d, i) => (
                                                                        <li key={i}>{d.name || 'D'}: {d.l}x{d.h}m ({d.count})</li>
                                                                    ))}
                                                                </ul>
                                                            ) : '-'}
                                                        </td>
                                                        <td>{item.mortarRatio}</td>
                                                        <td>{item.count}</td>
                                                        <td>{item.mortarRatio === 'CHEMICAL' ?
                                                            <div>
                                                                <div>{`${calculateMasonry(item).chemicalWeight?.toFixed(2)} kg`}</div>
                                                                <div className="text-xs text-muted">{`${calculateMasonry(item).chemicalBags?.toFixed(1)} Bags (40kg)`}</div>
                                                            </div>
                                                            : item.mortar?.toFixed(3)}</td>
                                                    </>
                                                ) : isPlaster ? (
                                                    <>
                                                        <td>{item.description}</td>
                                                        <td>{item.manualArea ? `${item.manualArea} m2 (Manual)` : `${item.wallDims?.l}m x ${item.wallDims?.h}m`}</td>
                                                        <td className="text-sm">
                                                            {item.deductions && item.deductions.length > 0 ? (
                                                                <ul className="list-disc pl-4 m-0 text-muted">
                                                                    {item.deductions.map((d, i) => (
                                                                        <li key={i}>{d.name || 'D'}: {d.l}x{d.h}m ({d.count})</li>
                                                                    ))}
                                                                </ul>
                                                            ) : '-'}
                                                        </td>
                                                        <td>{item.thickness}</td>
                                                        <td>{item.ratio}</td>
                                                        <td>{item.area?.toFixed(2)}</td>
                                                        <td>{item.volume?.toFixed(3)}</td>
                                                    </>

                                                ) : isFlooring ? (
                                                    <>
                                                        <td>{item.description}</td>
                                                        <td>{item.roomDims?.l}m x {item.roomDims?.w}m</td>
                                                        <td>{item.area?.toFixed(2)}</td>
                                                        <td>{item.tileSize}</td>
                                                        <td><strong>{item.tileCount}</strong> <span className="text-xs text-muted">({item.wastage}%)</span></td>
                                                        <td>{item.beddingThickness}mm</td>
                                                        <td>{item.ratio}</td>
                                                        <td>{item.volume?.toFixed(3)} m3</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td>{item.description}</td><td>{item.unit}</td><td>{item.quantity}</td><td>{item.rate}</td><td>{(item.quantity * item.rate).toFixed(2)}</td>
                                                    </>
                                                )}
                                                {canEditCurrent && <td className="no-print"><button className="btn-icon" onClick={() => handleEditItem(index)}>✎</button><button className="btn-icon delete" onClick={() => handleDeleteItem(index)}>🗑️</button></td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            {isMasonry ? (
                                                <>
                                                    <td colSpan={2} style={{ textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
                                                    <td>
                                                        <div style={{ fontWeight: 'bold' }}>{activeItems.reduce((sum, item) => sum + (parseFloat(item.wallDims?.l) || 0), 0).toFixed(2)} m</div>
                                                        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-left" style={{ minWidth: '150px' }}>
                                                            <strong>Length Analysis:</strong>
                                                            {Object.entries(activeItems.reduce((acc, item) => {
                                                                const k = `${item.wallDims?.h}m H x ${item.wallDims?.t}m T`;
                                                                acc[k] = (acc[k] || 0) + (parseFloat(item.wallDims?.l) || 0);
                                                                return acc;
                                                            }, {})).map(([key, len]) => (
                                                                <div key={key} className="flex justify-between text-muted">
                                                                    <span>{key}:</span>
                                                                    <span>{len.toFixed(2)}m</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td></td>
                                                    <td></td>
                                                    <td style={{ fontWeight: 'bold' }}>{activeItems.reduce((sum, item) => sum + (parseFloat(item.count) || 0), 0)} Nos</td>
                                                    <td>
                                                        <div>
                                                            <div className="text-sm text-muted">{activeItems.reduce((sum, item) => sum + (calculateMasonry(item).mortarDry || 0), 0).toFixed(3)} m3 Mortar</div>
                                                            <div className="text-sm text-muted">{activeItems.reduce((sum, item) => sum + (calculateMasonry(item).chemicalWeight || 0), 0).toFixed(2)} kg Chemical</div>
                                                            <div className="text-xs text-muted">({activeItems.reduce((sum, item) => sum + (calculateMasonry(item).chemicalBags || 0), 0).toFixed(1)} Bags)</div>
                                                        </div>
                                                    </td>
                                                    <td className="no-print"></td>
                                                </>
                                            ) : (
                                                <>
                                                    <td colSpan={isSteel ? 10 : isConcrete ? 5 : isPlaster ? 5 : isFlooring ? 4 : 4} style={{ textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
                                                    <td style={{ fontWeight: 'bold' }}>
                                                        {isSteel ? `${totalSteelWeight.toFixed(2)} kg` :
                                                            isConcrete ? `${activeItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0).toFixed(3)} m3` :
                                                                isPlaster ? (
                                                                    <div>
                                                                        <div>{activeItems.reduce((sum, item) => sum + (parseFloat(item.area) || 0), 0).toFixed(2)} m2 Area</div>
                                                                        <div className="text-sm text-muted">{activeItems.reduce((sum, item) => sum + (parseFloat(item.volume) || 0), 0).toFixed(3)} m3 Vol</div>
                                                                    </div>
                                                                ) : isFlooring ? (
                                                                    <div>
                                                                        <div>{activeItems.reduce((sum, item) => sum + (parseFloat(item.area) || 0), 0).toFixed(2)} m2</div>
                                                                        <div style={{ marginTop: '5px' }}>{activeItems.reduce((sum, item) => sum + (parseFloat(item.tileCount) || 0), 0)} Tiles</div>
                                                                    </div>
                                                                ) : totalAmount.toFixed(2)}
                                                    </td>
                                                    {isFlooring && (
                                                        <>
                                                            <td></td>
                                                            <td></td>
                                                            <td style={{ fontWeight: 'bold' }}>{activeItems.reduce((sum, item) => sum + (parseFloat(item.volume) || 0), 0).toFixed(3)} m3</td>
                                                        </>
                                                    )}
                                                    <td className="no-print"></td>
                                                </>
                                            )}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>

                    {
                        isSteel && activeItems.length > 0 && (
                            <div className="card mt-4 p-4">
                                <h3>Material Requirement</h3>
                                <div className="material-summary-grid">
                                    <div className="material-card cement">
                                        <div className="material-label">Total Steel</div>
                                        <div className="material-value">
                                            {totalSteelWeight.toFixed(2)} <span className="material-unit">kg</span>
                                        </div>
                                        <div className="material-icon">🏗️</div>
                                    </div>
                                    <div className="material-card sand">
                                        <div className="material-label">Total Bending Wire</div>
                                        <div className="material-value">
                                            {(totalSteelWeight / 100).toFixed(2)} <span className="material-unit">kg</span>
                                        </div>
                                        <div className="material-icon">➰</div>
                                    </div>
                                    <div className="material-card aggregate">
                                        <div className="material-label">Total Cover Blocks</div>
                                        <div className="material-value">
                                            {Math.ceil((totalSteelWeight / 100) * 3)} <span className="material-unit">Nos</span>
                                        </div>
                                        <div className="material-icon">🧊</div>
                                    </div>
                                </div>
                                <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
                                    <h4 style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase', fontWeight: 600 }}>Weight Summary by Diameter</h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                        {Object.entries(weightByDia)
                                            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                                            .map(([dia, wt]) => (
                                                <div key={dia} style={{
                                                    background: '#f1f5f9',
                                                    padding: '8px 12px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.9rem',
                                                    color: '#334155',
                                                    border: '1px solid #e2e8f0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}>
                                                    <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{dia}mm:</span>
                                                    <span>{wt.toFixed(2)} kg</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {
                        isConcrete && activeItems.length > 0 && (
                            <div className="card mt-4 p-4">
                                <h3>Material Requirement <span className="text-sm font-normal text-muted">(Ratio: {activeEstimation.defaultConcreteRatio || '1:1.5:3'})</span></h3>
                                <div className="material-summary-grid">
                                    <div className="material-card cement">
                                        <div className="material-label">Total Cement</div>
                                        <div className="material-value">
                                            {(() => {
                                                const totalVol = activeItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
                                                const parts = (activeEstimation.defaultConcreteRatio || '1:1.5:3').split(':').map(Number);
                                                if (parts.length !== 3 || parts.some(isNaN)) return '-';
                                                const totalParts = parts[0] + parts[1] + parts[2];
                                                const dryVol = totalVol * 1.54;
                                                return Math.ceil((dryVol * parts[0] / totalParts) / 0.035);
                                            })()} <span className="material-unit">Bags</span>
                                        </div>
                                        <div className="material-icon">🧱</div>
                                    </div>
                                    <div className="material-card sand">
                                        <div className="material-label">Total Sand</div>
                                        <div className="material-value">
                                            {(() => {
                                                const totalVol = activeItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
                                                const parts = (activeEstimation.defaultConcreteRatio || '1:1.5:3').split(':').map(Number);
                                                if (parts.length !== 3 || parts.some(isNaN)) return '-';
                                                const totalParts = parts[0] + parts[1] + parts[2];
                                                const dryVol = totalVol * 1.54;
                                                return (dryVol * parts[1] / totalParts).toFixed(2);
                                            })()} <span className="material-unit">m3</span>
                                        </div>
                                        <div className="material-icon">⏳</div>
                                    </div>
                                    <div className="material-card aggregate">
                                        <div className="material-label">Total Aggregate</div>
                                        <div className="material-value">
                                            {(() => {
                                                const totalVol = activeItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
                                                const parts = (activeEstimation.defaultConcreteRatio || '1:1.5:3').split(':').map(Number);
                                                if (parts.length !== 3 || parts.some(isNaN)) return '-';
                                                const totalParts = parts[0] + parts[1] + parts[2];
                                                const dryVol = totalVol * 1.54;
                                                return (dryVol * parts[2] / totalParts).toFixed(2);
                                            })()} <span className="material-unit">m3</span>
                                        </div>
                                        <div className="material-icon">🪨</div>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {
                        isMasonry && activeItems.length > 0 && (
                            <div className="card mt-4 p-4">
                                <h3>Material Requirement</h3>
                                <div className="material-summary-grid">
                                    <div className="material-card cement">
                                        <div className="material-label">Total Cement</div>
                                        <div className="material-value">
                                            {Math.ceil(activeItems.reduce((sum, item) => {
                                                if (item.mortarRatio === 'CHEMICAL') return sum;
                                                const ratioParts = item.mortarRatio.split(':').map(Number);
                                                const totalParts = ratioParts[0] + ratioParts[1];
                                                const cementVol = (item.mortar || 0) * (ratioParts[0] / totalParts);
                                                return sum + (cementVol / 0.035); // 0.035 m3 per bag
                                            }, 0))} <span className="material-unit">Bags</span>
                                        </div>
                                        <div className="material-icon">🧱</div>
                                    </div>
                                    <div className="material-card sand">
                                        <div className="material-label">Total Sand</div>
                                        <div className="material-value">
                                            {activeItems.reduce((sum, item) => {
                                                if (item.mortarRatio === 'CHEMICAL') return sum;
                                                const ratioParts = item.mortarRatio.split(':').map(Number);
                                                const totalParts = ratioParts[0] + ratioParts[1];
                                                const sandVol = (item.mortar || 0) * (ratioParts[1] / totalParts);
                                                return sum + sandVol;
                                            }, 0).toFixed(2)} <span className="material-unit">m3</span>
                                        </div>
                                        <div className="material-icon">⏳</div>
                                    </div>
                                    <div className="material-card chemical">
                                        <div className="material-label">Total Chemical</div>
                                        <div className="material-value">
                                            {Math.ceil(activeItems.reduce((sum, item) => {
                                                if (item.mortarRatio !== 'CHEMICAL') return sum;
                                                return sum + (calculateMasonry(item).chemicalWeight || 0);
                                            }, 0))} <span className="material-unit">kg</span>
                                        </div>
                                        <div className="material-icon">🧪</div>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {
                        isPlaster && activeItems.length > 0 && (
                            <div className="card mt-4 p-4">
                                <h3>Material Requirement <span className="text-sm font-normal text-muted">(Ratio: {activeEstimation.defaultPlasterRatio || '1:4'})</span></h3>
                                <div className="material-summary-grid">
                                    <div className="material-card cement">
                                        <div className="material-label">Total Cement</div>
                                        <div className="material-value">
                                            {Math.ceil(activeItems.reduce((sum, item) => {
                                                const ratioParts = (item.ratio || '1:4').split(':').map(Number);
                                                const totalParts = ratioParts[0] + ratioParts[1];
                                                const dryVol = (item.volume || 0) * 1.33;
                                                const cementVol = dryVol * (ratioParts[0] / totalParts);
                                                return sum + (cementVol / 0.035);
                                            }, 0))} <span className="material-unit">Bags</span>
                                        </div>
                                        <div className="material-icon">🧱</div>
                                    </div>
                                    <div className="material-card sand">
                                        <div className="material-label">Total Sand</div>
                                        <div className="material-value">
                                            {activeItems.reduce((sum, item) => {
                                                const ratioParts = (item.ratio || '1:4').split(':').map(Number);
                                                const totalParts = ratioParts[0] + ratioParts[1];
                                                const dryVol = (item.volume || 0) * 1.33;
                                                return sum + (dryVol * (ratioParts[1] / totalParts));
                                            }, 0).toFixed(2)} <span className="material-unit">m3</span>
                                        </div>
                                        <div className="material-icon">⏳</div>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {
                        isFlooring && activeItems.length > 0 && (
                            <div className="card mt-4 p-4">
                                <h3>Material Requirement <span className="text-sm font-normal text-muted">(Ratio: {activeEstimation.defaultFlooringRatio || '1:6'})</span></h3>
                                <div className="material-summary-grid">
                                    <div className="material-card cement">
                                        <div className="material-label">Total Cement</div>
                                        <div className="material-value">
                                            {Math.ceil(activeItems.reduce((sum, item) => {
                                                if (item.ratio === 'CHEMICAL') return sum;
                                                const ratioParts = (item.ratio || '1:6').split(':').map(Number);
                                                const totalParts = ratioParts[0] + ratioParts[1];
                                                const dryVol = (item.volume || 0) * 1.33;
                                                const cementVol = dryVol * (ratioParts[0] / totalParts);
                                                // Slurry: 3.5kg/m2 -> Area * 3.5 / 50
                                                const area = (item.roomDims?.l || 0) * (item.roomDims?.w || 0);
                                                const slurryBags = (area * 3.5) / 50;
                                                return sum + (cementVol / 0.035) + slurryBags;
                                            }, 0))} <span className="material-unit">Bags</span>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'normal' }}>(inc. Slurry)</div>
                                        </div>
                                        <div className="material-icon">🧱</div>
                                    </div>
                                    <div className="material-card sand">
                                        <div className="material-label">Total Sand</div>
                                        <div className="material-value">
                                            {activeItems.reduce((sum, item) => {
                                                if (item.ratio === 'CHEMICAL') return sum;
                                                const ratioParts = (item.ratio || '1:6').split(':').map(Number);
                                                const totalParts = ratioParts[0] + ratioParts[1];
                                                const dryVol = (item.volume || 0) * 1.33;
                                                return sum + (dryVol * (ratioParts[1] / totalParts));
                                            }, 0).toFixed(2)} <span className="material-unit">m3</span>
                                        </div>
                                        <div className="material-icon">⏳</div>
                                    </div>
                                    <div className="material-card" style={{ borderBottom: '4px solid #8b5cf6' }}>
                                        <div className="material-label">Grout / Filler</div>
                                        <div className="material-value">
                                            {Math.ceil(activeItems.reduce((sum, item) => {
                                                const area = (item.roomDims?.l || 0) * (item.roomDims?.w || 0);
                                                return sum + (area * (50 / 70));
                                            }, 0))} <span className="material-unit">kg</span>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'normal' }}>(50kg/70m2)</div>
                                        </div>
                                        <div className="material-icon">✨</div>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                </div >
                <style>{`
                    .estimation-detail { max-width: 1200px; margin: 0 auto; padding-bottom: 100px; }
                    .page-header { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; }
                    .header-content { flex: 1; }
                    .header-content h1 { margin: 0 0 5px 0; font-size: 1.8rem; color: #0f172a; }
                    .header-actions { display: flex; gap: 10px; }
                    .item-form-card { padding: 20px; margin-bottom: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
                    .item-form { display: flex; flex-wrap: wrap; gap: 15px; align-items: flex-end; }
                    .steel-form { display: block; }
                    .form-row { display: flex; gap: 15px; margin-bottom: 15px; }
                    .form-group { flex: 1; min-width: 150px; }
                    .grow-2 { flex: 2; }
                    .form-group label { display: block; margin-bottom: 5px; font-weight: 500; font-size: 0.9rem; color: #475569; }
                    .form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; }
                    .items-list-card { background: white; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
                    .items-list-card h3 { padding: 15px 20px; margin: 0; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-size: 1.1rem; }
                    .data-table { width: 100%; border-collapse: collapse; }
                    .data-table th, .data-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #e2e8f0; }
                    .data-table th { background: #f8fafc; font-weight: 600; color: #475569; font-size: 0.9rem; }
                    .segments-table-container { background: white; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; }
                    .segments-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
                    .segments-table th { text-align: left; padding: 5px; color: #64748b; font-weight: 500; border-bottom: 1px solid #e2e8f0; }
                    .segments-table td { padding: 5px; }
                    .seg-label { font-weight: bold; color: #334155; width: 50px; }
                    .input-cell { width: 100%; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; }
                    .deduction-summary { font-size: 0.85rem; color: #64748b; padding-top: 8px; border-top: 1px dashed #e2e8f0; }
                    .material-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 15px; }
                    .material-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; position: relative; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: transform 0.2s, box-shadow 0.2s; }
                    .material-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                    .material-card.cement { border-bottom: 4px solid #3b82f6; }
                    .material-card.sand { border-bottom: 4px solid #eab308; }
                    .material-card.aggregate { border-bottom: 4px solid #64748b; }
                    .material-card.chemical { border-bottom: 4px solid #10b981; }
                    .material-label { font-size: 0.85rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
                    .material-value { font-size: 1.8rem; font-weight: 700; color: #0f172a; }
                    .material-unit { font-size: 0.9rem; font-weight: 500; color: #94a3b8; margin-left: 4px; }
                    .material-icon { position: absolute; top: 15px; right: 15px; font-size: 1.5rem; opacity: 0.2; }
                    @media print { .no-print { display: none !important; } .estimation-detail { margin: 0; padding: 0; max-width: none; } .card { border: none; box-shadow: none; } }
                `}</style>
            </div >
        );
    }


    // 3. Folder View (Main Page)
    if (!activeFolder) {
        return (
            <div className="estimation-container">
                <div className="header-actions">
                    <h2>Estimation Folders</h2>
                    {/* New Estimate button removed from main view */}
                </div>
                <div className="folders-grid">
                    {['Steel', 'Concrete', 'Masonry', 'Plaster', 'Flooring'].map(folder => (
                        <div key={folder} className="folder-card" onClick={() => setActiveFolder(folder)}>
                            <div className="folder-icon"></div>
                            <h3>{folder} Estimates</h3>
                            <p>{estimations.filter(e => e.type === folder.toLowerCase()).length} files</p>
                        </div>
                    ))}
                </div>

                {/* New Estimate Modal (Reused) */}
                {showModal && (
                    <div className="modal-overlay">
                        <div className="modal-content premium-modal">
                            <div className="modal-header">
                                <h3> New Estimate {activeFolder ? `(${activeFolder})` : ''}</h3>
                                <button className="close-btn" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleCreateSubmit}>
                                <div className="form-group">
                                    <label>Title</label>
                                    <input type="text" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Project Name / Title" />
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description" />
                                </div>
                                {!activeFolder && (
                                    <div className="form-group">
                                        <label>Type</label>
                                        <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                            <option value="steel">Steel BBS</option>
                                            <option value="concrete">Concrete</option>
                                            <option value="masonry">Masonry</option>
                                            <option value="plaster">Plaster</option>
                                            <option value="flooring">Flooring</option>
                                        </select>
                                    </div>
                                )}
                                {(formData.type === 'concrete' || activeFolder?.toLowerCase() === 'concrete') && (
                                    <div className="form-row" style={{ gap: '10px', marginTop: '15px' }}>
                                        <div className="form-group">
                                            <label>Grade of Concrete</label>
                                            <select value={formData.defaultConcreteGrade || 'M20'} onChange={e => {
                                                const grade = e.target.value;
                                                const ratio = CONCRETE_GRADES[grade] || '';
                                                setFormData({ ...formData, defaultConcreteGrade: grade, defaultConcreteRatio: ratio });
                                            }}>
                                                {Object.keys(CONCRETE_GRADES).map(g => <option key={g} value={g}>{g}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Ratio (Cement:Sand:Agg)</label>
                                            <input type="text" value={formData.defaultConcreteRatio || ''} onChange={e => setFormData({ ...formData, defaultConcreteRatio: e.target.value })} placeholder="e.g. 1:1.5:3" />
                                        </div>
                                    </div>
                                )}
                                {(formData.type === 'masonry' || activeFolder === 'Masonry') && (
                                    <>
                                        <h4 style={{ marginTop: '15px', marginBottom: '10px', color: '#334155' }}>Masonry Settings</h4>
                                        <div className="form-group">
                                            <label>Default Material</label>
                                            <select value={formData.defaultMaterial || 'AAC'} onChange={e => setFormData({ ...formData, defaultMaterial: e.target.value })}>
                                                {Object.entries(MASONRY_MATERIALS).map(([key, val]) => (
                                                    <option key={key} value={key}>{val.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {formData.defaultMaterial === 'CUSTOM' && (
                                            <div className="form-row" style={{ gap: '10px' }}>
                                                <div className="form-group"><label>Length (mm)</label><input type="number" value={formData.defaultCustomDims?.l || 0} onChange={e => setFormData({ ...formData, defaultCustomDims: { ...formData.defaultCustomDims, l: parseFloat(e.target.value) || 0 } })} /></div>
                                                <div className="form-group"><label>Width (mm)</label><input type="number" value={formData.defaultCustomDims?.w || 0} onChange={e => setFormData({ ...formData, defaultCustomDims: { ...formData.defaultCustomDims, w: parseFloat(e.target.value) || 0 } })} /></div>
                                                <div className="form-group"><label>Height (mm)</label><input type="number" value={formData.defaultCustomDims?.h || 0} onChange={e => setFormData({ ...formData, defaultCustomDims: { ...formData.defaultCustomDims, h: parseFloat(e.target.value) || 0 } })} /></div>
                                            </div>
                                        )}
                                        <div className="form-group">
                                            <label>Mortar Ratio</label>
                                            <select value={formData.defaultMortarRatio || '1:6'} onChange={e => {
                                                const ratio = e.target.value;
                                                const thickness = ratio === 'CHEMICAL' ? 3 : 10;
                                                setFormData({ ...formData, defaultMortarRatio: ratio, defaultMortarThickness: thickness });
                                            }}>
                                                <option value="1:3">1:3</option>
                                                <option value="1:4">1:4</option>
                                                <option value="1:5">1:5</option>
                                                <option value="1:6">1:6</option>
                                                <option value="CHEMICAL">Chemical</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Mortar Thickness (mm)</label>
                                            <input type="number" value={formData.defaultMortarThickness || 10} onChange={e => setFormData({ ...formData, defaultMortarThickness: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                        <div className="form-row" style={{ gap: '10px' }}>
                                            <div className="form-group"><label>Wall Length (m)</label><input type="number" step="0.01" value={formData.wallDims?.l || 0} onChange={e => setFormData({ ...formData, wallDims: { ...formData.wallDims, l: parseFloat(e.target.value) || 0 } })} /></div>
                                            <div className="form-group"><label>Wall Height (m)</label><input type="number" step="0.01" value={formData.wallDims?.h || 0} onChange={e => setFormData({ ...formData, wallDims: { ...formData.wallDims, h: parseFloat(e.target.value) || 0 } })} /></div>
                                            <div className="form-group"><label>Wall Thickness (mm)</label><input type="number" value={formData.wallDims?.t || 0} onChange={e => setFormData({ ...formData, wallDims: { ...formData.wallDims, t: parseFloat(e.target.value) || 0 } })} /></div>
                                        </div>
                                        <div className="deduction-summary">
                                            <strong>Result: </strong>
                                            {(() => {
                                                const res = calculateMasonry({
                                                    material: formData.defaultMaterial || 'AAC',
                                                    customDims: formData.defaultCustomDims || { l: 0, w: 0, h: 0 },
                                                    wallDims: formData.wallDims || { l: 0, h: 0, t: 0 },
                                                    mortarRatio: formData.defaultMortarRatio || '1:6',
                                                    mortarThickness: formData.defaultMortarThickness || 10
                                                });
                                                return `${res.count} Blocks, ${res.mortarDry.toFixed(3)} m3 Dry Mortar (${res.mortarWet.toFixed(3)} Wet)`;
                                            })()}
                                        </div>
                                    </>
                                )}
                                {(formData.type === 'plaster' || activeFolder === 'Plaster') && (
                                    <div className="form-row" style={{ gap: '10px', marginTop: '15px' }}>
                                        <div className="form-group">
                                            <label>Ratio (Cement:Sand)</label>
                                            <select value={formData.defaultPlasterRatio || '1:4'} onChange={e => setFormData({ ...formData, defaultPlasterRatio: e.target.value })}>
                                                <option value="1:3">1:3 (Ceiling)</option>
                                                <option value="1:4">1:4 (Internal Wall)</option>
                                                <option value="1:5">1:5 (Internal Wall)</option>
                                                <option value="1:6">1:6 (External Wall)</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Thickness (mm)</label>
                                            <select value={formData.defaultPlasterThickness || '12'} onChange={e => setFormData({ ...formData, defaultPlasterThickness: e.target.value })}>
                                                <option value="6">6 mm (Ceiling)</option>
                                                <option value="12">12 mm (Internal)</option>
                                                <option value="15">15 mm (Rough)</option>
                                                <option value="20">20 mm (External)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                                {(formData.type === 'flooring' || activeFolder === 'Flooring') && (
                                    <>
                                        <h4 style={{ marginTop: '15px', marginBottom: '10px', color: '#334155' }}>Flooring Settings</h4>
                                        <div className="form-row" style={{ gap: '10px' }}>
                                            <div className="form-group">
                                                <label>Tile Size</label>
                                                <select
                                                    value={
                                                        (formData.defaultFlooringSize === undefined || ['600x600', '600x1200', '800x800', '1000x1000', '300x300'].includes(formData.defaultFlooringSize))
                                                            ? (formData.defaultFlooringSize || '600x600')
                                                            : 'CUSTOM'
                                                    }
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setFormData({ ...formData, defaultFlooringSize: val === 'CUSTOM' ? '' : val });
                                                    }}
                                                >
                                                    <option value="600x600">600x600</option>
                                                    <option value="600x1200">600x1200</option>
                                                    <option value="800x800">800x800</option>
                                                    <option value="1000x1000">1000x1000</option>
                                                    <option value="300x300">300x300</option>
                                                    <option value="CUSTOM">Add New... (Custom)</option>
                                                </select>
                                                {/* Custom Tile Size Input */}
                                                {!(formData.defaultFlooringSize === undefined || ['600x600', '600x1200', '800x800', '1000x1000', '300x300'].includes(formData.defaultFlooringSize)) && (
                                                    <input
                                                        type="text"
                                                        placeholder="Enter Size (e.g. 1200x1200)"
                                                        style={{ marginTop: '5px' }}
                                                        value={formData.defaultFlooringSize || ''}
                                                        onChange={e => setFormData({ ...formData, defaultFlooringSize: e.target.value })}
                                                    />
                                                )}
                                            </div>
                                            <div className="form-group">
                                                <label>Bedding Thk (mm)</label>
                                                <input type="number" value={formData.defaultBeddingThickness || 50} onChange={e => setFormData({ ...formData, defaultBeddingThickness: parseFloat(e.target.value) || 0 })} />
                                            </div>
                                        </div>
                                        <div className="form-row" style={{ gap: '10px' }}>
                                            <div className="form-group">
                                                <label>Mortar Ratio</label>
                                                <select value={formData.defaultFlooringRatio || '1:6'} onChange={e => setFormData({ ...formData, defaultFlooringRatio: e.target.value })}>
                                                    <option value="1:4">1:4</option>
                                                    <option value="1:6">1:6</option>
                                                    <option value="1:8">1:8</option>
                                                    <option value="CHEMICAL">Chemical</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Wastage (%)</label>
                                                <input type="number" value={formData.defaultFlooringWastage || 5} onChange={e => setFormData({ ...formData, defaultFlooringWastage: parseFloat(e.target.value) || 0 })} />
                                            </div>
                                        </div>
                                    </>
                                )}
                                <div className="modal-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">Create Estimate</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <style>{`
                    .estimation-container { padding: 20px; }
                    .header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                    .estimations-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
                    .estimation-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s; border: 1px solid #e2e8f0; }
                    .estimation-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
                    .card-header h3 { margin: 0; font-size: 1.1rem; color: #1e293b; }
                    .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; text-transform: uppercase; font-weight: bold; }
                    .badge.steel { background: #dbeafe; color: #1e40af; }
                    .badge.concrete { background: #e0e7ff; color: #3730a3; }
                    .badge.masonry { background: #fee2e2; color: #991b1b; }
                    .card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; color: #64748b; font-size: 0.9rem; }

                    .btn-back { background: none; border: none; color: #64748b; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 5px; font-size: 1rem; }
                    .btn-back:hover { color: #1e293b; }
                    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }

                    .folders-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; padding: 20px 0; }
                    .folder-card { background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                    .folder-card:hover { transform: translateY(-3px); box-shadow: 0 8px 16px rgba(0,0,0,0.1); border-color: #3b82f6; }
                    .folder-icon { font-size: 3rem; margin-bottom: 10px; }
                    .folder-card h3 { margin: 0 0 5px 0; color: #1e293b; }
                    .folder-card p { margin: 0; color: #64748b; font-size: 0.9rem; }

                    .premium-modal { border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); overflow: hidden; border: 1px solid #e2e8f0; background: white; width: 400px; max-width: 90%; }
                    .modal-header { background: linear-gradient(to right, #f8fafc, #fff); padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
                    .modal-header h3 { margin: 0; font-size: 1.25rem; color: #0f172a; font-weight: 600; }
                    .close-btn { background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; transition: color 0.2s; }
                    .close-btn:hover { color: #ef4444; }
                    .premium-modal form { padding: 24px; }
                    .premium-modal .form-group { margin-bottom: 20px; }
                    .premium-modal label { display: block; margin-bottom: 8px; font-weight: 500; color: #334155; font-size: 0.95rem; }
                    .premium-modal input, .premium-modal select { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; transition: border-color 0.2s, box-shadow 0.2s; }
                    .premium-modal input:focus, .premium-modal select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
                    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; }
                    .modal-actions .btn { padding: 10px 20px; font-weight: 500; border-radius: 8px; cursor: pointer; border: none; }
                    .btn-primary { background: #3b82f6; color: white; }
                    .btn-primary:hover { background: #2563eb; }
                    .btn-secondary { background: #e2e8f0; color: #475569; }
                    .btn-secondary:hover { background: #cbd5e1; }
                    .btn-icon { background: none; border: none; cursor: pointer; font-size: 1.1rem; padding: 5px; border-radius: 4px; transition: background 0.2s; }
                    .btn-icon:hover { background: #f1f5f9; }
                    .btn-icon.delete:hover { background: #fee2e2; color: #ef4444; }
                `}</style>
            </div>
        );
    }

    // 4. List View (Inside Folder)
    const folderEstimations = estimations.filter(e => e.type === activeFolder.toLowerCase());



    return (
        <div className="estimation-container">
            <div className="header-actions">
                <div className="flex items-center gap-4">
                    <button className="btn-back" onClick={() => setActiveFolder(null)}> Back</button>
                    <h2>{activeFolder} Estimates</h2>
                </div>
                {canAdd && <button className="btn btn-primary" onClick={handleCreateClick}>+ New Estimate</button>}
            </div>

            <div className="estimations-grid">
                {folderEstimations.map(est => (
                    <div key={est._id || est.id} className="estimation-card" onClick={() => handleOpenEstimation(est)}>
                        <div className="card-header">
                            <h3>{est.title}</h3>
                            <span className={`badge ${est.type}`}>{est.type}</span>
                        </div>
                        <p>{est.description || 'No description'}</p>
                        <div className="card-footer">
                            <span>{est.items?.length || 0} items</span>
                            <div className="flex gap-2">
                                {canEditDelete(permission, est.createdAt || est.date) && <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleEditEstimation(est); }}>✎</button>}
                                {canEditDelete(permission, est.createdAt || est.date) && <button className="btn-icon delete" onClick={(e) => handleDeleteEstimation(e, est._id || est.id)}>🗑️</button>}
                            </div>
                        </div>
                    </div>
                ))}
                {folderEstimations.length === 0 && <p className="text-muted">No estimates found in this folder.</p>}
            </div>

            {/* New Estimate Modal (Reused) */}
            {
                showModal && (
                    <div className="modal-overlay">
                        <div className="modal-content premium-modal">
                            <div className="modal-header">
                                <h3>{editingEstId ? 'Edit Estimate' : 'New Estimate'}</h3>
                                <button className="close-btn" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleCreateSubmit}>
                                <div className="form-group">
                                    <label>Title</label>
                                    <input type="text" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Project Name / Title" />
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description" />
                                </div>
                                {!activeFolder && (
                                    <div className="form-group">
                                        <label>Type</label>
                                        <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                            <option value="steel">Steel BBS</option>
                                            <option value="concrete">Concrete</option>
                                            <option value="masonry">Masonry</option>
                                            <option value="plaster">Plaster</option>
                                        </select>
                                    </div>
                                )}
                                {(formData.type === 'concrete' || activeFolder?.toLowerCase() === 'concrete') && (
                                    <div className="form-row" style={{ gap: '10px', marginTop: '15px' }}>
                                        <div className="form-group">
                                            <label>Grade of Concrete</label>
                                            <select value={formData.defaultConcreteGrade || 'M20'} onChange={e => {
                                                const grade = e.target.value;
                                                const ratio = CONCRETE_GRADES[grade] || '';
                                                setFormData({ ...formData, defaultConcreteGrade: grade, defaultConcreteRatio: ratio });
                                            }}>
                                                {Object.keys(CONCRETE_GRADES).map(g => <option key={g} value={g}>{g}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Ratio (Cement:Sand:Agg)</label>
                                            <input type="text" value={formData.defaultConcreteRatio || ''} onChange={e => setFormData({ ...formData, defaultConcreteRatio: e.target.value })} placeholder="e.g. 1:1.5:3" />
                                        </div>
                                    </div>
                                )}
                                {(formData.type === 'masonry' || activeFolder === 'Masonry') && (
                                    <>
                                        <h4 style={{ marginTop: '15px', marginBottom: '10px', color: '#334155' }}>Masonry Settings</h4>
                                        <div className="form-group">
                                            <label>Default Material</label>
                                            <select value={formData.defaultMaterial || 'AAC'} onChange={e => {
                                                const mat = e.target.value;
                                                const dims = MASONRY_MATERIALS[mat]?.dims || { l: 0, w: 0, h: 0 };
                                                setFormData({
                                                    ...formData,
                                                    defaultMaterial: mat,
                                                    defaultCustomDims: mat === 'CUSTOM' ? (formData.defaultCustomDims || { l: 0, w: 0, h: 0 }) : dims
                                                });
                                            }}>
                                                {Object.entries(MASONRY_MATERIALS).map(([key, val]) => (
                                                    <option key={key} value={key}>{val.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-row" style={{ gap: '10px' }}>
                                            <div className="form-group"><label>Block Length (mm)</label><input type="number" value={formData.defaultCustomDims?.l || 0} onChange={e => setFormData({ ...formData, defaultCustomDims: { ...formData.defaultCustomDims, l: parseFloat(e.target.value) || 0 } })} /></div>
                                            <div className="form-group"><label>Block Width (mm)</label><input type="number" value={formData.defaultCustomDims?.w || 0} onChange={e => setFormData({ ...formData, defaultCustomDims: { ...formData.defaultCustomDims, w: parseFloat(e.target.value) || 0 } })} /></div>
                                            <div className="form-group"><label>Block Height (mm)</label><input type="number" value={formData.defaultCustomDims?.h || 0} onChange={e => setFormData({ ...formData, defaultCustomDims: { ...formData.defaultCustomDims, h: parseFloat(e.target.value) || 0 } })} /></div>
                                        </div>
                                        <div className="form-group">
                                            <label>Mortar Ratio</label>
                                            <select value={formData.defaultMortarRatio || '1:6'} onChange={e => {
                                                const ratio = e.target.value;
                                                const thickness = ratio === 'CHEMICAL' ? 3 : 10;
                                                setFormData({ ...formData, defaultMortarRatio: ratio, defaultMortarThickness: thickness });
                                            }}>
                                                <option value="1:3">1:3</option>
                                                <option value="1:4">1:4</option>
                                                <option value="1:5">1:5</option>
                                                <option value="1:6">1:6</option>
                                                <option value="CHEMICAL">Chemical</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Mortar Thickness (mm)</label>
                                            <input type="number" value={formData.defaultMortarThickness || 10} onChange={e => setFormData({ ...formData, defaultMortarThickness: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                    </>
                                )}
                                {(formData.type === 'plaster' || activeFolder === 'Plaster') && (
                                    <div className="form-row" style={{ gap: '10px', marginTop: '15px' }}>
                                        <div className="form-group">
                                            <label>Ratio (Cement:Sand)</label>
                                            <select value={formData.defaultPlasterRatio || '1:4'} onChange={e => setFormData({ ...formData, defaultPlasterRatio: e.target.value })}>
                                                <option value="1:3">1:3 (Ceiling)</option>
                                                <option value="1:4">1:4 (Internal Wall)</option>
                                                <option value="1:5">1:5 (Internal Wall)</option>
                                                <option value="1:6">1:6 (External Wall)</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Thickness (mm)</label>
                                            <select value={formData.defaultPlasterThickness || '12'} onChange={e => setFormData({ ...formData, defaultPlasterThickness: e.target.value })}>
                                                <option value="6">6 mm (Ceiling)</option>
                                                <option value="12">12 mm (Internal)</option>
                                                <option value="15">15 mm (Rough)</option>
                                                <option value="20">20 mm (External)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                                {(formData.type === 'flooring' || activeFolder === 'Flooring') && (
                                    <>
                                        <h4 style={{ marginTop: '15px', marginBottom: '10px', color: '#334155' }}>Flooring Settings</h4>
                                        <div className="form-row" style={{ gap: '10px' }}>
                                            <div className="form-group">
                                                <label>Tile Size</label>
                                                <select
                                                    value={
                                                        (formData.defaultFlooringSize === undefined || ['600x600', '600x1200', '800x800', '1000x1000', '300x300'].includes(formData.defaultFlooringSize))
                                                            ? (formData.defaultFlooringSize || '600x600')
                                                            : 'CUSTOM'
                                                    }
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setFormData({ ...formData, defaultFlooringSize: val === 'CUSTOM' ? '' : val });
                                                    }}
                                                >
                                                    <option value="600x600">600x600</option>
                                                    <option value="600x1200">600x1200</option>
                                                    <option value="800x800">800x800</option>
                                                    <option value="1000x1000">1000x1000</option>
                                                    <option value="300x300">300x300</option>
                                                    <option value="CUSTOM">Add New... (Custom)</option>
                                                </select>
                                                {/* Custom Tile Size Input */}
                                                {!(formData.defaultFlooringSize === undefined || ['600x600', '600x1200', '800x800', '1000x1000', '300x300'].includes(formData.defaultFlooringSize)) && (
                                                    <input
                                                        type="text"
                                                        placeholder="Enter Size (e.g. 1200x1200)"
                                                        style={{ marginTop: '5px' }}
                                                        value={formData.defaultFlooringSize || ''}
                                                        onChange={e => setFormData({ ...formData, defaultFlooringSize: e.target.value })}
                                                    />
                                                )}
                                            </div>
                                            <div className="form-group">
                                                <label>Bedding Thk (mm)</label>
                                                <input type="number" value={formData.defaultBeddingThickness || 50} onChange={e => setFormData({ ...formData, defaultBeddingThickness: parseFloat(e.target.value) || 0 })} />
                                            </div>
                                        </div>
                                        <div className="form-row" style={{ gap: '10px' }}>
                                            <div className="form-group">
                                                <label>Mortar Ratio</label>
                                                <select value={formData.defaultFlooringRatio || '1:6'} onChange={e => setFormData({ ...formData, defaultFlooringRatio: e.target.value })}>
                                                    <option value="1:4">1:4</option>
                                                    <option value="1:6">1:6</option>
                                                    <option value="1:8">1:8</option>
                                                    <option value="CHEMICAL">Chemical</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Wastage (%)</label>
                                                <input type="number" value={formData.defaultFlooringWastage || 5} onChange={e => setFormData({ ...formData, defaultFlooringWastage: parseFloat(e.target.value) || 0 })} />
                                            </div>
                                        </div>
                                    </>
                                )}
                                <div className="modal-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">{editingEstId ? 'Update' : 'Create Estimate'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            <style>{`
                    .estimation-container { padding: 20px; }
                    .header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                    .estimations-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
                    .estimation-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s; border: 1px solid #e2e8f0; }
                    .estimation-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
                    .card-header h3 { margin: 0; font-size: 1.1rem; color: #1e293b; }
                    .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; text-transform: uppercase; font-weight: bold; }
                    .badge.steel { background: #dbeafe; color: #1e40af; }
                    .badge.concrete { background: #e0e7ff; color: #3730a3; }
                    .badge.masonry { background: #fee2e2; color: #991b1b; }
                    .card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; color: #64748b; font-size: 0.9rem; }

                    .btn-back { background: none; border: none; color: #64748b; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 5px; font-size: 1rem; }
                    .btn-back:hover { color: #1e293b; }
                    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }

                    .folders-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; padding: 20px 0; }
                    .folder-card { background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                    .folder-card:hover { transform: translateY(-3px); box-shadow: 0 8px 16px rgba(0,0,0,0.1); border-color: #3b82f6; }
                    .folder-icon { font-size: 3rem; margin-bottom: 10px; }
                    .folder-card h3 { margin: 0 0 5px 0; color: #1e293b; }
                    .folder-card p { margin: 0; color: #64748b; font-size: 0.9rem; }

                    .premium-modal { border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); overflow-y: auto; max-height: 90vh; border: 1px solid #e2e8f0; background: white; width: 500px; max-width: 95%; }
                    .modal-header { background: linear-gradient(to right, #f8fafc, #fff); padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
                    .modal-header h3 { margin: 0; font-size: 1.25rem; color: #0f172a; font-weight: 600; }
                    .close-btn { background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; transition: color 0.2s; }
                    .close-btn:hover { color: #ef4444; }
                    .premium-modal form { padding: 24px; }
                    .premium-modal .form-group { margin-bottom: 20px; }
                    .premium-modal label { display: block; margin-bottom: 8px; font-weight: 500; color: #334155; font-size: 0.95rem; }
                    .premium-modal input, .premium-modal select { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; transition: border-color 0.2s, box-shadow 0.2s; }
                    .premium-modal input:focus, .premium-modal select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
                    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; }
                    .modal-actions .btn { padding: 10px 20px; font-weight: 500; border-radius: 8px; cursor: pointer; border: none; }
                    .btn-primary { background: #3b82f6; color: white; }
                    .btn-primary:hover { background: #2563eb; }
                    .btn-secondary { background: #e2e8f0; color: #475569; }
                    .btn-secondary:hover { background: #cbd5e1; }
                    .btn-icon { background: none; border: none; cursor: pointer; font-size: 1.1rem; padding: 5px; border-radius: 4px; transition: background 0.2s; }
                    .btn-icon:hover { background: #f1f5f9; }
                    .btn-icon.delete:hover { background: #fee2e2; color: #ef4444; }
                `}</style>
        </div>
    );
};

export default Estimation;


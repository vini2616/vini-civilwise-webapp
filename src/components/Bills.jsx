import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import SearchableSelect from './SearchableSelect';
import { generateTransactionBill } from '../utils/billGenerator';
import { checkPermission, canEnterData, canEditDelete } from '../utils/permissions';

const Bills = ({ currentUser }) => {
    const { companies, activeCompanyId, savedParties, addSavedParty, bills, addBill, deleteBill, updateBill, activeSite, savedBillItems, addSavedBillItem, deleteSavedBillItem } = useData();

    // Permission Logic
    const permission = checkPermission(currentUser, 'bills');
    const canAdd = canEnterData(permission);
    const canEdit = canEditDelete(permission); // For delete/edit

    if (permission === 'no_access') {
        return (
            <div className="bills-container flex items-center justify-center p-8">
                <div className="text-center">
                    <h2 className="text-xl text-red-600 font-bold">🚫 Access Denied</h2>
                    <p className="text-gray-500 mt-2">You do not have permission to view the Bills module.</p>
                </div>
            </div>
        );
    }

    const activeCompany = companies.find(c => c.id === activeCompanyId || c._id === activeCompanyId) || companies[0];

    // Debug Company Info
    useEffect(() => {
        console.log("Current Active Company for Bills:", activeCompany);
    }, [activeCompany]);
    const [activeTab, setActiveTab] = useState('create'); // create, history

    const [formData, setFormData] = useState({
        id: '', // For editing
        invoiceNo: '',
        destination: '',
        partyName: '',
        partyAddress: '',
        partyGst: '',
        partyMobile: '',
        date: new Date().toISOString().split('T')[0],
        items: [{ description: '', hsn: '', unit: '', quantity: 1, rate: 0, discount: 0, amount: 0 }],
        freight: 0,
        gstRate: 0,
        gstRate: 0,
        note: `1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will optionally be charged if payment is not made within due date.\n3. Subject to jurisdiction.`
    });

    const [isAddingParty, setIsAddingParty] = useState(false);
    const [newParty, setNewParty] = useState('');
    const [availableParties, setAvailableParties] = useState([]);

    // Download Modal State
    const [downloadModal, setDownloadModal] = useState({ show: false, bill: null });

    // Load Vendors and Contractors
    useEffect(() => {
        if (activeSite) {
            const vendors = JSON.parse(localStorage.getItem(`vini_vendors_${activeSite}`) || '[]');
            const contractors = JSON.parse(localStorage.getItem(`vini_contractors_${activeSite}`) || '[]');

            // Combine and format
            const combined = [
                ...vendors.map(v => ({ ...v, type: 'Vendor' })),
                ...contractors.map(c => ({ ...c, type: 'Contractor' }))
            ];
            setAvailableParties(combined);
        }
    }, [activeSite]);

    // Derived Saved Notes
    const savedNotes = useMemo(() => {
        const notes = bills.map(b => b.note).filter(n => n && n.trim().length > 0);
        return [...new Set(notes)];
    }, [bills]);

    const [showSavedNotes, setShowSavedNotes] = useState(false);

    // Calculate Totals
    const totals = useMemo(() => {
        const itemsTotal = formData.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const freight = Number(formData.freight) || 0;
        const subtotal = itemsTotal + freight;
        const gstAmount = Math.round(subtotal * (Number(formData.gstRate) || 0) / 100);
        const total = subtotal + gstAmount;
        return { itemsTotal, freight, subtotal, gstAmount, total };
    }, [formData.items, formData.gstRate, formData.freight]);

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;

        // Auto-calculate amount
        if (field === 'quantity' || field === 'rate' || field === 'discount') {
            const qty = Number(newItems[index].quantity) || 0;
            const rate = Number(newItems[index].rate) || 0;
            const discountPercent = Number(newItems[index].discount) || 0;

            // Discount is now percentage
            const baseAmount = qty * rate;
            const discountAmount = (baseAmount * discountPercent) / 100;
            newItems[index].amount = baseAmount - discountAmount;
        }

        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { description: '', hsn: '', unit: '', quantity: 1, rate: 0, discount: 0, amount: 0 }]
        }));
    };

    const removeItem = (index) => {
        if (formData.items.length > 1) {
            setFormData(prev => ({
                ...prev,
                items: prev.items.filter((_, i) => i !== index)
            }));
        }
    };

    const handleAddParty = () => {
        if (newParty.trim()) {
            addSavedParty(newParty.trim());
            setFormData(prev => ({ ...prev, partyName: newParty.trim() }));
            setNewParty('');
            setIsAddingParty(false);
        }
    };

    const handlePartySelect = (e) => {
        const selectedValue = e.target.value;

        if (selectedValue === 'new_custom_party') {
            setIsAddingParty(true);
            setFormData(prev => ({
                ...prev,
                partyName: '',
                partyAddress: '',
                partyGst: '',
                partyMobile: ''
            }));
        } else {
            // Check if it's a vendor/contractor
            const selectedParty = availableParties.find(p => p.companyName === selectedValue);

            if (selectedParty) {
                setFormData(prev => ({
                    ...prev,
                    partyName: selectedParty.companyName,
                    partyAddress: selectedParty.address || '',
                    partyGst: selectedParty.gstNumber || '',
                    partyMobile: selectedParty.mobileNumber || ''
                }));
            } else {
                // It's a simple saved party string
                setFormData(prev => ({
                    ...prev,
                    partyName: selectedValue,
                    partyAddress: '',
                    partyGst: '',
                    partyMobile: ''
                }));
            }
        }
    };

    const handleGenerate = async () => {
        // Validate required fields
        if (!formData.partyName) {
            alert("Please select a party.");
            return;
        }

        const billData = {
            id: formData.id || `INV-${Date.now().toString().slice(-6)}`,
            invoiceNo: formData.invoiceNo,
            destination: formData.destination,
            date: formData.date,
            partyName: formData.partyName,
            partyAddress: formData.partyAddress,
            partyGst: formData.partyGst,
            partyMobile: formData.partyMobile,
            note: formData.note,
            gstRate: formData.gstRate,
            gstAmount: totals.gstAmount,
            baseAmount: totals.subtotal, // Taxable Value (Items + Freight)
            amount: totals.total,
            items: formData.items,
            freight: totals.freight,
            type: 'invoice',
            createdAt: formData.createdAt || new Date().toISOString()
        };

        // Save to history (Add or Update)
        let result;
        if (formData.id) {
            result = await updateBill(billData);
            if (result && result.success) {
                alert("Bill updated successfully!");
                resetForm();
            } else {
                alert("Failed to update bill: " + (result?.message || "Unknown error"));
            }
        } else {
            result = await addBill(billData);
            if (result && result.success) {
                alert("Bill generated and saved to history!");
                resetForm();
            } else {
                alert("Failed to save bill: " + (result?.message || "Unknown error"));
            }
        }
    };

    const handleEdit = (bill) => {
        setFormData({
            ...bill,
            date: bill.date ? bill.date.split('T')[0] : '',
            items: bill.items.map(i => ({ ...i, discount: i.discount || 0 }))
        });
        setActiveTab('create');
    };

    const openDownloadModal = (bill) => {
        setDownloadModal({ show: true, bill });
    };

    const handleDownload = (type) => {
        const { bill } = downloadModal;
        if (!bill) return;

        try {
            generateTransactionBill(bill, activeCompany, type);
            setDownloadModal({ show: false, bill: null });
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert(`Failed to generate PDF: ${error.message}`);
        }
    };

    const resetForm = () => {
        setFormData({
            id: '',
            invoiceNo: '',
            destination: '',
            partyName: '',
            partyAddress: '',
            partyGst: '',
            partyMobile: '',
            date: new Date().toISOString().split('T')[0],
            items: [{ description: '', hsn: '', unit: '', quantity: 1, rate: 0, discount: 0, amount: 0 }],
            freight: 0,
            gstRate: 0,
            note: ''
        });
    };

    // Merge savedParties and availableParties for the dropdown, avoiding duplicates
    const dropdownOptions = useMemo(() => {
        const options = [...availableParties];
        savedParties.forEach(p => {
            if (!options.find(op => op.companyName === p)) {
                options.push({ companyName: p, type: 'Saved' });
            }
        });
        return options;
    }, [availableParties, savedParties]);

    // Sort bills by Invoice No (descending) or Date
    const sortedBills = useMemo(() => {
        if (!bills) return [];
        return [...bills].sort((a, b) => {
            // Try to sort by Invoice No if possible
            const invA = a.invoiceNo || '';
            const invB = b.invoiceNo || '';
            if (invA && invB) return invB.localeCompare(invA, undefined, { numeric: true });

            // Fallback to date
            return new Date(b.date) - new Date(a.date);
        });
    }, [bills]);

    return (
        <div className="bills-container fade-in">
            <div className="page-header">
                <div>
                    <h2 className="page-title">🧾 Bill Generator</h2>
                    <p className="page-subtitle">Create and download GST bills</p>
                </div>
                <div className="tab-buttons">
                    {canAdd && (
                        <button
                            className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('create'); resetForm(); }}
                        >
                            Create New
                        </button>
                    )}
                    <button
                        className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        History
                    </button>
                </div>
            </div>

            {activeTab === 'create' ? (
                <div className="bill-card">
                    <div className="form-grid">
                        {/* Row 1 */}
                        <div className="form-group">
                            <label>Invoice No. (Optional)</label>
                            <input
                                type="text"
                                value={formData.invoiceNo}
                                onChange={(e) => setFormData(prev => ({ ...prev, invoiceNo: e.target.value }))}
                                className="form-input"
                                placeholder="e.g. INV-001"
                            />
                        </div>
                        <div className="form-group">
                            <label>Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                className="form-input"
                            />
                        </div>

                        {/* Row 2 */}
                        <div className="form-group">
                            <label>Party Name</label>
                            {!isAddingParty ? (
                                <select
                                    value={formData.partyName}
                                    onChange={handlePartySelect}
                                    className="form-input"
                                >
                                    <option value="">Select Party</option>
                                    {dropdownOptions.map((p, idx) => (
                                        <option key={idx} value={p.companyName}>
                                            {p.companyName} {p.type !== 'Saved' ? `(${p.type})` : ''}
                                        </option>
                                    ))}
                                    <option value="new_custom_party" className="text-primary font-bold">+ Add New Party</option>
                                </select>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newParty}
                                        onChange={(e) => setNewParty(e.target.value)}
                                        className="form-input"
                                        placeholder="Enter party name"
                                        autoFocus
                                    />
                                    <button onClick={handleAddParty} className="btn btn-primary btn-sm">Add</button>
                                    <button onClick={() => setIsAddingParty(false)} className="btn btn-outline btn-sm">Cancel</button>
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label>Destination (Optional)</label>
                            <input
                                type="text"
                                value={formData.destination}
                                onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                                className="form-input"
                                placeholder="e.g. Mumbai"
                            />
                        </div>

                        {/* Row 3 - Party Details */}
                        <div className="form-group">
                            <label>Party Address</label>
                            <input
                                type="text"
                                value={formData.partyAddress}
                                onChange={(e) => setFormData(prev => ({ ...prev, partyAddress: e.target.value }))}
                                className="form-input"
                                placeholder="Address"
                            />
                        </div>
                        <div className="form-group">
                            <div className="grid-2-col">
                                <div>
                                    <label>Party GSTIN</label>
                                    <input
                                        type="text"
                                        value={formData.partyGst}
                                        onChange={(e) => setFormData(prev => ({ ...prev, partyGst: e.target.value }))}
                                        className="form-input"
                                        placeholder="GST Number"
                                    />
                                </div>
                                <div>
                                    <label>Party Mobile</label>
                                    <input
                                        type="text"
                                        value={formData.partyMobile}
                                        onChange={(e) => setFormData(prev => ({ ...prev, partyMobile: e.target.value }))}
                                        className="form-input"
                                        placeholder="Mobile Number"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="items-section">
                        <h3>Items</h3>
                        <div className="table-responsive">
                            <table className="items-table">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th width="80">HSN/SAC</th>
                                        <th width="70">Unit</th>
                                        <th width="70">Qty</th>
                                        <th width="100">Rate (₹)</th>
                                        <th width="90">Disc. (%)</th>
                                        <th width="110">Amount (₹)</th>
                                        <th width="40"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.items.map((item, index) => (
                                        <tr key={index}>
                                            <td>
                                                <SearchableSelect
                                                    options={(savedBillItems || []).map(i => ({ label: i, value: i }))}
                                                    value={item.description}
                                                    onChange={(val) => handleItemChange(index, 'description', val)}
                                                    onAddNew={(newItem) => {
                                                        if (newItem && newItem.trim()) {
                                                            addSavedBillItem(newItem.trim());
                                                            handleItemChange(index, 'description', newItem.trim());
                                                        }
                                                    }}
                                                    onDelete={deleteSavedBillItem}
                                                    placeholder="Item description"
                                                    className="table-input"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={item.hsn}
                                                    onChange={(e) => handleItemChange(index, 'hsn', e.target.value)}
                                                    className="table-input"
                                                    placeholder="HSN"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={item.unit}
                                                    onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                                                    className="table-input"
                                                    placeholder="Unit"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                    className="table-input"
                                                    min="1"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={item.rate}
                                                    onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                                    className="table-input"
                                                    min="0"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={item.discount}
                                                    onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                                                    className="table-input"
                                                    min="0"
                                                    max="100"
                                                />
                                            </td>
                                            <td>
                                                <div className="amount-display">₹{item.amount.toLocaleString()}</div>
                                            </td>
                                            <td>
                                                <button onClick={() => removeItem(index)} className="btn-icon delete" title="Remove">×</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button onClick={addItem} className="btn-link mt-2">+ Add Item</button>
                    </div>

                    {/* Footer / Totals */}
                    <div className="bill-footer">
                        <div className="notes-section">
                            <div className="flex justify-between items-center mb-1">
                                <label>Notes</label>
                                {savedNotes.length > 0 && (
                                    <label className="text-xs flex items-center gap-1 cursor-pointer text-blue-600 select-none">
                                        <input
                                            type="checkbox"
                                            checked={showSavedNotes}
                                            onChange={(e) => setShowSavedNotes(e.target.checked)}
                                        />
                                        Show Previous Notes
                                    </label>
                                )}
                            </div>

                            {showSavedNotes && (
                                <div className="saved-notes-list mb-2 p-2 border rounded bg-gray-50 max-h-40 overflow-y-auto">
                                    {savedNotes.map((note, idx) => (
                                        <div
                                            key={idx}
                                            className="text-xs p-2 hover:bg-blue-50 cursor-pointer border-b last:border-0 text-gray-700"
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, note: note }));
                                                setShowSavedNotes(false);
                                            }}
                                        >
                                            {note.length > 100 ? note.substring(0, 100) + '...' : note}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <textarea
                                value={formData.note}
                                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                                className="form-input"
                                rows="3"
                                placeholder="Payment terms, bank details, etc."
                            ></textarea>
                        </div>
                        <div className="totals-section">
                            <div className="total-row">
                                <span>Items Total:</span>
                                <span>₹{totals.itemsTotal.toLocaleString()}</span>
                            </div>

                            <div className="total-row">
                                <div className="flex items-center gap-2 justify-end">
                                    <span>Freight Outward:</span>
                                    <input
                                        type="number"
                                        value={formData.freight}
                                        onChange={(e) => setFormData(prev => ({ ...prev, freight: e.target.value }))}
                                        className="freight-input"
                                        placeholder="0"
                                    />
                                </div>
                                <span>₹{totals.freight.toLocaleString()}</span>
                            </div>

                            <div className="total-row subtotal-row">
                                <span>Taxable Value:</span>
                                <span>₹{totals.subtotal.toLocaleString()}</span>
                            </div>

                            <div className="total-row">
                                <div className="flex items-center gap-2 justify-end">
                                    <span>GST:</span>
                                    <select
                                        value={formData.gstRate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, gstRate: Number(e.target.value) }))}
                                        className="gst-select"
                                    >
                                        <option value="0">0%</option>
                                        <option value="5">5%</option>
                                        <option value="12">12%</option>
                                        <option value="18">18%</option>
                                        <option value="28">28%</option>
                                    </select>
                                </div>
                                <span>₹{totals.gstAmount.toLocaleString()}</span>
                            </div>
                            <div className="total-row grand-total">
                                <span>Total:</span>
                                <span>₹{totals.total.toLocaleString()}</span>
                            </div>
                            <button onClick={handleGenerate} className="btn btn-primary full-width-btn mt-4">
                                {formData.id ? '💾 Update Bill' : '💾 Save Bill'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bill-card">
                    <div className="history-list">
                        {sortedBills && sortedBills.length > 0 ? (
                            <table className="items-table">
                                <thead>
                                    <tr>
                                        <th>Invoice No</th>
                                        <th>Date</th>
                                        <th>Party</th>
                                        <th>Amount</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedBills.map(bill => (
                                        <tr key={bill.id}>
                                            <td>{bill.invoiceNo || bill.id}</td>
                                            <td>{new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td>{bill.partyName}</td>
                                            <td>₹{Number(bill.amount).toLocaleString()}</td>
                                            <td>
                                                <button onClick={() => openDownloadModal(bill)} className="btn-icon" title="Download PDF">
                                                    📄
                                                </button>
                                                {canEditDelete(permission, bill.createdAt) && (
                                                    <>
                                                        <button onClick={() => handleEdit(bill)} className="btn-icon edit" title="Edit">
                                                            ✏️
                                                        </button>
                                                        <button onClick={() => deleteBill(bill.id)} className="btn-icon delete" title="Delete">
                                                            🗑️
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-center text-gray-500 py-8">No bills generated yet.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Download Modal */}
            {downloadModal.show && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Download Bill</h3>
                        <p>Select copy type for Invoice #{downloadModal.bill?.invoiceNo || downloadModal.bill?.id}</p>
                        <div className="modal-actions">
                            <button onClick={() => handleDownload('Original')} className="btn btn-primary">Original</button>
                            <button onClick={() => handleDownload('Duplicate')} className="btn btn-outline">Duplicate</button>
                            <button onClick={() => setDownloadModal({ show: false, bill: null })} className="btn btn-link">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .bills-container { padding: 24px; max-width: 1100px; margin: 0 auto; font-family: 'Inter', sans-serif; }
                .page-header { margin-bottom: 32px; display: flex; justify-content: space-between; align-items: center; }
                .page-title { font-size: 1.8rem; font-weight: 700; color: #1e293b; margin: 0; }
                .page-subtitle { color: #64748b; margin: 4px 0 0 0; }
                
                .tab-buttons { display: flex; gap: 10px; background: #f1f5f9; padding: 4px; border-radius: 8px; }
                .tab-btn { padding: 8px 16px; border: none; background: transparent; border-radius: 6px; cursor: pointer; font-weight: 600; color: #64748b; }
                .tab-btn.active { background: white; color: #3b82f6; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                
                .bill-card { background: white; padding: 32px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
                
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
                .form-group label { display: block; margin-bottom: 8px; font-weight: 500; color: #475569; font-size: 0.9rem; }
                .form-input { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; outline: none; transition: border 0.2s; }
                .form-input:focus { border-color: #3b82f6; }
                
                .grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                
                .items-section { margin-bottom: 32px; }
                .items-section h3 { font-size: 1.1rem; color: #1e293b; margin-bottom: 16px; }
                .table-responsive { overflow-x: auto; }
                .items-table { width: 100%; border-collapse: collapse; min-width: 800px; }
                .items-table th { text-align: left; padding: 12px; background: #f8fafc; color: #64748b; font-weight: 600; font-size: 0.85rem; }
                .items-table td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
                .table-input { width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; outline: none; font-size: 0.9rem; }
                .amount-display { padding: 8px; background: #f8fafc; border-radius: 6px; font-weight: 500; text-align: right; font-size: 0.9rem; }
                
                .bill-footer { display: grid; grid-template-columns: 1.5fr 1fr; gap: 32px; }
                .totals-section { background: #f8fafc; padding: 20px; border-radius: 12px; }
                .total-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 0.95rem; color: #475569; }
                .subtotal-row { border-top: 1px dashed #cbd5e1; padding-top: 8px; font-weight: 600; color: #334155; }
                .total-row.grand-total { font-weight: 700; color: #1e293b; font-size: 1.2rem; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 12px; margin-bottom: 0; }
                
                .gst-select { padding: 4px; border: 1px solid #e2e8f0; border-radius: 4px; outline: none; font-size: 0.9rem; width: 80px; }
                .freight-input { padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 4px; outline: none; font-size: 0.9rem; width: 80px; text-align: right; }
                
                .btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
                .btn-primary { background: #3b82f6; color: white; }
                .btn-primary:hover { background: #2563eb; }
                .btn-outline { background: white; border: 1px solid #e2e8f0; color: #475569; }
                .btn-sm { padding: 6px 12px; font-size: 0.85rem; }
                .btn-link { background: none; border: none; color: #3b82f6; font-weight: 500; cursor: pointer; padding: 0; }
                .btn-link:hover { text-decoration: underline; }
                .btn-icon { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 1.2rem; }
                .btn-icon:hover { color: #dc2626; }
                .btn-icon.edit:hover { color: #3b82f6; }
                
                .full-width-btn { width: 100%; }
                .mt-2 { margin-top: 8px; }
                .mt-4 { margin-top: 16px; }
                .flex { display: flex; }
                .gap-2 { gap: 8px; }
                .items-center { align-items: center; }
                .justify-end { justify-content: flex-end; }
                .text-primary { color: #3b82f6; }
                .font-bold { font-weight: 700; }
                
                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
                .modal-content { background: white; padding: 24px; border-radius: 12px; width: 300px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
                .modal-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
                
                .fade-in { animation: fadeIn 0.3s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                
                @media (max-width: 768px) {
                    .bill-footer { grid-template-columns: 1fr; }
                    .form-grid { grid-template-columns: 1fr; }
                    .page-header { flex-direction: column; align-items: flex-start; gap: 16px; }
                    .grid-2-col { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
};

export default Bills;

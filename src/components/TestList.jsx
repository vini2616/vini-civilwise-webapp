import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { checkPermission, canEditDelete, canEnterData } from '../utils/permissions';



const TestList = ({ type, onNavigate, onEnterResult, onEdit }) => {
    const { concreteTests, steelTests, brickTests, deleteConcreteTest, deleteSteelTest, deleteBrickTest, currentUser } = useData();
    const permission = checkPermission(currentUser, 'report');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    let data = [];
    let title = '';
    let icon = '';
    let deleteFunction = null;

    if (type === 'concrete') {
        data = concreteTests;
        title = 'Concrete Cube Tests';
        icon = '🧊';
        deleteFunction = deleteConcreteTest;
    } else if (type === 'steel') {
        data = steelTests;
        title = 'Steel Reinforcement Tests';
        icon = '🏗️';
        deleteFunction = deleteSteelTest;
    } else if (type === 'brick') {
        data = brickTests;
        title = 'Block / Brick Tests';
        icon = '🧱';
        deleteFunction = deleteBrickTest;
    }

    // Filtering
    const filteredData = data.filter(item => {
        const matchesSearch = item.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.grade?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this test record?')) {
            deleteFunction(id);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Draft': return 'status-draft';
            case 'Scheduled': return 'status-scheduled';
            case 'Tested': return 'status-tested';
            case 'Approved':
            case 'Pass': return 'status-approved';
            case 'Failed':
            case 'Fail': return 'status-failed';
            default: return 'status-default';
        }
    };

    return (
        <div className="test-list-container fade-in">
            <div className="page-header flex justify-between items-center mb-6">
                <div>
                    <h1>{icon} {title}</h1>
                    <p className="text-muted">Manage and track your quality control tests.</p>
                </div>
                {canEnterData(permission) && (
                    <button className="btn btn-primary btn-lg shadow-md" onClick={() => onNavigate(`add-${type}`)}>
                        + Add New Test
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="filters-bar card mb-6">
                <div className="search-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search location, grade, supplier..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="filter-select"
                >
                    <option value="All">All Status</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Tested">Tested</option>
                    <option value="Approved">Approved</option>
                    <option value="Failed">Failed</option>
                </select>
            </div>

            {/* List Grid */}
            <div className="test-grid">
                {filteredData.length > 0 ? (
                    filteredData.map(item => {
                        const itemId = item.id || item._id;
                        // Determine safe data object (handle if data is JSON string)
                        let safeData = {};
                        try {
                            safeData = typeof item.data === 'string' ? JSON.parse(item.data) : (item.data || {});
                        } catch (e) {
                            console.error("Failed to parse report data", e);
                            safeData = {};
                        }
                        return (
                            <div key={itemId} className="test-card card">
                                <div className="card-header-row">
                                    <span className={`status-badge ${getStatusColor(item.status)}`}>
                                        {item.status || 'Scheduled'}
                                    </span>

                                    <div className="card-actions">
                                        {canEditDelete(permission, item.createdAt) && (
                                            <>
                                                <button className="btn-icon-sm" onClick={() => onEdit && onEdit(item)} title="Edit">✏️</button>
                                                <button className="btn-icon-sm delete" onClick={() => handleDelete(itemId)} title="Delete">🗑️</button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <h3 className="test-location" title={item.location}>{item.location}</h3>

                                <div className="test-details">
                                    <div className="detail-item">
                                        <span className="label">Date</span>
                                        <span className="value">{new Date(item.date || item.testDate).toLocaleDateString()}</span>
                                    </div>
                                    {type === 'concrete' && (
                                        <div className="detail-item">
                                            <span className="label">Grade</span>
                                            <span className="value">{safeData.grade || item.grade}</span>
                                        </div>
                                    )}
                                    {type === 'steel' && (
                                        <div className="detail-item">
                                            <span className="label">Diameter</span>
                                            <span className="value">{safeData.diameter || item.diameter}mm</span>
                                        </div>
                                    )}
                                    {type === 'brick' && (
                                        <div className="detail-item">
                                            <span className="label">Type</span>
                                            <span className="value">{safeData.blockType || item.blockType}</span>
                                        </div>
                                    )}
                                </div>

                                {type === 'concrete' && (
                                    <div className="upcoming-dates">
                                        {['day7', 'day14', 'day28'].map(day => {
                                            // Calculate anticipated dates dynamically if not present
                                            let targetDate;
                                            if (item.dates && item.dates[day]) {
                                                targetDate = new Date(item.dates[day]);
                                            } else {
                                                const castingDate = new Date(item.date || safeData.castingDate || item.castingDate);
                                                const daysToAdd = day === 'day7' ? 7 : day === 'day14' ? 14 : 28;
                                                targetDate = new Date(castingDate);
                                                targetDate.setDate(castingDate.getDate() + daysToAdd);
                                            }

                                            const isDone = safeData.results && safeData.results[day]?.status;
                                            const isPass = isDone && safeData.results[day].status === 'Pass';

                                            const isLocked = permission === 'data_entry' && isDone;

                                            return (
                                                <button
                                                    key={day}
                                                    className={`date-pill ${isDone ? (isPass ? 'pill-pass' : 'pill-fail') : ''}`}
                                                    onClick={() => {
                                                        if (isLocked) {
                                                            alert("Data Entry users cannot edit submitted test results.");
                                                            return;
                                                        }
                                                        onEnterResult && onEnterResult(item, day);
                                                    }}
                                                    title={isLocked ? "Cannot edit submitted result" : "Click to enter results"}
                                                    style={isLocked ? { cursor: 'not-allowed', opacity: 0.8 } : {}}
                                                >
                                                    <span className="pill-label">{day.replace('day', '')}d:</span>
                                                    <span className="pill-date">{targetDate.getDate()}/{targetDate.getMonth() + 1}</span>
                                                    {isDone && <span className="pill-status">{isPass ? '✓' : '✗'}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })
                ) : (
                    <div className="empty-state-card">
                        <div className="empty-icon">📂</div>
                        <h3>No records found</h3>
                        <p>Try adjusting your search or add a new test.</p>
                    </div>
                )}
            </div>

            <style>{`
                .test-list-container {
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .filters-bar {
                    display: flex;
                    gap: 16px;
                    padding: 16px;
                    background: white;
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-sm);
                    align-items: center;
                }

                .search-wrapper {
                    flex: 1;
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .search-icon {
                    position: absolute;
                    left: 12px;
                    color: var(--text-light);
                }

                .search-input {
                    width: 100%;
                    padding: 10px 12px 10px 40px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    font-size: 1rem;
                    transition: all 0.2s;
                }

                .search-input:focus {
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                    outline: none;
                }

                .filter-select {
                    padding: 10px 16px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    background: white;
                    font-size: 0.95rem;
                    cursor: pointer;
                }

                .test-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 24px;
                }

                .test-card {
                    background: white;
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-sm);
                    padding: 20px;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                    display: flex;
                    flex-direction: column;
                }

                .test-card:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-md);
                    border-color: var(--primary-color);
                }

                .card-header-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 12px;
                }

                .status-badge {
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .status-draft { background: #f3f4f6; color: #4b5563; }
                .status-scheduled { background: #dbeafe; color: #1e40af; }
                .status-tested { background: #fef3c7; color: #92400e; }
                .status-approved { background: #dcfce7; color: #166534; }
                .status-failed { background: #fee2e2; color: #991b1b; }

                .card-actions {
                    display: flex;
                    gap: 8px;
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                .test-card:hover .card-actions {
                    opacity: 1;
                }

                .btn-icon-sm {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 1rem;
                    padding: 4px;
                    border-radius: 4px;
                    transition: background 0.2s;
                }

                .btn-icon-sm:hover {
                    background: var(--bg-secondary);
                }

                .btn-icon-sm.delete:hover {
                    background: #fee2e2;
                }

                .test-location {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: var(--text-color);
                    margin-bottom: 16px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .test-details {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-bottom: 16px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid var(--bg-secondary);
                }

                .detail-item {
                    display: flex;
                    flex-direction: column;
                }

                .detail-item .label {
                    font-size: 0.75rem;
                    color: var(--text-light);
                    text-transform: uppercase;
                    margin-bottom: 2px;
                }

                .detail-item .value {
                    font-weight: 500;
                    color: var(--text-color);
                }

                .upcoming-dates {
                    display: flex;
                    gap: 8px;
                    margin-top: auto;
                }

                .date-pill {
                    background: var(--bg-secondary);
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    color: var(--text-light);
                    border: 1px solid transparent;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .date-pill:hover {
                    border-color: var(--primary-color);
                    background: white;
                    color: var(--primary-color);
                }

                .pill-pass {
                    background: #dcfce7;
                    color: #166534;
                    border-color: #bbf7d0;
                }

                .pill-fail {
                    background: #fee2e2;
                    color: #991b1b;
                    border-color: #fecaca;
                }

                .pill-label {
                    font-weight: 600;
                    opacity: 0.7;
                }

                .pill-status {
                    font-weight: 800;
                }

                .empty-state-card {
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 60px;
                    background: white;
                    border-radius: var(--radius-lg);
                    border: 2px dashed var(--border-color);
                    color: var(--text-light);
                }

                .empty-icon {
                    font-size: 3rem;
                    margin-bottom: 16px;
                    opacity: 0.5;
                }
            `}</style>
        </div>
    );
};

export default TestList;

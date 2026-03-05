import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { checkPermission, canEnterData, canEditDelete } from '../utils/permissions';

const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
};

const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

const ProjectSchedule = () => {
    const { projectTasks, addProjectTask, updateProjectTask, deleteProjectTask, sites, activeSite, currentUser } = useData();

    // Permission Logic
    const permission = checkPermission(currentUser, 'barchart');
    const canAdd = canEnterData(permission);
    const canEdit = canEditDelete(permission);

    if (permission === 'no_access') {
        return (
            <div className="schedule-container flex items-center justify-center p-8">
                <div className="text-center">
                    <h2 className="text-xl text-red-600 font-bold">🚫 Access Denied</h2>
                    <p className="text-gray-500 mt-2">You do not have permission to view the Project Schedule.</p>
                </div>
            </div>
        );
    }
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        startDate: '',
        endDate: '',
        status: 'Pending',
        progress: 0,
        color: '#3b82f6' // Default blue
    });

    // Project Title State
    const currentSiteName = sites.find(s => (s.id || s._id) === activeSite)?.name || 'Project Schedule';
    const [projectTitle, setProjectTitle] = useState(() => {
        return localStorage.getItem(`vini_project_title_${activeSite}`) || currentSiteName;
    });
    const [isEditingTitle, setIsEditingTitle] = useState(false);

    const handleTitleChange = (e) => {
        setProjectTitle(e.target.value);
    };

    const saveTitle = () => {
        localStorage.setItem(`vini_project_title_${activeSite}`, projectTitle);
        setIsEditingTitle(false);
    };

    // Sort tasks by start date
    const sortedTasks = useMemo(() => {
        return [...projectTasks].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    }, [projectTasks]);

    // Calculate timeline range
    const timeline = useMemo(() => {
        if (sortedTasks.length === 0) return { start: new Date(), end: new Date() };

        const startDates = sortedTasks.map(t => new Date(t.startDate));
        const endDates = sortedTasks.map(t => new Date(t.endDate));

        const minDate = new Date(Math.min(...startDates));
        const maxDate = new Date(Math.max(...endDates));

        // Add buffer
        minDate.setDate(minDate.getDate() - 5);
        maxDate.setDate(maxDate.getDate() + 10);

        return { start: minDate, end: maxDate };
    }, [sortedTasks]);

    // Generate days for the chart
    const days = useMemo(() => {
        const dayList = [];
        const current = new Date(timeline.start);
        while (current <= timeline.end) {
            dayList.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return dayList;
    }, [timeline]);

    const handleEdit = (task) => {
        setEditingTask(task);
        setFormData({
            title: task.title,
            startDate: formatDateForInput(task.startDate),
            endDate: formatDateForInput(task.endDate),
            status: task.status,
            progress: task.progress || 0,
            color: task.color || getStatusColor(task.status)
        });
        setShowModal(true);
    };

    const handleDelete = (id) => {
        const task = projectTasks.find(t => (t.id === id || t._id === id));
        if (task && !canEditDelete(permission, task.createdAt)) {
            alert("Restricted: You cannot delete this task (Time limit exceeded).");
            return;
        }

        if (window.confirm('Are you sure you want to delete this task?')) {
            deleteProjectTask(id);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingTask) {
            if (!canEditDelete(permission, editingTask.createdAt)) {
                alert("Restricted: You cannot edit this task (Time limit exceeded).");
                return;
            }
            updateProjectTask({ ...formData, id: editingTask._id || editingTask.id });
        } else {
            addProjectTask(formData);
        }
        setShowModal(false);
        setEditingTask(null);
        setFormData({ title: '', startDate: '', endDate: '', status: 'Pending', progress: 0, color: '#3b82f6' });
    };

    const getTaskStyle = (task) => {
        const start = new Date(task.startDate);
        const end = new Date(task.endDate);
        const totalDuration = days.length;

        const startIndex = days.findIndex(d => d.toDateString() === start.toDateString());
        // If start date is before timeline start, cap it
        const effectiveStartIndex = startIndex >= 0 ? startIndex : 0;

        const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        return {
            gridColumnStart: effectiveStartIndex + 1,
            gridColumnEnd: `span ${durationDays}`,
            backgroundColor: task.color || getStatusColor(task.status)
        };
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return '#10b981'; // Green
            case 'In Progress': return '#3b82f6'; // Blue
            case 'Delayed': return '#ef4444'; // Red
            default: return '#94a3b8'; // Gray
        }
    };

    return (
        <div className="project-schedule">
            <div className="page-header">
                <div>
                    {isEditingTitle ? (
                        <div className="title-edit-container">
                            <input
                                type="text"
                                className="title-input"
                                value={projectTitle}
                                onChange={handleTitleChange}
                                onBlur={saveTitle}
                                onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div className="title-display-container">
                            <h1 onClick={() => setIsEditingTitle(true)} title="Click to edit project name">
                                {projectTitle}
                                <span className="edit-icon no-print">✎</span>
                            </h1>
                        </div>
                    )}
                    <p className="text-muted">Track project timeline and progress.</p>
                </div>
                <div className="header-actions no-print">
                    <button className="btn btn-secondary" onClick={() => window.print()}>
                        📄 Export to PDF
                    </button>
                    <button className="btn btn-primary" onClick={() => {
                        setEditingTask(null);
                        setFormData({ title: '', startDate: '', endDate: '', status: 'Pending', progress: 0, color: '#3b82f6' });
                        setShowModal(true);
                    }}>
                        + Add Task
                    </button>
                </div>
            </div>

            <div className="schedule-container">
                {/* Task List Side */}
                <div className="task-list">
                    <div className="task-header-row">
                        <div className="col-name">Task Title</div>
                        <div className="col-date">Start</div>
                        <div className="col-date">End</div>
                        <div className="col-action no-print"></div>
                    </div>
                    {sortedTasks.map(task => (
                        <div key={task._id || task.id} className="task-row">
                            <div className="col-name">{task.title}</div>
                            <div className="col-date">{formatDateForDisplay(task.startDate)}</div>
                            <div className="col-date">{formatDateForDisplay(task.endDate)}</div>
                            <div className="col-action no-print">
                                {canEditDelete(permission, task.createdAt) && (
                                    <>
                                        <button className="btn-icon" onClick={() => handleEdit(task)}>✎</button>
                                        <button className="btn-icon delete" onClick={() => handleDelete(task._id || task.id)}>🗑️</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    {sortedTasks.length === 0 && <div className="p-4 text-center text-muted">No tasks added yet.</div>}
                </div>

                {/* Gantt Chart Side */}
                <div className="gantt-chart-wrapper">
                    <div className="gantt-header">
                        {days.map((day, i) => (
                            <div key={i} className="gantt-day-header">
                                <div className="day-num">{day.getDate()}</div>
                                <div className="day-name">{day.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                            </div>
                        ))}
                    </div>
                    <div className="gantt-body">
                        {sortedTasks.map(task => (
                            <div key={task._id || task.id} className="gantt-row">
                                <div
                                    className="gantt-bar"
                                    style={getTaskStyle(task)}
                                    title={`${task.title}: ${formatDateForDisplay(task.startDate)} to ${formatDateForDisplay(task.endDate)}`}
                                >
                                    <span className="bar-label">{task.title}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay no-print">
                    <div className="modal-content">
                        <h2>{editingTask ? 'Edit Task' : 'New Task'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Task Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>End Date</label>
                                    <input
                                        type="date"
                                        required
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        style={{ padding: '2px', height: '38px' }}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Progress (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={formData.progress}
                                        onChange={e => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Color</label>
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                                        style={{ padding: '2px', height: '38px', width: '100%' }}
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Task</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .project-schedule {
                    padding: 20px;
                    height: calc(100vh - 80px); /* Full height minus header */
                    display: flex;
                    flex-direction: column;
                }
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .header-actions {
                    display: flex;
                    gap: 10px;
                }
                .schedule-container {
                    display: flex;
                    flex: 1;
                    background: white;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    overflow: hidden;
                }
                .task-list {
                    width: 350px;
                    border-right: 1px solid var(--border-color);
                    display: flex;
                    flex-direction: column;
                    background: #f8fafc;
                }
                .task-header-row {
                    display: flex;
                    padding: 10px;
                    background: #e2e8f0;
                    font-weight: 600;
                    font-size: 0.9rem;
                    border-bottom: 1px solid var(--border-color);
                    height: 50px;
                    align-items: center;
                }
                .task-row {
                    display: flex;
                    padding: 10px;
                    border-bottom: 1px solid var(--border-color);
                    height: 50px;
                    align-items: center;
                    background: white;
                }
                .col-name { flex: 1; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .col-date { width: 80px; font-size: 0.8rem; color: #64748b; }
                .col-action { width: 60px; display: flex; gap: 5px; justify-content: flex-end; }

                .gantt-chart-wrapper {
                    flex: 1;
                    overflow-x: auto;
                    display: flex;
                    flex-direction: column;
                }
                .gantt-header {
                    display: flex;
                    height: 50px;
                    background: #f1f5f9;
                    border-bottom: 1px solid var(--border-color);
                }
                .gantt-day-header {
                    min-width: 40px;
                    border-right: 1px solid #e2e8f0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.8rem;
                }
                .day-num { font-weight: 700; }
                .day-name { font-size: 0.7rem; color: #64748b; }

                .gantt-body {
                    flex: 1;
                    position: relative;
                    background-image: linear-gradient(to right, #f1f5f9 1px, transparent 1px);
                    background-size: 40px 100%; /* Match min-width of day header */
                }
                .gantt-row {
                    height: 50px; /* Match task row height */
                    border-bottom: 1px solid #f1f5f9;
                    display: grid;
                    grid-template-columns: repeat(${days.length}, 40px); /* Dynamic columns */
                    align-items: center;
                    padding: 0 5px;
                }
                .gantt-bar {
                    height: 24px;
                    border-radius: 12px;
                    color: white;
                    font-size: 0.75rem;
                    display: flex;
                    align-items: center;
                    padding: 0 10px;
                    white-space: nowrap;
                    overflow: hidden;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    z-index: 1;
                }

                .btn-icon {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 1rem;
                    opacity: 0.6;
                }
                .btn-icon:hover { opacity: 1; }
                .btn-icon.delete:hover { color: #ef4444; }

                /* Modal Styles */
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }
                .modal-content {
                    background: white;
                    padding: 25px;
                    border-radius: 12px;
                    width: 400px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                }
                .form-group { margin-bottom: 15px; }
                .form-group label { display: block; margin-bottom: 5px; font-weight: 500; }
                .form-group input, .form-group select {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                }
                .form-row { display: flex; gap: 15px; }
                .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }

                /* Print Styles */
                @media print {
                    @page { size: landscape; margin: 10mm; }
                    body * {
                        visibility: hidden;
                    }
                    .project-schedule, .project-schedule * {
                        visibility: visible;
                    }
                    .project-schedule {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: auto;
                        padding: 0;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .sidebar, .top-bar {
                        display: none !important;
                    }
                    .schedule-container {
                        border: none;
                    }
                    .gantt-chart-wrapper {
                        overflow: visible;
                    }
                    /* Force background colors to print */
                    .gantt-bar {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }

                /* Editable Title Styles */
                .title-display-container h1 {
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .title-display-container h1:hover .edit-icon {
                    opacity: 1;
                }
                .edit-icon {
                    font-size: 1rem;
                    opacity: 0.3;
                    transition: opacity 0.2s;
                }
                .title-input {
                    font-size: 2rem;
                    font-weight: 700;
                    padding: 5px;
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    width: 100%;
                    max-width: 400px;
                }
            `}</style>
        </div>
    );
};

export default ProjectSchedule;

import React, { useState } from 'react';
import { useData } from '../context/DataContext';

const Team = ({ currentUser, onNavigate, setPageData }) => {
  const { users, deleteUser, transactions, assignUserToSite, getAllUsers, deleteGlobalUser } = useData();
  const [showImportModal, setShowImportModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);

  const isAdmin = ['Owner', 'Partner', 'Admin'].includes(currentUser.role) || currentUser.permission === 'full_control';

  const handleAddMember = () => {
    setPageData(null);
    onNavigate('team-form');
  };

  const handleEditMember = (user) => {
    setPageData(user);
    onNavigate('team-form');
  };

  const openImportModal = async () => {
    setShowImportModal(true);
    console.log("Team Import - Calling getAllUsers...");
    const allUsers = await getAllUsers();
    console.log("Team Import - getAllUsers Result:", allUsers);

    if (Array.isArray(allUsers)) {
      // Filter out users already in the current list
      const currentIds = new Set(users.map(u => u._id || u.id));
      const filtered = allUsers.filter(u => !currentIds.has(u._id || u.id));
      setAvailableUsers(filtered);
    }
  };

  const handleImportUser = async (user) => {
    const result = await assignUserToSite(user);
    if (result.success) {
      alert("User imported successfully!");
      setShowImportModal(false);
    } else {
      alert("Failed to import: " + result.message);
    }
  };

  const handleDeleteGlobalUser = async (user) => {
    if (window.confirm(`Are you sure you want to permanently delete ${user.name}? This cannot be undone.`)) {
      const result = await deleteGlobalUser(user._id || user.id);
      if (result && result.success) {
        alert("User deleted successfully!");
        // Refresh the list
        const allUsers = await getAllUsers();
        if (Array.isArray(allUsers)) {
          const currentIds = new Set(users.map(u => u._id || u.id));
          const filtered = allUsers.filter(u => !currentIds.has(u._id || u.id));
          setAvailableUsers(filtered);
        }
      } else {
        alert("Failed to delete user: " + (result ? result.message : "Unknown error"));
      }
    }
  };

  if (!isAdmin) {
    // User View
    const myTransactions = transactions.filter(t => t.userId === currentUser.id);
    const paid = myTransactions
      .filter(t => t.type === 'payment' || t.type === 'advance')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const deductions = myTransactions
      .filter(t => t.type === 'deduction')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const remaining = Number(currentUser.salary) - paid - deductions;

    return (
      <div className="team-container">
        <div className="card profile-card">
          <div className="profile-header">
            <div className="profile-avatar large">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <h2>{currentUser.name}</h2>
            <span className="role-badge large">{currentUser.role}</span>
          </div>

          <div className="profile-details">
            <div className="detail-item">
              <span className="label">Mobile</span>
              <span className="value">{currentUser.mobile}</span>
            </div>
            <div className="detail-item">
              <span className="label">Username</span>
              <span className="value">{currentUser.username}</span>
            </div>
          </div>

          <div className="salary-summary">
            <h3>Salary Details</h3>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="label">Base Salary</span>
                <span className="value">₹{currentUser.salary}</span>
              </div>
              <div className="summary-item">
                <span className="label">Paid / Advance</span>
                <span className="value text-success">₹{paid}</span>
              </div>
              <div className="summary-item">
                <span className="label">Deductions</span>
                <span className="value text-danger">₹{deductions}</span>
              </div>
              <div className="summary-item total">
                <span className="label">Remaining</span>
                <span className="value">₹{remaining}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin View
  return (
    <div className="team-container">
      <div className="page-header">
        <h2>Team Management</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={openImportModal} className="btn btn-secondary" style={{ backgroundColor: '#6c757d', color: 'white' }}>
            Import Member
          </button>
          <button onClick={handleAddMember} className="btn btn-primary">
            + Add Member
          </button>
        </div>
      </div>

      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Import Member from Other Sites</h3>
            <div className="user-list">
              {availableUsers.length === 0 ? (
                <p>No other users found.</p>
              ) : (
                availableUsers.map(u => (
                  <div key={u._id || u.id} className="user-item">
                    <span>{u.name} ({u.role})</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleImportUser(u)} className="btn btn-sm btn-primary">Add</button>
                      <button onClick={() => handleDeleteGlobalUser(u)} className="btn btn-sm btn-danger" style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setShowImportModal(false)} className="btn btn-text" style={{ marginTop: '20px' }}>Close</button>
          </div>
        </div>
      )}

      <div className="table-container card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Mobile</th>
              <th>Username</th>
              <th>Salary</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id || user.id}>
                <td>
                  <div className="user-cell">
                    <div className="avatar small">{user.name.charAt(0).toUpperCase()}</div>
                    {user.name}
                  </div>
                </td>
                <td><span className="role-badge">{user.role}</span></td>
                <td>{user.mobile}</td>
                <td>{user.username}</td>
                <td>₹{user.salary}</td>
                <td>
                  <div className="actions">
                    <button onClick={() => handleEditMember(user)} className="btn-icon">✏️</button>
                    {user.username !== 'admin' && (
                      <button onClick={() => deleteUser(user._id || user.id)} className="btn-icon text-danger">🗑️</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .table-container {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th, .data-table td {
          padding: 16px;
          text-align: left;
          border-bottom: 1px solid var(--border-color);
        }

        .data-table th {
          font-weight: 600;
          color: var(--text-light);
          background: var(--bg-secondary);
        }

        .user-cell {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 500;
        }

        .role-badge {
          font-size: 0.75rem;
          padding: 4px 8px;
          border-radius: 12px;
          background: var(--primary-light);
          color: var(--primary-color);
          font-weight: 600;
        }

        .role-badge.large {
          font-size: 1rem;
          padding: 6px 12px;
        }

        .avatar.small {
          width: 32px;
          height: 32px;
          font-size: 0.9rem;
        }

        .avatar.large {
          width: 80px;
          height: 80px;
          font-size: 2rem;
          margin-bottom: 16px;
        }

        .profile-card {
          max-width: 600px;
          margin: 0 auto;
          text-align: center;
        }

        .profile-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 32px;
        }

        .profile-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 32px;
          text-align: left;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
        }

        .detail-item .label {
          font-size: 0.85rem;
          color: var(--text-light);
          margin-bottom: 4px;
        }

        .detail-item .value {
          font-weight: 500;
          font-size: 1.1rem;
        }

        .salary-summary {
          background: var(--bg-secondary);
          padding: 24px;
          border-radius: var(--radius-md);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 16px;
        }

        .summary-item {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .summary-item.total {
          grid-column: span 2;
          border-top: 1px solid var(--border-color);
          padding-top: 16px;
          margin-top: 8px;
          align-items: center;
        }

        .summary-item.total .value {
          font-size: 1.5rem;
          color: var(--primary-color);
          font-weight: 700;
        }

        .text-success { color: #059669; }
        .text-danger { color: #dc2626; }

        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }

        .modal-content {
            background: white;
            padding: 24px;
            border-radius: 8px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
        }

        .user-list {
            margin-top: 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .user-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            border: 1px solid #eee;
            border-radius: 4px;
        }
      `}</style>
    </div >
  );
};

export default Team;


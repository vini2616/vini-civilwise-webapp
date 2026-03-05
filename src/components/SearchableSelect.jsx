import React, { useState, useRef, useEffect } from 'react';
import './old-dropdown.css';

const SearchableSelect = ({ options, value, onChange, placeholder = "Select...", disabled = false, onAddNew = null, addNewLabel = "Add New", onDelete = null }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(event.target) &&
                menuRef.current &&
                !menuRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (isOpen) {
            // Focus input after a short delay to allow render
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            }, 0);
        }
    }, [isOpen]);

    const filteredOptions = options.filter(option =>
        (option?.label || '').toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (option) => {
        onChange(option.value);
        setIsOpen(false);
        setSearchTerm('');
    };

    const selectedLabel = options.find(o => o.value === value)?.label || value || '';

    return (
        <div className="searchable-select" ref={wrapperRef}>
            <div
                className={`searchable-select__control ${isOpen ? 'searchable-select--open' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={`searchable-select__selected ${!selectedLabel ? 'text-gray-400' : ''}`}>
                    {selectedLabel || placeholder}
                </span>
                <span className="searchable-select__arrow">▼</span>
            </div>

            {isOpen && (
                <div className="searchable-select__menu" ref={menuRef}>
                    <input
                        ref={inputRef}
                        type="text"
                        className="searchable-select__search"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                const exactMatch = options.find(o => o.label.toLowerCase() === searchTerm.toLowerCase());
                                if (exactMatch) {
                                    handleSelect(exactMatch);
                                } else if (onAddNew && searchTerm.trim().length > 0) {
                                    onAddNew(searchTerm);
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }
                            }
                        }}
                    />

                    {/* OPTIONS LIST */}
                    <div className="searchable-select__list">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    className={`searchable-select__option ${value === option.value ? 'searchable-select__option--active' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(option);
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                        <span>{option.label}</span>
                                        {onDelete && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(`Are you sure you want to delete "${option.label}"?`)) {
                                                        onDelete(option.value);
                                                    }
                                                }}
                                                className="btn-icon-danger"
                                                style={{ border: 'none', background: 'transparent', color: 'red', cursor: 'pointer', fontSize: '16px' }}
                                                title="Delete"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="searchable-select__option text-gray-400 cursor-default">
                                {searchTerm ? "No matches found" : (onAddNew ? "Type to add new item..." : "No options available")}
                            </div>
                        )}
                    </div>

                    {/* ADD NEW OPTION - ALWAYS VISIBLE IF ENABLED */}
                    {onAddNew && (
                        <div
                            className="searchable-select__add-new"
                            style={{
                                borderTop: '1px solid #eee',
                                color: '#3b82f6',
                                fontWeight: '500',
                                cursor: 'pointer',
                                padding: '10px 12px',
                                background: '#f8fafc'
                            }}
                            onMouseDown={(e) => {
                                e.preventDefault(); // Prevent blur
                                e.stopPropagation();
                                onAddNew(searchTerm);
                                setIsOpen(false);
                                setSearchTerm('');
                            }}
                        >
                            + {searchTerm.trim().length > 0 ? `${addNewLabel} "${searchTerm}"` : addNewLabel}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;

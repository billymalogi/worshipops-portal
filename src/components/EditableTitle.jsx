import React, { useState, useEffect, useRef } from 'react';

const EditableTitle = ({ initialTitle, onSave, isDarkMode }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const inputRef = useRef(null);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Optional: Select all text on click
      // inputRef.current.select(); 
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (title.trim() !== initialTitle) {
      onSave(title);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      inputRef.current.blur(); // Triggers handleBlur
    }
    if (e.key === 'Escape') {
      setTitle(initialTitle); // Revert
      setIsEditing(false);
    }
  };

  // SHARED STYLES (Used for both Text and Input to ensure perfect match)
  const commonStyles = {
    fontSize: '32px', // Big Header Size
    fontWeight: '800',
    color: isDarkMode ? '#f9fafb' : '#111827',
    lineHeight: '1.2',
    letterSpacing: '-0.02em',
    whiteSpace: 'nowrap',       // <--- PREVENTS WRAPPING TO 2 LINES
    overflow: 'hidden',         // <--- KEEPS IT CLEAN
    textOverflow: 'ellipsis',   // <--- ADDS ... IF TOO LONG
    maxWidth: '100%',
    fontFamily: 'inherit',
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          ...commonStyles,
          background: 'transparent',
          border: 'none',
          outline: 'none', // Removes the blue box
          width: '100%',   // Takes full width allowed
          padding: 0,
          margin: 0,
          caretColor: '#3b82f6', // Blue cursor
        }}
      />
    );
  }

  return (
    <h1
      onClick={() => setIsEditing(true)}
      style={{
        ...commonStyles,
        cursor: 'text', // Shows text cursor on hover
        margin: 0,
      }}
      title="Click to edit"
    >
      {title}
    </h1>
  );
};

export default EditableTitle;
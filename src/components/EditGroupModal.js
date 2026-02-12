import React, { useState, useEffect } from 'react';
import { FiX, FiCamera } from 'react-icons/fi';
import API from '../utils/api';
import './EditGroupModal.css';

const EditGroupModal = ({ groupId, onClose, onGroupUpdated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGroupDetails();
  }, [groupId]);

  const fetchGroupDetails = async () => {
    try {
      const data = await API.request(`/api/groups/${groupId}`);
      setName(data.name || '');
      setDescription(data.description || '');
      setPreview(data.image || null);
    } catch (err) {
      setError('Failed to load group details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!name.trim() || isSubmitting) return;

  setIsSubmitting(true);
  setError('');

  try {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    if (image) formData.append('profilePicture', image); // ← FIXED

    const updatedGroup = await API.request(`/api/groups/${groupId}`, {
      method: 'PUT',
      body: formData,
      isFormData: true
    });

    if (onGroupUpdated) onGroupUpdated(updatedGroup);
    onClose();
  } catch (err) {
    setError(err.message || 'Failed to update group');
  } finally {
    setIsSubmitting(false);
  }
};

  if (isLoading) return null;

  return (
    <div className="modal-overlay active">
      <div className="modal edit-group-modal">
        <div className="modal-header">
          <button className="modal-close" onClick={onClose}><FiX size={24} /></button>
          <span className="modal-title">Edit Group</span>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
        <div className="modal-content">
          {error && <div className="error-message">{error}</div>}
          <div className="edit-group-avatar-section">
            <div className="avatar-preview-container">
              <img src={preview || '/default-avatar.png'} alt="Group" className="group-avatar-preview" />
              <label htmlFor="group-image-upload" className="avatar-upload-label">
                <FiCamera size={20} />
              </label>
              <input 
                id="group-image-upload" 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                style={{ display: 'none' }} 
              />
            </div>
          </div>
          <div className="form-group">
            <label>Group Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Enter group name"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea 
              className="form-input" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="What's this group about?"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditGroupModal;

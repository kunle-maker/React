import React, { useState } from 'react';
import { FiX, FiImage, FiLock, FiGlobe } from 'react-icons/fi';

const CreateGroupModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    privacy: 'private',
    profilePicture: null
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        profilePicture: file
      }));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    
    const groupFormData = new FormData();
    groupFormData.append('name', formData.name);
    groupFormData.append('description', formData.description);
    groupFormData.append('privacy', formData.privacy);
    if (formData.profilePicture) {
      groupFormData.append('profilePicture', formData.profilePicture);
    }

    try {
      await onSubmit(groupFormData);
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay active">
      <div className="modal create-group-modal">
        <div className="modal-header">
          <button className="modal-close" onClick={onClose}>
            <FiX size={24} />
          </button>
          <span className="modal-title">Create New Group</span>
          <button 
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!formData.name.trim() || isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>

        <div className="modal-content">
          <form className="create-group-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Group Picture</label>
              <div 
                className="image-upload-area"
                onClick={() => document.getElementById('group-image-input').click()}
              >
                {previewImage ? (
                  <img src={previewImage} alt="Preview" className="image-preview" />
                ) : (
                  <>
                    <FiImage size={32} />
                    <p>Upload group picture</p>
                  </>
                )}
                <input
                  id="group-image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  hidden
                />
              </div>
            </div>

            <div className="form-group">
              <label>Group Name *</label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="Enter group name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                className="form-input"
                placeholder="What is this group about?"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Privacy</label>
              <div className="privacy-options">
                <label className="privacy-option">
                  <input
                    type="radio"
                    name="privacy"
                    value="private"
                    checked={formData.privacy === 'private'}
                    onChange={handleInputChange}
                  />
                  <div className="privacy-option-content">
                    <FiLock size={20} />
                    <div>
                      <span className="privacy-title">Private</span>
                      <span className="privacy-description">Only invited members can join</span>
                    </div>
                  </div>
                </label>
                
                <label className="privacy-option">
                  <input
                    type="radio"
                    name="privacy"
                    value="public"
                    checked={formData.privacy === 'public'}
                    onChange={handleInputChange}
                  />
                  <div className="privacy-option-content">
                    <FiGlobe size={20} />
                    <div>
                      <span className="privacy-title">Public</span>
                      <span className="privacy-description">Anyone can join</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
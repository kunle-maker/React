import React, { useState, useRef } from 'react';
import { FiX, FiImage, FiVideo, FiCrop, FiRotateCw } from 'react-icons/fi';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';

const CreatePost = ({ onClose, onSubmit }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [caption, setCaption] = useState('');
  const [cropImage, setCropImage] = useState(null);
  const [cropIndex, setCropIndex] = useState(-1);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);
  const cropperRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    
    // Generate preview URLs
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    
    // Generate preview URLs
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    // Revoke the object URL to free memory
    if (previewUrls[index]) {
      URL.revokeObjectURL(previewUrls[index]);
    }
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const openCropper = (index) => {
    if (selectedFiles[index].type.startsWith('image/')) {
      setCropIndex(index);
      const reader = new FileReader();
      reader.onload = (e) => {
        setCropImage(e.target.result);
      };
      reader.readAsDataURL(selectedFiles[index]);
    }
  };

  const applyCrop = () => {
    if (cropperRef.current) {
      cropperRef.current.getCroppedCanvas().toBlob((blob) => {
        const croppedFile = new File([blob], selectedFiles[cropIndex].name, {
          type: selectedFiles[cropIndex].type
        });
        
        // Revoke old preview URL
        if (previewUrls[cropIndex]) {
          URL.revokeObjectURL(previewUrls[cropIndex]);
        }
        
        // Create new preview URL for cropped image
        const newPreviewUrl = URL.createObjectURL(blob);
        
        const newFiles = [...selectedFiles];
        newFiles[cropIndex] = croppedFile;
        
        const newPreviewUrls = [...previewUrls];
        newPreviewUrls[cropIndex] = newPreviewUrl;
        
        setSelectedFiles(newFiles);
        setPreviewUrls(newPreviewUrls);
        setCropImage(null);
        setCropIndex(-1);
      }, selectedFiles[cropIndex].type);
    }
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsUploading(true);
    
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('media', file);
    });
    formData.append('caption', caption);
    
    try {
      await onSubmit(formData);
      // Clean up preview URLs
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-overlay active">
      <div className="modal create-post-modal">
        <div className="modal-header">
          <button className="modal-close" onClick={onClose}>
            <FiX size={24} />
          </button>
          <span className="modal-title">Create new post</span>
          <button 
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={selectedFiles.length === 0 || isUploading}
          >
            {isUploading ? 'Sharing...' : 'Share'}
          </button>
        </div>

        <div className="create-post-content" style={{ display: 'flex', flexWrap: 'wrap', overflow: 'auto' }}>
          {!cropImage ? (
            <>
              <div 
                className="create-post-media"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                style={{ flex: '1 1 400px', minWidth: '300px', background: 'var(--bg-dark-alt)' }}
              >
                {selectedFiles.length === 0 ? (
                  <div className="create-post-upload">
                    <FiImage size={48} />
                    <p>Drag photos and videos here</p>
                    <button 
                      className="btn btn-primary"
                      onClick={() => document.getElementById('file-input').click()}
                    >
                      Select from computer
                    </button>
                    <input
                      id="file-input"
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileSelect}
                      hidden
                    />
                  </div>
                ) : (
                  <div className="media-preview-grid" style={{ padding: '16px' }}>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="preview-item">
                        {file.type.startsWith('video/') ? (
                          <video 
                            src={previewUrls[index]} 
                            controls 
                            muted
                            preload="metadata"
                            playsInline
                            style={{ 
                              width: '100%', 
                              height: '200px', 
                              objectFit: 'contain',
                              background: '#000'
                            }}
                            onError={(e) => {
                              console.error('Preview video error:', e);
                              e.target.src = 'https://via.placeholder.com/300?text=Video+Error';
                            }}
                          />
                        ) : (
                          <img 
                            src={previewUrls[index]} 
                            alt={`Preview ${index}`}
                            style={{ 
                              width: '100%', 
                              height: '200px', 
                              objectFit: 'contain',
                              background: '#000'
                            }}
                            onError={(e) => {
                              console.error('Preview image error:', e);
                              e.target.src = 'https://via.placeholder.com/300?text=Image+Error';
                            }}
                          />
                        )}
                        <div className="preview-actions">
                          {file.type.startsWith('image/') && (
                            <button onClick={() => openCropper(index)} title="Crop image">
                              <FiCrop size={16} />
                            </button>
                          )}
                          <button onClick={() => removeFile(index)} title="Remove">
                            <FiX size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="create-post-form" style={{ flex: '1 1 300px', minWidth: '250px', padding: '20px', borderLeft: '1px solid var(--border-color)' }}>
                <div className="create-post-user" style={{ marginBottom: '16px' }}>
                  <img 
                    src={JSON.parse(localStorage.getItem('user'))?.profilePicture || '/default-avatar.png'}
                    alt="User"
                    className="user-avatar"
                    onError={(e) => {
                      e.target.src = 'https://ui-avatars.com/api/?name=User&background=random';
                    }}
                  />
                  <span style={{ fontWeight: '600' }}>{JSON.parse(localStorage.getItem('user'))?.username}</span>
                </div>
                
                <textarea
                  className="create-post-textarea"
                  placeholder="Write a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows="10"
                  style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', resize: 'none', fontSize: '16px', color: 'var(--text-primary)' }}
                />
              </div>
            </>
          ) : (
            <div className="crop-modal">
              <Cropper
                src={cropImage}
                style={{ height: 400, width: '100%' }}
                aspectRatio={1}
                guides={true}
                ref={cropperRef}
              />
              <div className="crop-controls">
                <button className="btn btn-secondary" onClick={() => cropperRef.current?.rotate(-90)}>
                  <FiRotateCw size={20} />
                </button>
                <button className="btn btn-secondary" onClick={() => cropperRef.current?.rotate(90)}>
                  <FiRotateCw size={20} style={{ transform: 'scaleX(-1)' }} />
                </button>
                <button className="btn btn-primary" onClick={applyCrop}>
                  Apply Crop
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
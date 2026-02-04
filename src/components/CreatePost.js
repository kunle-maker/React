import React, { useState, useRef } from 'react';
import { FiX, FiImage, FiVideo, FiCrop, FiRotateCw } from 'react-icons/fi';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';

const CreatePost = ({ onClose, onSubmit }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [caption, setCaption] = useState('');
  const [cropImage, setCropImage] = useState(null);
  const [cropIndex, setCropIndex] = useState(-1);
  const cropperRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
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
        
        const newFiles = [...selectedFiles];
        newFiles[cropIndex] = croppedFile;
        setSelectedFiles(newFiles);
        setCropImage(null);
        setCropIndex(-1);
      }, selectedFiles[cropIndex].type);
    }
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) return;
    
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('media', file);
    });
    formData.append('caption', caption);
    
    await onSubmit(formData);
    onClose();
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
            disabled={selectedFiles.length === 0}
          >
            Share
          </button>
        </div>

        <div className="create-post-content">
          {!cropImage ? (
            <>
              <div 
                className="create-post-media"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
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
                  <div className="media-preview">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="preview-item">
                        {file.type.startsWith('video/') ? (
                          <video src={URL.createObjectURL(file)} controls />
                        ) : (
                          <img src={URL.createObjectURL(file)} alt={`Preview ${index}`} />
                        )}
                        <div className="preview-actions">
                          <button onClick={() => openCropper(index)}>
                            <FiCrop size={16} />
                          </button>
                          <button onClick={() => removeFile(index)}>
                            <FiX size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="create-post-form">
                <div className="create-post-user">
                  <img 
                    src={JSON.parse(localStorage.getItem('user'))?.profilePicture || '/default-avatar.png'}
                    alt="User"
                    className="user-avatar"
                  />
                  <span>{JSON.parse(localStorage.getItem('user'))?.username}</span>
                </div>
                
                <textarea
                  className="create-post-textarea"
                  placeholder="Write a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows="4"
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
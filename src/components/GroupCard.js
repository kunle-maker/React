import React from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiMessageSquare, FiMoreVertical } from 'react-icons/fi';

const GroupCard = ({ group, onGroupUpdated }) => {
  const formatMemberCount = (count) => {
    if (count === 1) return '1 member';
    return `${count} members`;
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="group-card">
      <Link to={`/groups/${group._id}`} className="group-card-link">
        <div className="group-card-header">
          {group.profilePicture ? (
            <img
              src={group.profilePicture}
              alt={group.name}
              className="group-avatar"
            />
          ) : (
            <div className="group-avatar-initials">
              {getInitials(group.name)}
            </div>
          )}
          <div className="group-info">
            <h3 className="group-name">{group.name}</h3>
            <div className="group-meta">
              <span className="group-meta-item">
                <FiUsers size={12} /> {formatMemberCount(group.members.length)}
              </span>
              <span className="group-meta-item">
                <FiMessageSquare size={12} /> {group.unreadCount || 0} unread
              </span>
            </div>
          </div>
          <button className="group-more-btn">
            <FiMoreVertical size={20} />
          </button>
        </div>
        
        {group.description && (
          <p className="group-description">{group.description}</p>
        )}
        
        <div className="group-members-preview">
          {group.members.slice(0, 5).map((member, index) => (
            <img
              key={member._id}
              src={member.profilePicture || '/default-avatar.png'}
              alt={member.username}
              className="member-avatar"
              style={{ marginLeft: index > 0 ? '-8px' : '0' }}
            />
          ))}
          {group.members.length > 5 && (
            <div className="more-members">+{group.members.length - 5}</div>
          )}
        </div>
        
        <div className="group-last-activity">
          Last activity: {new Date(group.lastActivity).toLocaleDateString()}
        </div>
      </Link>
    </div>
  );
};

export default GroupCard;
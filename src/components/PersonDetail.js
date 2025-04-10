// src/components/PersonDetail.js
import React from 'react';
import './PersonDetail.css';

const PersonDetail = ({ person, people, onEdit, onViewNetwork }) => {
    if (!person) return null;

    // Find family members
    console.log("Person")
    console.dir(person)

    console.log("people")
    console.dir(people)

    const father = people.find(p => p.id === person.fatherid);
    console.log("Father: ", father)
    const mother = people.find(p => p.id === person.motherid);
    console.log("mother: ", mother)
    const spouse = people.find(p => p.id === person.spouseid);
    console.log("spouse: ", spouse)
    const children = people.filter(p => p.fatherid === person.id || p.motherid === person.id);

    // Format birthdate
    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Calculate age
    const calculateAge = (birthdate) => {
        if (!birthdate) return 'Unknown';
        const birth = new Date(birthdate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }

        return age;
    };

    const renderFamilyMember = (member, relationship) => {
        if (!member) return <span>Unknown</span>;

        return (
            <div className="family-member">
                <span className="member-name">{member.personname}</span>
                <span className="member-relation">({relationship})</span>
            </div>
        );
    };

    return (
        <div className="person-detail">
            <div className="person-header">
                <h2>{person.personname}</h2>
                <div className="person-actions">
                    <button onClick={onEdit}>Edit</button>
                    <button onClick={onViewNetwork}>View Family Network</button>
                </div>
            </div>

            <div className="person-info">
                <div className="info-group">
                    <div className="info-item">
                        <strong>Gender:</strong> {person.gender || 'Not specified'}
                    </div>
                    <div className="info-item">
                        <strong>Birth Date:</strong> {formatDate(person.birthdate)}
                    </div>
                    <div className="info-item">
                        <strong>Age:</strong> {calculateAge(person.birthdate)}
                    </div>
                    <div className="info-item">
                        <strong>Current Location:</strong> {person.currentlocation || 'Unknown'}
                    </div>
                </div>
            </div>

            <div className="family-section">
                <h3>Family Members</h3>

                <div className="family-group">
                    <h4>Parents</h4>
                    <div className="family-members">
                        {father ? renderFamilyMember(father, 'Father') : <span>Father: Unknown</span>}
                        {mother ? renderFamilyMember(mother, 'Mother') : <span>Mother: Unknown</span>}
                    </div>
                </div>

                <div className="family-group">
                    <h4>Spouse</h4>
                    <div className="family-members">
                        {spouse ? renderFamilyMember(spouse, 'Spouse') : <span>None recorded</span>}
                    </div>
                </div>

                <div className="family-group">
                    <h4>Children</h4>
                    <div className="family-members">
                        {children.length > 0 ? (
                            children.map(child => (
                                <div key={child.id} className="family-member">
                                    {renderFamilyMember(child, 'Child')}
                                </div>
                            ))
                        ) : (
                            <span>None recorded</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PersonDetail;
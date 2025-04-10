// src/components/PersonForm.js
import React, { useState, useEffect } from 'react';
import './PersonForm.css';

const PersonForm = ({ person, people, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        birthdate: '',
        fatherid: '',
        motherid: '',
        spouseid: '',
        gender: '',
        currentlocation: ''
    });

    const [errors, setErrors] = useState({});

    // If we're editing, populate the form with the person's data
    useEffect(() => {
        if (person) {
            // Format date for input field (YYYY-MM-DD)
            let formattedDate = '';
            if (person.birthdate) {
                const date = new Date(person.birthdate);
                formattedDate = date.toISOString().split('T')[0];
            }

            setFormData({
                id: person.id || '',
                name: person.personname || '',
                birthdate: formattedDate,
                fatherid: person.fatherid || '',
                motherid: person.motherid || '',
                spouseid: person.spouseid || '',
                gender: person.gender || '',
                currentlocation: person.currentlocation || ''
            });
        } else {
            // For a new person, generate a new ID (in a real app, this would be handled server-side)
            const maxId = people.reduce((max, p) => Math.max(max, p.id), 0);
            setFormData(prev => ({
                ...prev,
                id: maxId + 1
            }));
        }
    }, [person, people]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (formData.fatherid && formData.fatherid === formData.id) {
            newErrors.fatherid = 'A person cannot be their own father';
        }

        if (formData.motherid && formData.motherid === formData.id) {
            newErrors.motherid = 'A person cannot be their own mother';
        }

        if (formData.spouseid && formData.spouseid === formData.id) {
            newErrors.spouseid = 'A person cannot be their own spouse';
        }

        // Additional validation for family relationships
        const father = people.find(p => p.id.toString() === formData.fatherid.toString());
        if (father && father.gender && father.gender.toLowerCase() !== 'male') {
            newErrors.fatherid = 'Father must be male';
        }

        const mother = people.find(p => p.id.toString() === formData.motherid.toString());
        if (mother && mother.gender && mother.gender.toLowerCase() !== 'female') {
            newErrors.motherid = 'Mother must be female';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            // Convert empty strings to null for IDs
            const processedData = {
                ...formData,
                fatherid: formData.fatherid || null,
                motherid: formData.motherid || null,
                spouseid: formData.spouseid || null
            };
            onSubmit(processedData);
        }
    };

    // Filter people for parent/spouse selection (exclude self)
    const potentialFathers = people.filter(p =>
        p.id !== formData.id && (!p.gender || p.gender.toLowerCase() === 'male')
    );

    const potentialMothers = people.filter(p =>
        p.id !== formData.id && (!p.gender || p.gender.toLowerCase() === 'female')
    );

    const potentialSpouses = people.filter(p =>
        p.id !== formData.id
    );

    return (
        <div className="person-form">
            <h2>{person ? 'Edit Person' : 'Add New Person'}</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="name">Name *</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                    {errors.name && <div className="error">{errors.name}</div>}
                </div>

                <div className="form-group">
                    <label htmlFor="birthdate">Birth Date</label>
                    <input
                        type="date"
                        id="birthdate"
                        name="birthdate"
                        value={formData.birthdate}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="gender">Gender</label>
                    <select
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                    >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="currentlocation">Current Location</label>
                    <input
                        type="text"
                        id="currentlocation"
                        name="currentlocation"
                        value={formData.currentlocation}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="fatherid">Father</label>
                    <select
                        id="fatherid"
                        name="fatherid"
                        value={formData.fatherid}
                        onChange={handleChange}
                    >
                        <option value="">Unknown/Not Specified</option>
                        {potentialFathers.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    {errors.fatherid && <div className="error">{errors.fatherid}</div>}
                </div>

                <div className="form-group">
                    <label htmlFor="motherid">Mother</label>
                    <select
                        id="motherid"
                        name="motherid"
                        value={formData.motherid}
                        onChange={handleChange}
                    >
                        <option value="">Unknown/Not Specified</option>
                        {potentialMothers.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    {errors.motherid && <div className="error">{errors.motherid}</div>}
                </div>

                <div className="form-group">
                    <label htmlFor="spouseid">Spouse</label>
                    <select
                        id="spouseid"
                        name="spouseid"
                        value={formData.spouseid}
                        onChange={handleChange}
                    >
                        <option value="">None/Not Specified</option>
                        {potentialSpouses.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    {errors.spouseid && <div className="error">{errors.spouseid}</div>}
                </div>

                <div className="form-actions">
                    <button type="submit" className="submit-btn">
                        {person ? 'Update Person' : 'Add Person'}
                    </button>
                    <button type="button" className="cancel-btn" onClick={onCancel}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PersonForm;
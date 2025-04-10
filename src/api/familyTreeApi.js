// src/api/familyTreeApi.js
// A dedicated API client to handle all backend communication

const API_BASE_URL = 'http://localhost:5050/api';

// Helper function to handle API responses
const handleResponse = async (response) => {
    if (!response.ok) {
        // Try to get error message from the response
        try {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        } catch (e) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
    }

    return response.json();
};

// Get all people
export const getAllPeople = async () => {
    const response = await fetch(`${API_BASE_URL}/people`);
    return handleResponse(response);
};

// Get person by ID
export const getPersonById = async (id) => {
    const response = await fetch(`${API_BASE_URL}/people/${id}`);
    return handleResponse(response);
};

// Search people by name or location
export const searchPeople = async (term, field = 'both') => {
    const params = new URLSearchParams({ term, field });
    const response = await fetch(`${API_BASE_URL}/search?${params}`);
    return handleResponse(response);
};

// Add new person
export const addPerson = async (personData) => {
    const response = await fetch(`${API_BASE_URL}/people`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(personData),
    });

    return handleResponse(response);
};

// Update person
export const updatePerson = async (id, personData) => {
    const response = await fetch(`${API_BASE_URL}/people/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(personData),
    });

    return handleResponse(response);
};

// Delete person
export const deletePerson = async (id) => {
    const response = await fetch(`${API_BASE_URL}/people/${id}`, {
        method: 'DELETE',
    });

    return handleResponse(response);
};

// Get family network data for a person
export const getFamilyNetwork = async (id) => {
    const response = await fetch(`${API_BASE_URL}/people/${id}/network`);
    return handleResponse(response);
};

export default {
    getAllPeople,
    getPersonById,
    searchPeople,
    addPerson,
    updatePerson,
    deletePerson,
    getFamilyNetwork
};
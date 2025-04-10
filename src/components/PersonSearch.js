// src/components/PersonSearch.js
import React, { useState, useEffect } from 'react';
import './PersonSearch.css';

const API_BASE_URL = 'http://localhost:5050/api';

const PersonSearch = ({ people, onSelectPerson, loading }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchField, setSearchField] = useState('name'); // default search by name
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);

    // Update search results when search term or field changes
    useEffect(() => {
        const performSearch = async () => {
            if (!searchTerm) {
                setSearchResults(people);
                return;
            }

            try {
                setIsSearching(true);
                const response = await fetch(
                    //`${API_BASE_URL}/search?term=${encodeURIComponent(searchTerm)}&field=${searchField}`
                    `${API_BASE_URL}/search?${searchField}=${encodeURIComponent(searchTerm)}`
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                setSearchResults(data);
                setSearchError(null);
            } catch (error) {
                console.error('Error searching people:', error);
                setSearchError('Search failed. Please try again.');
                // Fall back to client-side filtering
                filterPeopleLocally();
            } finally {
                setIsSearching(false);
            }
        };

        // Fallback client-side filtering if API fails
        const filterPeopleLocally = () => {
            const searchLower = searchTerm.toLowerCase();

            let results;
            switch (searchField) {
                case 'name':
                    results = people.filter(person =>
                        person.personname.toLowerCase().includes(searchLower)
                    );
                    break;
                case 'location':
                    results = people.filter(person =>
                        person.currentlocation && person.currentlocation.toLowerCase().includes(searchLower)
                    );
                    break;
                case 'both':
                default:
                    results = people.filter(person =>
                        person.personname.toLowerCase().includes(searchLower) ||
                        (person.currentlocation && person.currentlocation.toLowerCase().includes(searchLower))
                    );
                    break;
            }

            setSearchResults(results);
        };

        const timer = setTimeout(() => {
            performSearch();
        }, 500); // Debounce search

        return () => clearTimeout(timer);
    }, [searchTerm, searchField, people]);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleFieldChange = (e) => {
        setSearchField(e.target.value);
    };

    return (
        <div className="search-container">
            <h3>Search People</h3>
            <div className="search-controls">
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={handleSearch}
                    disabled={loading}
                />
                <select
                    value={searchField}
                    onChange={handleFieldChange}
                    disabled={loading}
                >
                    <option value="name">By Name</option>
                    <option value="location">By Location</option>
                    <option value="both">By Name or Location</option>
                </select>
            </div>

            {searchError && (
                <div className="search-error">{searchError}</div>
            )}

            <div className="results-list">
                {(loading || isSearching) ? (
                    <div className="searching">Searching...</div>
                ) : searchResults.length > 0 ? (
                    searchResults.map(person => (
                        <div
                            key={person.id}
                            className="person-item"
                            onClick={() => onSelectPerson(person)}
                        >
                            <span className="person-name">{person.personname}</span>
                            {person.currentlocation && (
                                <span className="person-location">📍 {person.currentlocation}</span>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="no-results">No matching people found.</div>
                )}
            </div>
        </div>
    );
};

export default PersonSearch;
// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import PersonSearch from './components/PersonSearch';
import PersonDetail from './components/PersonDetail';
import PersonForm from './components/PersonForm';
import FamilyTreeView from './components/FamilyTreeView';
import { fetchAllPeople } from './mockData'; // Import mock data instead of using actual API

const API_BASE_URL = 'http://localhost:5050/api';



function App() {
  const [people, setPeople] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('add'); // 'add' or 'edit'
  const [networkView, setNetworkView] = useState(false);

  useEffect(() => {
    // Fetch initial data from mock data
    const loadData = async () => {
      try {
        console.log("loading Base Data");
        const response = await fetch(API_BASE_URL + '/people');
        console.log("After return of the people api call");

        // Parse the JSON from the response
        const data = await response.json();
        console.dir(data);

        setPeople(data);
      } catch (error) {
        console.error('Error fetching people:', error);
      }
    };

    loadData();
  }, []);

  const handlePersonSelect = (person) => {
    setSelectedPerson(person);
    setNetworkView(false);
  };

  const handleAddPerson = () => {
    setSelectedPerson(null);
    setFormMode('add');
    setShowForm(true);
    setNetworkView(false);
  };

  const handleEditPerson = () => {
    setFormMode('edit');
    setShowForm(true);
    setNetworkView(false);
  };

  const handleViewNetwork = () => {
    setNetworkView(true);
    setShowForm(false);
  };

  const handleFormSubmit = (personData) => {
    // For development, just update the local state without API calls
    try {
      if (formMode === 'add') {
        // Add new person
        setPeople([...people, personData]);
        setSelectedPerson(personData);
      } else {
        // Update existing person
        const updatedPeople = people.map(p =>
          p.id === personData.id ? personData : p
        );
        setPeople(updatedPeople);
        setSelectedPerson(personData);
      }

      setShowForm(false);
    } catch (error) {
      console.error('Error saving person:', error);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Family Tree App</h1>
        <button onClick={handleAddPerson}>Add New Person</button>
      </header>
      <div className="app-content">
        <div className="sidebar">
          <PersonSearch
            people={people}
            onSelectPerson={handlePersonSelect}
          />
        </div>
        <div className="main-content">
          {showForm ? (
            <PersonForm
              person={formMode === 'edit' ? selectedPerson : null}
              people={people}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          ) : selectedPerson ? (
            <>
              <PersonDetail
                person={selectedPerson}
                people={people}
                onEdit={handleEditPerson}
                onViewNetwork={handleViewNetwork}
              />
              {networkView && (
                <FamilyTreeView
                  person={selectedPerson}
                  people={people}
                />
              )}
            </>
          ) : (
            <div className="welcome-message">
              <h2>Welcome to the Family Tree App</h2>
              <p>Search for a person or add a new one to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
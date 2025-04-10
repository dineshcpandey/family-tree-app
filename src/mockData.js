// src/mockData.js
// This file provides sample data for development purposes
// Replace API calls with this data while developing the frontend

export const mockPeople = [
    {
    id: 1,
    name: "John Smith",
    birthdate: "1975-05-15",
    fatherid: 3,
    motherid: 4,
    spouseid: 2,
    gender: "Male",
    currentlocation: "New York"
    },
    {
    id: 2,
    name: "Mary Smith",
    birthdate: "1978-09-21",
    fatherid: 5,
    motherid: 6,
    spouseid: 1,
    gender: "Female",
    currentlocation: "New York"
    },
    {
    id: 3,
    name: "Robert Smith",
    birthdate: "1945-03-10",
    fatherid: null,
    motherid: null,
    spouseid: 4,
    gender: "Male",
    currentlocation: "Chicago"
    },
    {
    id: 4,
    name: "Jennifer Smith",
    birthdate: "1948-12-03",
    fatherid: null,
    motherid: null,
    spouseid: 3,
    gender: "Female",
    currentlocation: "Chicago"
    },
    {
    id: 5,
    name: "Michael Johnson",
    birthdate: "1950-06-20",
    fatherid: null,
    motherid: null,
    spouseid: 6,
    gender: "Male",
    currentlocation: "Boston"
    },
    {
    id: 6,
    name: "Sarah Johnson",
    birthdate: "1952-08-15",
    fatherid: null,
    motherid: null,
    spouseid: 5,
    gender: "Female",
    currentlocation: "Boston"
    },
    {
    id: 7,
    name: "David Smith",
    birthdate: "2005-04-12",
    fatherid: 1,
    motherid: 2,
    spouseid: null,
    gender: "Male",
    currentlocation: "New York"
    },
    {
    id: 8,
    name: "Lisa Smith",
    birthdate: "2008-07-18",
    fatherid: 1,
    motherid: 2,
    spouseid: null,
    gender: "Female",
    currentlocation: "New York"
    },
    {
    id: 9,
    name: "Emma Johnson",
    birthdate: "1980-11-25",
    fatherid: 5,
    motherid: 6,
    spouseid: 10,
    gender: "Female",
    currentlocation: "Los Angeles"
    },
    {
    id: 10,
    name: "Daniel Wilson",
    birthdate: "1979-02-14",
    fatherid: null,
    motherid: null,
    spouseid: 9,
    gender: "Male",
    currentlocation: "Los Angeles"
    }
];

// Helper functions to simulate API requests
// Get all people
export const fetchAllPeople = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockPeople);
        },
        300); // Simulate network delay
    });
};

// Get person by ID
export const fetchPersonById = (id) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const person = mockPeople.find(p => p.id === parseInt(id));
      if (person) {
        resolve(person);
            } else {
        reject(new Error("Person not found"));
            }
        },
        300);
    });
};

// Search people by name or location
export const searchPeople = (term, field) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let results;
      const termLower = term.toLowerCase();
      
      if (field === 'name') {
        results = mockPeople.filter(p => 
          p.name.toLowerCase().includes(termLower)
        );
            } else if (field === 'location') {
        results = mockPeople.filter(p => 
          p.currentlocation && p.currentlocation.toLowerCase().includes(termLower)
        );
            } else {
                // Search both
        results = mockPeople.filter(p => 
          p.name.toLowerCase().includes(termLower) || 
          (p.currentlocation && p.currentlocation.toLowerCase().includes(termLower))
        );
            }
      
      resolve(results);
        },
        300);
    });
};
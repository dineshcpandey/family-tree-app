// Configuration
const API_BASE_URL = 'http://localhost:5050/api';
let allPeople = [];
let currentPersonId = null;

// D3.js tree layout
let svg, g;
let tree;
let i = 0; // Node ID counter for D3
let root; // Current tree root

// Store expanded state for each person
const expandedNodes = new Map();
// Cache network data to avoid redundant API calls
const networkCache = new Map();

// Initialize the visualization
async function init() {
    try {
        // Fetch all people for the dropdown
        const response = await fetch(`${API_BASE_URL}/people`);
        if (!response.ok) {
            throw new Error('Failed to fetch people data');
        }

        allPeople = await response.json();
        console.log('Loaded people:', allPeople.length);

        if (allPeople.length === 0) {
            alert('No people found in the database.');
            return;
        }

        // Populate the dropdown
        populatePersonDropdown();

        // Setup D3 tree
        setupD3Tree();

        // Set up event listeners
        setupEventListeners();

        // Load the first person's network
        if (allPeople.length > 0) {
            loadPersonNetwork(allPeople[0].id);
        }

    } catch (error) {
        console.error('Error initializing:', error);
        alert('Error loading family data. Please check the console for details.');
    }
}

// Populate the person dropdown
function populatePersonDropdown() {
    const dropdown = document.getElementById('center-person');

    // Clear existing options
    dropdown.innerHTML = '<option value="">Select a person...</option>';

    // Add options for each person, sorted by name
    allPeople
        .sort((a, b) => {
            const nameA = a.personname || 'Unknown';
            const nameB = b.personname || 'Unknown';
            return nameA.localeCompare(nameB);
        })
        .forEach(person => {
            const option = document.createElement('option');
            option.value = person.id;
            option.textContent = person.personname || 'Unknown';
            dropdown.appendChild(option);
        });
}

// Setup the D3 tree
function setupD3Tree() {
    // Set the dimensions and margins
    const margin = { top: 20, right: 120, bottom: 30, left: 120 };
    const width = 1100 - margin.left - margin.right;
    const height = 700 - margin.top - margin.bottom;

    // Append the svg object
    svg = d3.select("#family-chart")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", [-margin.left, -margin.top, width + margin.left + margin.right, height + margin.top + margin.bottom])
        .call(d3.zoom().on("zoom", (event) => {
            g.attr("transform", event.transform);
        }));

    // Append a group for transformation
    g = svg.append("g");

    // Define the tree layout
    tree = d3.tree().size([height, width]);
}

// Fetch and cache network data for a person
async function fetchAndCacheNetworkData(personId) {
    try {
        const response = await fetch(`${API_BASE_URL}/people/${personId}/network`);
        if (!response.ok) {
            throw new Error(`Failed to fetch network for person ${personId}`);
        }

        const networkData = await response.json();
        networkCache.set(personId, networkData);
        return networkData;
    } catch (error) {
        console.error('Error fetching network data:', error);
        return null;
    }
}

// Load a person's network
async function loadPersonNetwork(personId) {
    try {
        // Update current person ID
        currentPersonId = personId;

        // Update the dropdown
        document.getElementById('center-person').value = personId;

        // Check if we already have this network data cached
        if (!networkCache.has(personId)) {
            await fetchAndCacheNetworkData(personId);
        }

        // Initialize expansion for this person if not already expanded
        if (!expandedNodes.has(personId)) {
            expandedNodes.set(personId, {
                parents: true,
                spouse: true,
                children: true,
                siblings: true
            });
        }

        // Update the visualization
        updateVisualization();

    } catch (error) {
        console.error('Error loading person network:', error);
        alert('Error loading network data. Please check the console for details.');
    }
}

// Toggle expansion state for a person
async function togglePersonExpansion(personId) {
    // If not already expanded, expand it
    if (!expandedNodes.has(personId)) {
        expandedNodes.set(personId, {
            parents: true,
            spouse: true,
            children: true,
            siblings: true
        });

        // Fetch network data if not cached
        if (!networkCache.has(personId)) {
            await fetchAndCacheNetworkData(personId);
        }
    }
    // If already expanded, toggle between full expansion and collapse
    else {
        const state = expandedNodes.get(personId);
        const allExpanded = state.parents && state.spouse && state.children && state.siblings;

        if (allExpanded) {
            // If all are expanded, collapse everything
            expandedNodes.delete(personId);
        } else {
            // Otherwise expand all
            expandedNodes.set(personId, {
                parents: true,
                spouse: true,
                children: true,
                siblings: true
            });
        }
    }

    // Update visualization
    updateVisualization();
}

// Toggle specific category expansion for a person
async function toggleCategoryExpansion(personId, category) {
    // Fetch network data if not cached
    if (!networkCache.has(personId)) {
        await fetchAndCacheNetworkData(personId);
    }

    // Get or create expansion state
    let state;
    if (expandedNodes.has(personId)) {
        state = expandedNodes.get(personId);
    } else {
        state = {
            parents: false,
            spouse: false,
            children: false,
            siblings: false
        };
    }

    // Toggle this specific category
    state[category] = !state[category];
    expandedNodes.set(personId, state);

    // Update visualization
    updateVisualization();
}

// Check if a person has relationships that can be expanded
function hasExpandableRelationships(personId) {
    if (!networkCache.has(personId)) {
        return false; // Not loaded yet, can't determine
    }

    const network = networkCache.get(personId);
    return (
        (network.parents && network.parents.length > 0) ||
        network.spouse ||
        (network.children && network.children.length > 0) ||
        (network.siblings && network.siblings.length > 0)
    );
}

// Get current tree data based on expanded state
function getCurrentTreeData() {
    // If no current person, return empty tree
    if (!currentPersonId || !networkCache.has(currentPersonId)) {
        return { name: "No Data", children: [] };
    }

    // Start with the current person
    const currentNetwork = networkCache.get(currentPersonId);
    const rootPerson = currentNetwork.person;

    const treeRoot = {
        id: rootPerson.id,
        name: rootPerson.personname || 'Unknown',
        gender: rootPerson.gender,
        data: rootPerson,
        children: []
    };

    // Check if current person is expanded
    const isExpanded = expandedNodes.has(currentPersonId);
    const expansionState = isExpanded ? expandedNodes.get(currentPersonId) : null;

    // Add relationships based on expansion state
    if (isExpanded) {
        // Add parents if expanded
        if (expansionState.parents && currentNetwork.parents && currentNetwork.parents.length > 0) {
            const parentsNode = {
                name: 'Parents',
                category: true,
                personId: currentPersonId,
                categoryType: 'parents',
                children: currentNetwork.parents.map(parent => ({
                    id: parent.id,
                    name: parent.personname || 'Unknown',
                    gender: parent.gender,
                    data: parent,
                    relationship: 'parent',
                    expandable: hasExpandableRelationships(parent.id),
                    children: getExpandedChildren(parent.id)
                }))
            };
            treeRoot.children.push(parentsNode);
        }

        // Add spouse if expanded
        if (expansionState.spouse && currentNetwork.spouse) {
            const spouseNode = {
                name: 'Spouse',
                category: true,
                personId: currentPersonId,
                categoryType: 'spouse',
                children: [{
                    id: currentNetwork.spouse.id,
                    name: currentNetwork.spouse.personname || 'Unknown',
                    gender: currentNetwork.spouse.gender,
                    data: currentNetwork.spouse,
                    relationship: 'spouse',
                    expandable: hasExpandableRelationships(currentNetwork.spouse.id),
                    children: getExpandedChildren(currentNetwork.spouse.id)
                }]
            };
            treeRoot.children.push(spouseNode);
        }

        // Add children if expanded
        if (expansionState.children && currentNetwork.children && currentNetwork.children.length > 0) {
            const childrenNode = {
                name: 'Children',
                category: true,
                personId: currentPersonId,
                categoryType: 'children',
                children: currentNetwork.children.map(child => ({
                    id: child.id,
                    name: child.personname || 'Unknown',
                    gender: child.gender,
                    data: child,
                    relationship: 'child',
                    expandable: hasExpandableRelationships(child.id),
                    children: getExpandedChildren(child.id)
                }))
            };
            treeRoot.children.push(childrenNode);
        }

        // Add siblings if expanded
        if (expansionState.siblings && currentNetwork.siblings && currentNetwork.siblings.length > 0) {
            const siblingsNode = {
                name: 'Siblings',
                category: true,
                personId: currentPersonId,
                categoryType: 'siblings',
                children: currentNetwork.siblings.map(sibling => ({
                    id: sibling.id,
                    name: sibling.personname || 'Unknown',
                    gender: sibling.gender,
                    data: sibling,
                    relationship: 'sibling',
                    expandable: hasExpandableRelationships(sibling.id),
                    children: getExpandedChildren(sibling.id)
                }))
            };
            treeRoot.children.push(siblingsNode);
        }
    }

    return treeRoot;
}

// Get children for an expanded node
function getExpandedChildren(personId) {
    // If node isn't expanded or no cache data, return empty array
    if (!expandedNodes.has(personId) || !networkCache.has(personId)) {
        return [];
    }

    const network = networkCache.get(personId);
    const expansionState = expandedNodes.get(personId);
    const children = [];

    // Add relationship categories based on expansion state
    if (expansionState.parents && network.parents && network.parents.length > 0) {
        children.push({
            name: 'Parents',
            category: true,
            personId: personId,
            categoryType: 'parents',
            children: network.parents.map(parent => ({
                id: parent.id,
                name: parent.personname || 'Unknown',
                gender: parent.gender,
                data: parent,
                relationship: 'parent',
                expandable: hasExpandableRelationships(parent.id),
                children: getExpandedChildren(parent.id)
            }))
        });
    }

    if (expansionState.spouse && network.spouse) {
        children.push({
            name: 'Spouse',
            category: true,
            personId: personId,
            categoryType: 'spouse',
            children: [{
                id: network.spouse.id,
                name: network.spouse.personname || 'Unknown',
                gender: network.spouse.gender,
                data: network.spouse,
                relationship: 'spouse',
                expandable: hasExpandableRelationships(network.spouse.id),
                children: getExpandedChildren(network.spouse.id)
            }]
        });
    }

    if (expansionState.children && network.children && network.children.length > 0) {
        children.push({
            name: 'Children',
            category: true,
            personId: personId,
            categoryType: 'children',
            children: network.children.map(child => ({
                id: child.id,
                name: child.personname || 'Unknown',
                gender: child.gender,
                data: child,
                relationship: 'child',
                expandable: hasExpandableRelationships(child.id),
                children: getExpandedChildren(child.id)
            }))
        });
    }

    if (expansionState.siblings && network.siblings && network.siblings.length > 0) {
        children.push({
            name: 'Siblings',
            category: true,
            personId: personId,
            categoryType: 'siblings',
            children: network.siblings.map(sibling => ({
                id: sibling.id,
                name: sibling.personname || 'Unknown',
                gender: sibling.gender,
                data: sibling,
                relationship: 'sibling',
                expandable: hasExpandableRelationships(sibling.id),
                children: getExpandedChildren(sibling.id)
            }))
        });
    }

    return children;
}

// Update the D3 visualization
function updateVisualization() {
    // Get current tree data
    const treeData = getCurrentTreeData();

    // Clear the previous visualization
    g.selectAll("*").remove();

    // Create a root node from the data
    root = d3.hierarchy(treeData);

    // Assigns parent, children, height, depth
    root.x0 = 0;
    root.y0 = 0;

    // Compute the new tree layout
    const treeLayout = tree(root);

    // Compute the node and link positions
    const nodes = treeLayout.descendants();
    const links = treeLayout.links();

    // Normalize for fixed-depth
    nodes.forEach(d => {
        d.y = d.depth * 180; // Horizontal spacing
    });

    // Update the nodes
    const node = g.selectAll('g.node')
        .data(nodes, d => d.id || (d.id = ++i))
        .join('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.y},${d.x})`)
        .on('click', function (event, d) {
            // Handle different types of clicks
            if (d.data.category) {
                // Category node click (Parents, Children, etc.)
                toggleCategoryExpansion(d.data.personId, d.data.categoryType);
            } else if (d.data.id) {
                // Person node click
                if (d.data.id == currentPersonId) {
                    // If clicking on the current center person, toggle expansion
                    togglePersonExpansion(d.data.id);
                } else {
                    // If clicking on another person, make them the center
                    loadPersonNetwork(d.data.id);
                }
            }
        })
        .on('mouseover', function (event, d) {
            // Show tooltip with additional information
            if (d.data.data) {
                const person = d.data.data;
                const tooltip = d3.select("#tooltip");

                let tooltipContent = `<strong>${person.personname || 'Unknown'}</strong>`;

                if (person.gender) tooltipContent += `<br>Gender: ${person.gender}`;
                if (person.birthdate) tooltipContent += `<br>Birth: ${person.birthdate}`;
                if (person.date_birth) tooltipContent += `<br>Birth date: ${person.date_birth}`;
                if (person.yr_birth) tooltipContent += `<br>Birth year: ${person.yr_birth}`;
                if (person.placebirth) tooltipContent += `<br>Birthplace: ${person.placebirth}`;
                if (person.currentlocation) tooltipContent += `<br>Location: ${person.currentlocation}`;
                if (person.worksat) tooltipContent += `<br>Works at: ${person.worksat}`;
                if (person.nativeplace) tooltipContent += `<br>Native place: ${person.nativeplace}`;

                tooltip.html(tooltipContent)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px')
                    .style('opacity', 1);
            }
        })
        .on('mouseout', function () {
            // Hide tooltip
            d3.select("#tooltip").style('opacity', 0);
        });

    // Add rectangles for nodes
    node.append('rect')
        .attr('width', d => {
            // Calculate width based on name length
            return Math.max(100, d.data.name.length * 8 + 20);
        })
        .attr('height', 40)
        .attr('x', d => {
            // Center the rectangle horizontally
            return -(Math.max(100, d.data.name.length * 8 + 20) / 2);
        })
        .attr('y', -20) // Center vertically
        .attr('rx', 5) // Rounded corners
        .attr('ry', 5)
        .style('fill', d => {
            // Color based on gender or relationship or category
            if (d.data.category) return '#f8f8f8'; // Category nodes are light gray
            if (d.data.gender === 'male') return '#AADDFF';
            if (d.data.gender === 'female') return '#FFAABB';
            if (d.data.relationship === 'spouse') return '#FFCC99';
            if (d.data.relationship === 'child') return '#AAFFAA';
            if (d.data.relationship === 'sibling') return '#DDDDFF';
            if (d.data.relationship === 'parent') return '#F0E68C';
            return '#FFFFFF'; // Default color
        })
        .style('stroke', d => {
            // Highlight current person
            return d.data.id == currentPersonId ? '#FF0000' : '#333333';
        })
        .style('stroke-width', d => {
            // Thicker border for current person
            return d.data.id == currentPersonId ? '3px' : '1.5px';
        });

    // Add name text
    node.append('text')
        .attr('dy', '0.35em') // Center text vertically
        .attr('text-anchor', 'middle')
        .text(d => d.data.name)
        .style('fill', '#333333')
        .style('font-weight', d => {
            // Bold for root and category nodes
            return (d.depth === 0 || d.data.category) ? 'bold' : 'normal';
        });

    // Add expansion indicator for expandable nodes
    node.filter(d => d.data.expandable || d.data.category)
        .append('text')
        .attr('class', 'expandable-indicator')
        .attr('dy', '0.35em')
        .attr('x', d => {
            const width = Math.max(100, d.data.name.length * 8 + 20);
            return width / 2 - 15; // Position near right edge
        })
        .text(d => {
            if (d.data.category) {
                // For category nodes, show +/- based on if the category is expanded
                const personId = d.data.personId;
                const category = d.data.categoryType;

                if (expandedNodes.has(personId)) {
                    const state = expandedNodes.get(personId);
                    return state[category] ? '−' : '+'; // Minus or plus sign
                }
                return '+';
            }

            // For person nodes, show if they have expanded children
            return expandedNodes.has(d.data.id) ? '−' : '+';
        });

    // Update the links
    const link = g.selectAll('path.link')
        .data(links, d => d.target.id)
        .join('path')
        .attr('class', 'link')
        .attr('d', d => {
            // Create a curved path from parent to child
            return `M${d.source.y},${d.source.x}
                    C${(d.source.y + d.target.y) / 2},${d.source.x}
                     ${(d.source.y + d.target.y) / 2},${d.target.x}
                     ${d.target.y},${d.target.x}`;
        })
        .style('stroke', d => {
            // Color links by relationship type
            if (d.target.data.relationship === 'spouse') return '#FF9966';
            if (d.target.data.relationship === 'child') return '#66CC66';
            if (d.target.data.relationship === 'sibling') return '#9999FF';
            if (d.target.data.relationship === 'parent') return '#CCCC00';
            return '#CCCCCC'; // Default color
        });
}

// Setup event listeners
function setupEventListeners() {
    // Search button
    document.getElementById('search-btn').addEventListener('click', () => {
        const searchText = document.getElementById('search-input').value.toLowerCase();
        if (!searchText) return;

        const found = allPeople.find(person =>
            (person.personname && person.personname.toLowerCase().includes(searchText)) ||
            (person.name_alias && person.name_alias.toLowerCase().includes(searchText))
        );

        if (found) {
            loadPersonNetwork(found.id);
        } else {
            alert('Person not found');
        }
    });

    // Person dropdown
    document.getElementById('center-person').addEventListener('change', (e) => {
        const personId = e.target.value;
        if (personId) {
            loadPersonNetwork(personId);
        }
    });

    // Reset button
    document.getElementById('reset-btn').addEventListener('click', () => {
        if (allPeople.length > 0) {
            // Clear all expansions
            expandedNodes.clear();

            // Reset to the first person
            loadPersonNetwork(allPeople[0].id);
        }
    });

    // Expand all button
    document.getElementById('expand-all-btn').addEventListener('click', async () => {
        // Expand the current person and all visible nodes
        if (!currentPersonId) return;

        // Start with the current person's network
        if (!networkCache.has(currentPersonId)) {
            await fetchAndCacheNetworkData(currentPersonId);
        }

        const network = networkCache.get(currentPersonId);

        // Expand the current person
        expandedNodes.set(currentPersonId, {
            parents: true,
            spouse: true,
            children: true,
            siblings: true
        });

        // Fetch and expand parents
        if (network.parents) {
            for (const parent of network.parents) {
                await expandPerson(parent.id);
            }
        }

        // Fetch and expand spouse
        if (network.spouse) {
            await expandPerson(network.spouse.id);
        }

        // Fetch and expand children
        if (network.children) {
            for (const child of network.children) {
                await expandPerson(child.id);
            }
        }

        // Fetch and expand siblings
        if (network.siblings) {
            for (const sibling of network.siblings) {
                await expandPerson(sibling.id);
            }
        }

        // Update visualization
        updateVisualization();
    });

    // Collapse all button
    document.getElementById('collapse-all-btn').addEventListener('click', () => {
        // Clear all expansions except for the current person
        expandedNodes.clear();

        // Keep only the current person expanded
        if (currentPersonId) {
            expandedNodes.set(currentPersonId, {
                parents: true,
                spouse: true,
                children: true,
                siblings: true
            });
        }

        // Update visualization
        updateVisualization();
    });

    // Search input - enter key
    document.getElementById('search-input').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('search-btn').click();
        }
    });
}

// Helper function to expand a person and fetch their data
async function expandPerson(personId) {
    if (!networkCache.has(personId)) {
        await fetchAndCacheNetworkData(personId);
    }

    expandedNodes.set(personId, {
        parents: true,
        spouse: true,
        children: true,
        siblings: true
    });
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', init);
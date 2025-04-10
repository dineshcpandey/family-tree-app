// API configuration
const API_BASE_URL = 'http://localhost:5050/api';

// Main application state
const state = {
    allPeople: [],             // All people from the database (only basic info)
    networkCache: new Map(),   // Cache for network data by person ID
    rootPerson: null,          // Current root person
    contextMenuTarget: null,   // Person node that triggered the context menu
    tree: null,                // D3 tree layout
    uniqueNodes: new Map()     // Track unique nodes by ID to prevent duplicates
};

// D3 visualization variables
let svg, g;
let i = 0; // Unique ID counter for D3 node tracking

// Initialize the application
async function init() {
    setupEventListeners();
    setupD3Tree();
}

// Set up event listeners
function setupEventListeners() {
    // Search button click
    document.getElementById('search-btn').addEventListener('click', searchPeople);

    // Search input - Enter key
    document.getElementById('search-input').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            searchPeople();
        }
    });

    // Context menu options
    document.getElementById('expand-parents').addEventListener('click', () => {
        if (state.contextMenuTarget) {
            expandRelationship(state.contextMenuTarget.id, 'parents');
        }
        hideContextMenu();
    });

    document.getElementById('expand-spouse').addEventListener('click', () => {
        if (state.contextMenuTarget) {
            expandRelationship(state.contextMenuTarget.id, 'spouse');
        }
        hideContextMenu();
    });

    document.getElementById('expand-children').addEventListener('click', () => {
        if (state.contextMenuTarget) {
            expandRelationship(state.contextMenuTarget.id, 'children');
        }
        hideContextMenu();
    });

    document.getElementById('expand-siblings').addEventListener('click', () => {
        if (state.contextMenuTarget) {
            expandRelationship(state.contextMenuTarget.id, 'siblings');
        }
        hideContextMenu();
    });

    document.getElementById('expand-all').addEventListener('click', () => {
        if (state.contextMenuTarget) {
            expandAllRelationships(state.contextMenuTarget.id);
        }
        hideContextMenu();
    });

    document.getElementById('collapse').addEventListener('click', () => {
        if (state.contextMenuTarget) {
            collapseNode(state.contextMenuTarget.id);
        }
        hideContextMenu();
    });

    document.getElementById('make-root').addEventListener('click', () => {
        if (state.contextMenuTarget) {
            makeRoot(state.contextMenuTarget.id);
        }
        hideContextMenu();
    });

    // Hide context menu on document click
    document.addEventListener('click', (e) => {
        // Only hide if click is outside the context menu
        if (!document.getElementById('context-menu').contains(e.target)) {
            hideContextMenu();
        }
    });
}

// Set up D3 tree visualization
function setupD3Tree() {
    const container = document.getElementById('family-tree');
    const containerWidth = container.clientWidth || 800;
    const containerHeight = container.clientHeight || 700;

    // Create SVG
    svg = d3.select('#family-tree')
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', [0, 0, containerWidth, containerHeight]);

    // Create a group for transformation
    g = svg.append('g')
        .attr('transform', `translate(${containerWidth / 2}, 50)`);

    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 3])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });

    svg.call(zoom);

    // Create the tree layout
    state.tree = d3.tree()
        .nodeSize([80, 200])
        .separation((a, b) => (a.parent === b.parent ? 1.2 : 2));
}

// Search for people by name
async function searchPeople() {
    const searchInput = document.getElementById('search-input');
    const searchText = searchInput.value.trim();

    if (!searchText) return;

    try {
        // First try to search via API
        const response = await fetch(`${API_BASE_URL}/search?name=${encodeURIComponent(searchText)}`);

        if (!response.ok) {
            throw new Error('Search API failed');
        }

        const results = await response.json();

        // If no results from search API, fetch all people as fallback
        if (results.length === 0 && state.allPeople.length === 0) {
            await fetchAllPeople();

            // Filter people by name
            const filteredResults = state.allPeople.filter(person =>
                (person.personname && person.personname.toLowerCase().includes(searchText.toLowerCase())) ||
                (person.name_alias && person.name_alias.toLowerCase().includes(searchText.toLowerCase()))
            );

            displaySearchResults(filteredResults);
        } else {
            displaySearchResults(results);
        }
    } catch (error) {
        console.error('Error searching for people:', error);

        // Fallback to local search if API fails
        if (state.allPeople.length === 0) {
            await fetchAllPeople();
        }

        // Filter people by name
        const filteredResults = state.allPeople.filter(person =>
            (person.personname && person.personname.toLowerCase().includes(searchText.toLowerCase())) ||
            (person.name_alias && person.name_alias.toLowerCase().includes(searchText.toLowerCase()))
        );

        displaySearchResults(filteredResults);
    }
}

// Fetch all people for search
async function fetchAllPeople() {
    try {
        const response = await fetch(`${API_BASE_URL}/people`);

        if (!response.ok) {
            throw new Error('Failed to fetch people');
        }

        state.allPeople = await response.json();
        console.log(`Loaded ${state.allPeople.length} people for search`);
    } catch (error) {
        console.error('Error fetching all people:', error);
        alert('Failed to load people data. Please try again later.');
    }
}

// Display search results
function displaySearchResults(results) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';

    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item">No results found</div>';
        resultsContainer.classList.add('active');
        return;
    }

    results.forEach(person => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';

        const nameEl = document.createElement('div');
        nameEl.className = 'name';
        nameEl.textContent = person.personname || 'Unknown';

        const infoEl = document.createElement('div');
        infoEl.className = 'info';

        let infoText = [];
        if (person.gender) infoText.push(`Gender: ${person.gender}`);
        if (person.birthdate || person.date_birth) infoText.push(`Birth: ${person.birthdate || person.date_birth}`);
        if (person.currentlocation) infoText.push(`Location: ${person.currentlocation}`);

        infoEl.textContent = infoText.join(' | ');

        resultItem.appendChild(nameEl);
        resultItem.appendChild(infoEl);

        // Add click handler to start tree with this person
        resultItem.addEventListener('click', () => {
            initializeTreeWithPerson(person);
            resultsContainer.classList.remove('active');
        });

        resultsContainer.appendChild(resultItem);
    });

    resultsContainer.classList.add('active');
}

// Initialize tree with a selected person
async function initializeTreeWithPerson(person) {
    // Clear any existing tree
    g.selectAll('*').remove();

    // Reset unique nodes tracking
    state.uniqueNodes = new Map();

    // Set as root person
    state.rootPerson = createPersonNode(person);

    // Create the initial tree with just the root
    updateVisualization();
}

// Helper function to create a person node with consistent structure
function createPersonNode(person, type = null) {
    return {
        id: person.id,
        name: person.personname || 'Unknown',
        data: person,
        type: type,
        gender: person.gender,
        expanded: {
            parents: false,
            spouse: false,
            children: false,
            siblings: false
        },
        children: [],
        // Track relationship references to ensure uniqueness
        relationships: {
            parents: new Set(),
            spouse: null,
            children: new Set(),
            siblings: new Set()
        }
    };
}

// Fetch and cache network data for a person
async function fetchNetworkData(personId) {
    if (state.networkCache.has(personId)) {
        return state.networkCache.get(personId);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/people/${personId}/network`);

        if (!response.ok) {
            throw new Error(`Failed to fetch network for person ${personId}`);
        }

        const networkData = await response.json();
        state.networkCache.set(personId, networkData);
        return networkData;
    } catch (error) {
        console.error('Error fetching network data:', error);
        return null;
    }
}

// Add a relationship to a node, ensuring no duplicates
function addRelationship(parentNode, person, relationType) {
    // Don't add the same person twice in the same relationship category
    if (relationType === 'spouse') {
        if (parentNode.relationships.spouse === person.id) {
            return null; // Already added
        }
        parentNode.relationships.spouse = person.id;
    } else {
        const relationSet = parentNode.relationships[relationType];
        if (relationSet.has(person.id)) {
            return null; // Already added
        }
        relationSet.add(person.id);
    }

    // Create or get the person node
    let personNode;
    if (state.uniqueNodes.has(person.id)) {
        // If this person is already in the tree, just get a reference
        personNode = findNodeById(state.rootPerson, person.id);
    } else {
        // Create a new node
        personNode = createPersonNode(person, relationType);
        state.uniqueNodes.set(person.id, true);
    }

    // Add to parent's children if it's a new node
    if (personNode) {
        parentNode.children.push(personNode);
        return personNode;
    }

    return null;
}

// Expand a specific relationship for a person
async function expandRelationship(personId, relationshipType) {
    // Find the person node in the tree
    const personNode = findNodeById(state.rootPerson, personId);

    if (!personNode) {
        console.error(`Person with ID ${personId} not found in the tree`);
        return;
    }

    // Fetch network data if not already cached
    if (!state.networkCache.has(personId)) {
        await fetchNetworkData(personId);
    }

    const networkData = state.networkCache.get(personId);

    if (!networkData) {
        console.error(`No network data available for person ${personId}`);
        return;
    }

    // Mark relationship as expanded
    personNode.expanded[relationshipType] = true;

    // Add relationship nodes
    switch (relationshipType) {
        case 'parents':
            if (networkData.parents && networkData.parents.length > 0) {
                // Filter existing children to keep only non-parent relationships
                personNode.children = personNode.children.filter(child => child.type !== 'parent');
                personNode.relationships.parents = new Set(); // Reset parent tracking

                networkData.parents.forEach(parent => {
                    addRelationship(personNode, parent, 'parents');
                });
            }
            break;

        case 'spouse':
            if (networkData.spouse) {
                // Filter existing children to keep only non-spouse relationships
                personNode.children = personNode.children.filter(child => child.type !== 'spouse');
                personNode.relationships.spouse = null; // Reset spouse tracking

                addRelationship(personNode, networkData.spouse, 'spouse');
            }
            break;

        case 'children':
            if (networkData.children && networkData.children.length > 0) {
                // Filter existing children to keep only non-child relationships
                personNode.children = personNode.children.filter(child => child.type !== 'child');
                personNode.relationships.children = new Set(); // Reset children tracking

                networkData.children.forEach(child => {
                    addRelationship(personNode, child, 'children');
                });
            }
            break;

        case 'siblings':
            if (networkData.siblings && networkData.siblings.length > 0) {
                // Filter existing children to keep only non-sibling relationships
                personNode.children = personNode.children.filter(child => child.type !== 'sibling');
                personNode.relationships.siblings = new Set(); // Reset siblings tracking

                networkData.siblings.forEach(sibling => {
                    addRelationship(personNode, sibling, 'siblings');
                });
            }
            break;
    }

    // Update the visualization
    updateVisualization();
}

// Expand all relationships for a person
async function expandAllRelationships(personId) {
    // Find the person node in the tree
    const personNode = findNodeById(state.rootPerson, personId);

    if (!personNode) {
        console.error(`Person with ID ${personId} not found in the tree`);
        return;
    }

    // Fetch network data if not already cached
    if (!state.networkCache.has(personId)) {
        await fetchNetworkData(personId);
    }

    // Expand all relationship types
    await expandRelationship(personId, 'parents');
    await expandRelationship(personId, 'spouse');
    await expandRelationship(personId, 'children');
    await expandRelationship(personId, 'siblings');
}

// Collapse a node (remove all its children)
function collapseNode(personId) {
    // Find the person node in the tree
    const personNode = findNodeById(state.rootPerson, personId);

    if (!personNode) {
        console.error(`Person with ID ${personId} not found in the tree`);
        return;
    }

    // Clear children and reset expanded flags
    personNode.children = [];
    personNode.expanded = {
        parents: false,
        spouse: false,
        children: false,
        siblings: false
    };

    // Reset relationship tracking
    personNode.relationships = {
        parents: new Set(),
        spouse: null,
        children: new Set(),
        siblings: new Set()
    };

    // Update the visualization
    updateVisualization();
}

// Make a person the new root of the tree
async function makeRoot(personId) {
    // Fetch network data if needed
    if (!state.networkCache.has(personId)) {
        await fetchNetworkData(personId);
    }

    // Find the person node in the tree
    const personNode = findNodeById(state.rootPerson, personId);

    if (!personNode) {
        console.error(`Person with ID ${personId} not found in the tree`);
        return;
    }

    // Get person data
    const person = personNode.data;

    // Reset the tree with this person as root
    state.uniqueNodes = new Map();
    state.rootPerson = createPersonNode(person);
    state.uniqueNodes.set(person.id, true);

    // Update visualization
    updateVisualization();
}

// Find a node by ID in the tree
function findNodeById(node, id) {
    if (node.id === id) {
        return node;
    }

    if (node.children) {
        for (const child of node.children) {
            const found = findNodeById(child, id);
            if (found) return found;
        }
    }

    return null;
}

// Show context menu for a node
function showContextMenu(node, event) {
    const menu = document.getElementById('context-menu');
    state.contextMenuTarget = node;

    // Position menu at click location
    menu.style.left = `${event.pageX}px`;
    menu.style.top = `${event.pageY}px`;
    menu.style.display = 'block';

    // Update menu options based on node expansion state
    document.getElementById('expand-parents').style.display = node.expanded.parents ? 'none' : 'block';
    document.getElementById('expand-spouse').style.display = node.expanded.spouse ? 'none' : 'block';
    document.getElementById('expand-children').style.display = node.expanded.children ? 'none' : 'block';
    document.getElementById('expand-siblings').style.display = node.expanded.siblings ? 'none' : 'block';
    document.getElementById('collapse').style.display =
        (node.expanded.parents || node.expanded.spouse ||
            node.expanded.children || node.expanded.siblings) ? 'block' : 'none';

    // Prevent default right-click menu
    event.preventDefault();
}

// Hide context menu
function hideContextMenu() {
    document.getElementById('context-menu').style.display = 'none';
    state.contextMenuTarget = null;
}

// Update the visualization
function updateVisualization() {
    if (!state.rootPerson) return;

    // Clear the visualization
    g.selectAll('*').remove();

    // Get container dimensions for centering
    const containerWidth = document.getElementById('family-tree').clientWidth || 800;
    const containerHeight = document.getElementById('family-tree').clientHeight || 700;

    // Rebuild unique nodes map to ensure all current nodes are tracked
    state.uniqueNodes = new Map();
    function trackUniqueNodes(node) {
        state.uniqueNodes.set(node.id, true);
        if (node.children) {
            node.children.forEach(trackUniqueNodes);
        }
    }
    trackUniqueNodes(state.rootPerson);

    // Create hierarchy
    const root = d3.hierarchy(state.rootPerson);

    // Compute the tree layout
    state.tree(root);

    // Create links
    const links = g.selectAll('.link')
        .data(root.links())
        .join('path')
        .attr('class', 'link')
        .attr('d', d => {
            return `M${d.source.y},${d.source.x}
                    C${(d.source.y + d.target.y) / 2},${d.source.x}
                    ${(d.source.y + d.target.y) / 2},${d.target.x}
                    ${d.target.y},${d.target.x}`;
        })
        .style('stroke', d => {
            // Color links by relationship type
            if (d.target.data.type === 'parent') return '#F0E68C';
            if (d.target.data.type === 'spouse') return '#FFCC99';
            if (d.target.data.type === 'child') return '#AAFFAA';
            if (d.target.data.type === 'sibling') return '#DDDDFF';
            return '#ccc';
        });

    // Create nodes
    const nodes = g.selectAll('.node')
        .data(root.descendants(), d => d.data.id || (d.data.id = ++i))
        .join('g')
        .attr('class', d => `node ${d.data.id === state.rootPerson.id ? 'highlighted' : ''}`)
        .attr('transform', d => `translate(${d.y},${d.x})`)
        .on('contextmenu', function (event, d) {
            showContextMenu(d.data, event);
        })
        .on('mouseover', function (event, d) {
            showTooltip(d.data, event);
        })
        .on('mouseout', function () {
            hideTooltip();
        });

    // Add rectangles to nodes
    nodes.append('rect')
        .attr('width', d => Math.max(d.data.name.length * 7 + 20, 100))
        .attr('height', 40)
        .attr('x', d => -Math.max(d.data.name.length * 7 + 20, 100) / 2)
        .attr('y', -20)
        .attr('rx', 5)
        .attr('ry', 5)
        .style('fill', d => {
            // Color based on gender and relationship
            if (d.data.gender === 'male') return '#AADDFF';
            if (d.data.gender === 'female') return '#FFAABB';
            return 'white';
        })
        .style('stroke', '#333')
        .style('stroke-width', d => d.data.id === state.rootPerson.id ? 3 : 1.5);

    // Add text to nodes
    nodes.append('text')
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .text(d => d.data.name);

    // Add expand indicator if person has unexpanded relationships
    nodes.filter(d => {
        return state.networkCache.has(d.data.id) &&
            !(d.data.expanded.parents &&
                d.data.expanded.spouse &&
                d.data.expanded.children &&
                d.data.expanded.siblings);
    })
        .append('text')
        .attr('class', 'expand-indicator')
        .attr('dy', '0.35em')
        .attr('x', d => Math.max(d.data.name.length * 7 + 20, 100) / 2 - 15)
        .text('+');

    // Center the tree on the root node if it exists
    if (root.descendants().length > 0) {
        const rootNode = root.descendants()[0];

        // Center the view on the root node
        const centerX = containerWidth / 2 - rootNode.y;
        const centerY = 50 - rootNode.x;

        g.attr('transform', `translate(${centerX}, ${centerY})`);
    }
}

// Show tooltip with person details
function showTooltip(person, event) {
    // Create tooltip if it doesn't exist
    let tooltip = d3.select('body').select('.tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip');
    }

    // Get person data
    const data = person.data;

    // Build tooltip content
    let content = `<div class="title">${data.personname || 'Unknown'}</div>`;

    if (data.gender) {
        content += `<div class="info-row">
            <span class="label">Gender:</span>
            <span class="value">${data.gender}</span>
        </div>`;
    }

    if (data.birthdate || data.date_birth) {
        content += `<div class="info-row">
            <span class="label">Birth:</span>
            <span class="value">${data.birthdate || data.date_birth}</span>
        </div>`;
    }

    if (data.placebirth) {
        content += `<div class="info-row">
            <span class="label">Birthplace:</span>
            <span class="value">${data.placebirth}</span>
        </div>`;
    }

    if (data.currentlocation) {
        content += `<div class="info-row">
            <span class="label">Location:</span>
            <span class="value">${data.currentlocation}</span>
        </div>`;
    }

    if (data.worksat) {
        content += `<div class="info-row">
            <span class="label">Works at:</span>
            <span class="value">${data.worksat}</span>
        </div>`;
    }

    // Set content and position
    tooltip.html(content)
        .style('left', `${event.pageX + 15}px`)
        .style('top', `${event.pageY - 15}px`)
        .style('opacity', 1);
}

// Hide the tooltip
function hideTooltip() {
    d3.select('.tooltip').style('opacity', 0);
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', init);
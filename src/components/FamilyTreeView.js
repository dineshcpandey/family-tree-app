// src/components/FamilyTreeView.js
import React, { useState, useEffect, useRef } from 'react';
import './FamilyTreeView.css';
import { getFamilyNetwork } from '../api/familyTreeApi';

const FamilyTreeView = ({ person, people }) => {
    const canvasRef = useRef(null);
    const [expandedPersons, setExpandedPersons] = useState([]);
    const [hoveredPerson, setHoveredPerson] = useState(null);
    const [personPositions, setPersonPositions] = useState({});
    const [networkData, setNetworkData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch extended family network data from API
    useEffect(() => {
        if (!person) return;

        const fetchNetworkData = async () => {
            try {
                setLoading(true);
                const data = await getFamilyNetwork(person.id);
                setNetworkData(data);
                setError(null);
            } catch (err) {
                console.error('Error fetching family network data:', err);
                setError('Failed to load family network data. Using basic view instead.');
                // Fallback to basic view with available data
            } finally {
                setLoading(false);
            }
        };

        fetchNetworkData();
    }, [person]);

    useEffect(() => {
        if (!person || !canvasRef.current) return;

        // Reset expanded persons when central person changes
        setExpandedPersons([]);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Set canvas size
        canvas.width = 800;
        canvas.height = 600;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw family network
        if (networkData) {
            // Use enriched network data if available
            drawFamilyNetworkWithAPIData(ctx, networkData, expandedPersons);
        } else {
            // Fallback to basic view
            drawFamilyNetwork(ctx, person, people, expandedPersons);
        }

    }, [person, people, networkData]);

    useEffect(() => {
        if (!person || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw family network with expanded persons
        if (networkData) {
            drawFamilyNetworkWithAPIData(ctx, networkData, expandedPersons);
        } else {
            drawFamilyNetwork(ctx, person, people, expandedPersons);
        }

    }, [expandedPersons]);

    const drawFamilyNetworkWithAPIData = (ctx, data, expandedPersons = []) => {
        // Store positions of all drawn persons to use for interactivity
        const positions = {};

        // Calculate positions
        const centerX = 400;
        const centerY = 300;

        // Draw central person
        drawPerson(ctx, centerX, centerY, data.person, 'main');
        positions[data.person.id] = { x: centerX, y: centerY, person: data.person };

        // Draw parents
        if (data.parents.length > 0) {
            const father = data.parents.find(p => p.gender === 'Male');
            const mother = data.parents.find(p => p.gender === 'Female');

            if (father) {
                const fatherX = centerX - 200;
                const fatherY = centerY - 120;

                drawPerson(ctx, fatherX, fatherY, father, 'father', expandedPersons.includes(father.id));
                drawLine(ctx, centerX, centerY, fatherX, fatherY, 'father');

                positions[father.id] = { x: fatherX, y: fatherY, person: father };
            }

            if (mother) {
                const motherX = centerX + 200;
                const motherY = centerY - 120;

                drawPerson(ctx, motherX, motherY, mother, 'mother', expandedPersons.includes(mother.id));
                drawLine(ctx, centerX, centerY, motherX, motherY, 'mother');

                positions[mother.id] = { x: motherX, y: motherY, person: mother };
            }
        }

        // Draw spouse
        if (data.spouse) {
            const spouseX = centerX + 200;
            const spouseY = centerY;

            drawPerson(ctx, spouseX, spouseY, data.spouse, 'spouse', expandedPersons.includes(data.spouse.id));
            drawLine(ctx, centerX, centerY, spouseX, spouseY, 'spouse');

            positions[data.spouse.id] = { x: spouseX, y: spouseY, person: data.spouse };
        }

        // Draw siblings
        if (data.siblings && data.siblings.length > 0) {
            const siblingSpacing = 180 / (data.siblings.length + 1);
            data.siblings.forEach((sibling, index) => {
                const siblingX = centerX - 250;
                const siblingY = centerY - 60 + siblingSpacing * (index + 1);

                drawPerson(ctx, siblingX, siblingY, sibling, 'sibling', expandedPersons.includes(sibling.id));
                drawLine(ctx, centerX, centerY, siblingX, siblingY, 'sibling');

                positions[sibling.id] = { x: siblingX, y: siblingY, person: sibling };
            });
        }

        // Draw children
        if (data.children.length > 0) {
            const childSpacing = 400 / (data.children.length + 1);

            data.children.forEach((child, index) => {
                const childX = centerX - 200 + childSpacing * (index + 1);
                const childY = centerY + 120;

                drawPerson(ctx, childX, childY, child, 'child', expandedPersons.includes(child.id));
                drawLine(ctx, centerX, centerY, childX, childY, 'child');

                positions[child.id] = { x: childX, y: childY, person: child };
            });
        }

        // Draw grandparents if parents are expanded
        if (data.grandparents && data.grandparents.length > 0) {
            const fatherParents = data.grandparents.filter(gp => {
                const father = data.parents.find(p => p.gender === 'Male');
                return father && (gp.id === father.fatherid || gp.id === father.motherid);
            });

            const motherParents = data.grandparents.filter(gp => {
                const mother = data.parents.find(p => p.gender === 'Female');
                return mother && (gp.id === mother.fatherid || gp.id === mother.motherid);
            });

            const father = data.parents.find(p => p.gender === 'Male');
            if (father && expandedPersons.includes(father.id)) {
                fatherParents.forEach((gp, index) => {
                    const gpX = centerX - 200 - 100 + (index * 200); // Position to left side
                    const gpY = centerY - 200;

                    drawPerson(ctx, gpX, gpY, gp, 'grandparent');
                    drawLine(ctx, centerX - 200, centerY - 120, gpX, gpY, 'grandparent');

                    positions[gp.id] = { x: gpX, y: gpY, person: gp };
                });
            }

            const mother = data.parents.find(p => p.gender === 'Female');
            if (mother && expandedPersons.includes(mother.id)) {
                motherParents.forEach((gp, index) => {
                    const gpX = centerX + 200 - 100 + (index * 200); // Position to right side
                    const gpY = centerY - 200;

                    drawPerson(ctx, gpX, gpY, gp, 'grandparent');
                    drawLine(ctx, centerX + 200, centerY - 120, gpX, gpY, 'grandparent');

                    positions[gp.id] = { x: gpX, y: gpY, person: gp };
                });
            }
        }

        // Draw grandchildren if children are expanded
        if (data.grandchildren && data.grandchildren.length > 0) {
            data.children.forEach((child, childIndex) => {
                if (expandedPersons.includes(child.id)) {
                    const childX = centerX - 200 + (400 / (data.children.length + 1)) * (childIndex + 1);
                    const childY = centerY + 120;

                    const childGrandchildren = data.grandchildren.filter(
                        gc => gc.fatherid === child.id || gc.motherid === child.id
                    );

                    if (childGrandchildren.length > 0) {
                        const gcSpacing = 120 / (childGrandchildren.length + 1);

                        childGrandchildren.forEach((gc, gcIndex) => {
                            const gcX = childX - 60 + gcSpacing * (gcIndex + 1);
                            const gcY = childY + 80;

                            drawPerson(ctx, gcX, gcY, gc, 'grandchild');
                            drawLine(ctx, childX, childY, gcX, gcY, 'grandchild');

                            positions[gc.id] = { x: gcX, y: gcY, person: gc };
                        });
                    }
                }
            });
        }

        // Update positions state for interactive use
        setPersonPositions(positions);
    };

    const drawFamilyNetwork = (ctx, centralPerson, allPeople, expandedPersons = []) => {
        // This is the fallback method when API data isn't available
        // Implementation for fallback drawing (same as before)
        // Store positions of all drawn persons to use for interactivity
        const positions = {};

        // Calculate positions
        const centerX = 400;
        const centerY = 300;

        // Draw central person
        drawPerson(ctx, centerX, centerY, centralPerson, 'main');
        positions[centralPerson.id] = { x: centerX, y: centerY, person: centralPerson };

        // Find direct relationships
        const father = allPeople.find(p => p.id === centralPerson.fatherid);
        const mother = allPeople.find(p => p.id === centralPerson.motherid);
        const spouse = allPeople.find(p => p.id === centralPerson.spouseid);
        const children = allPeople.filter(p =>
            p.fatherid === centralPerson.id || p.motherid === centralPerson.id
        );

        // Draw father & his expanded network if applicable
        if (father) {
            const fatherX = centerX - 200;
            const fatherY = centerY - 120;

            drawPerson(ctx, fatherX, fatherY, father, 'father', expandedPersons.includes(father.id));
            drawLine(ctx, centerX, centerY, fatherX, fatherY, 'father');

            positions[father.id] = { x: fatherX, y: fatherY, person: father };

            // If father is expanded, draw his parents
            if (expandedPersons.includes(father.id)) {
                const grandfather = allPeople.find(p => p.id === father.fatherid);
                const grandmother = allPeople.find(p => p.id === father.motherid);

                if (grandfather) {
                    const grandfatherX = fatherX - 100;
                    const grandfatherY = fatherY - 80;

                    drawPerson(ctx, grandfatherX, grandfatherY, grandfather, 'grandparent');
                    drawLine(ctx, fatherX, fatherY, grandfatherX, grandfatherY, 'grandparent');

                    positions[grandfather.id] = { x: grandfatherX, y: grandfatherY, person: grandfather };
                }

                if (grandmother) {
                    const grandmotherX = fatherX + 100;
                    const grandmotherY = fatherY - 80;

                    drawPerson(ctx, grandmotherX, grandmotherY, grandmother, 'grandparent');
                    drawLine(ctx, fatherX, fatherY, grandmotherX, grandmotherY, 'grandparent');

                    positions[grandmother.id] = { x: grandmotherX, y: grandmotherY, person: grandmother };
                }
            }
        }

        // Draw mother & her expanded network if applicable
        if (mother) {
            const motherX = centerX + 200;
            const motherY = centerY - 120;

            drawPerson(ctx, motherX, motherY, mother, 'mother', expandedPersons.includes(mother.id));
            drawLine(ctx, centerX, centerY, motherX, motherY, 'mother');

            positions[mother.id] = { x: motherX, y: motherY, person: mother };

            // If mother is expanded, draw her parents
            if (expandedPersons.includes(mother.id)) {
                const grandfather = allPeople.find(p => p.id === mother.fatherid);
                const grandmother = allPeople.find(p => p.id === mother.motherid);

                if (grandfather) {
                    const grandfatherX = motherX - 100;
                    const grandfatherY = motherY - 80;

                    drawPerson(ctx, grandfatherX, grandfatherY, grandfather, 'grandparent');
                    drawLine(ctx, motherX, motherY, grandfatherX, grandfatherY, 'grandparent');

                    positions[grandfather.id] = { x: grandfatherX, y: grandfatherY, person: grandfather };
                }

                if (grandmother) {
                    const grandmotherX = motherX + 100;
                    const grandmotherY = motherY - 80;

                    drawPerson(ctx, grandmotherX, grandmotherY, grandmother, 'grandparent');
                    drawLine(ctx, motherX, motherY, grandmotherX, grandmotherY, 'grandparent');

                    positions[grandmother.id] = { x: grandmotherX, y: grandmotherY, person: grandmother };
                }
            }
        }

        // Draw spouse
        if (spouse) {
            const spouseX = centerX + 200;
            const spouseY = centerY;

            drawPerson(ctx, spouseX, spouseY, spouse, 'spouse', expandedPersons.includes(spouse.id));
            drawLine(ctx, centerX, centerY, spouseX, spouseY, 'spouse');

            positions[spouse.id] = { x: spouseX, y: spouseY, person: spouse };

            // If spouse is expanded, draw their parents
            if (expandedPersons.includes(spouse.id)) {
                const fatherInLaw = allPeople.find(p => p.id === spouse.fatherid);
                const motherInLaw = allPeople.find(p => p.id === spouse.motherid);

                if (fatherInLaw) {
                    const fatherInLawX = spouseX + 100;
                    const fatherInLawY = spouseY - 80;

                    drawPerson(ctx, fatherInLawX, fatherInLawY, fatherInLaw, 'inlaw');
                    drawLine(ctx, spouseX, spouseY, fatherInLawX, fatherInLawY, 'inlaw');

                    positions[fatherInLaw.id] = { x: fatherInLawX, y: fatherInLawY, person: fatherInLaw };
                }

                if (motherInLaw) {
                    const motherInLawX = spouseX + 180;
                    const motherInLawY = spouseY - 80;

                    drawPerson(ctx, motherInLawX, motherInLawY, motherInLaw, 'inlaw');
                    drawLine(ctx, spouseX, spouseY, motherInLawX, motherInLawY, 'inlaw');

                    positions[motherInLaw.id] = { x: motherInLawX, y: motherInLawY, person: motherInLaw };
                }
            }
        }

        // Draw children (1 level down)
        if (children.length > 0) {
            const childSpacing = 400 / (children.length + 1);

            children.forEach((child, index) => {
                const childX = centerX - 200 + childSpacing * (index + 1);
                const childY = centerY + 120;

                drawPerson(ctx, childX, childY, child, 'child', expandedPersons.includes(child.id));
                drawLine(ctx, centerX, centerY, childX, childY, 'child');

                positions[child.id] = { x: childX, y: childY, person: child };

                // If child is expanded, draw their children/spouse
                if (expandedPersons.includes(child.id)) {
                    const childSpouse = allPeople.find(p => p.id === child.spouseid);
                    const grandchildren = allPeople.filter(p =>
                        p.fatherid === child.id || p.motherid === child.id
                    );

                    if (childSpouse) {
                        const childSpouseX = childX + 80;
                        const childSpouseY = childY;

                        drawPerson(ctx, childSpouseX, childSpouseY, childSpouse, 'spouse');
                        drawLine(ctx, childX, childY, childSpouseX, childSpouseY, 'spouse');

                        positions[childSpouse.id] = { x: childSpouseX, y: childSpouseY, person: childSpouse };
                    }

                    if (grandchildren.length > 0) {
                        const gcSpacing = 120 / (grandchildren.length + 1);

                        grandchildren.forEach((gc, gcIndex) => {
                            const gcX = childX - 60 + gcSpacing * (gcIndex + 1);
                            const gcY = childY + 80;

                            drawPerson(ctx, gcX, gcY, gc, 'grandchild');
                            drawLine(ctx, childX, childY, gcX, gcY, 'grandchild');

                            positions[gc.id] = { x: gcX, y: gcY, person: gc };
                        });
                    }
                }
            });
        }

        // Update positions state for interactive use
        setPersonPositions(positions);
    };

    const drawPerson = (ctx, x, y, person, relation, isExpanded = false) => {
        // Set colors based on relationship
        let boxColor;
        switch (relation) {
            case 'main':
                boxColor = '#4a90e2';
                break;
            case 'father':
            case 'mother':
                boxColor = '#8bc34a';
                break;
            case 'spouse':
                boxColor = '#9c27b0';
                break;
            case 'child':
                boxColor = '#ff9800';
                break;
            case 'grandparent':
                boxColor = '#4caf50';
                break;
            case 'grandchild':
                boxColor = '#ff5722';
                break;
            case 'inlaw':
                boxColor = '#e91e63';
                break;
            case 'sibling':
                boxColor = '#00bcd4';
                break;
            default:
                boxColor = '#90a4ae';
        }

        // Set gender-based icon
        let genderMarker = '👤'; // default
        if (person.gender) {
            if (person.gender.toLowerCase() === 'male') {
                genderMarker = '♂️';
            } else if (person.gender.toLowerCase() === 'female') {
                genderMarker = '♀️';
            }
        }

        // Draw person box
        ctx.fillStyle = boxColor;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;

        // Box with rounded corners
        const boxWidth = 160;
        const boxHeight = 80;
        const radius = 10;

        ctx.beginPath();
        ctx.moveTo(x - boxWidth / 2 + radius, y - boxHeight / 2);
        ctx.lineTo(x + boxWidth / 2 - radius, y - boxHeight / 2);
        ctx.arcTo(x + boxWidth / 2, y - boxHeight / 2, x + boxWidth / 2, y - boxHeight / 2 + radius, radius);
        ctx.lineTo(x + boxWidth / 2, y + boxHeight / 2 - radius);
        ctx.arcTo(x + boxWidth / 2, y + boxHeight / 2, x + boxWidth / 2 - radius, y + boxHeight / 2, radius);
        ctx.lineTo(x - boxWidth / 2 + radius, y + boxHeight / 2);
        ctx.arcTo(x - boxWidth / 2, y + boxHeight / 2, x - boxWidth / 2, y + boxHeight / 2 - radius, radius);
        ctx.lineTo(x - boxWidth / 2, y - boxHeight / 2 + radius);
        ctx.arcTo(x - boxWidth / 2, y - boxHeight / 2, x - boxWidth / 2 + radius, y - boxHeight / 2, radius);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        // If expanded, draw a highlight border
        if (isExpanded) {
            ctx.strokeStyle = '#ffc107'; // Amber highlight for expanded nodes
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        // Check if this is the hovered person and add highlight if it is
        if (hoveredPerson === person.id) {
            ctx.strokeStyle = '#03a9f4'; // Light blue highlight for hover
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Draw person name
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${person.personname} ${genderMarker}`, x, y - 10);

        // Draw birth year if available
        if (person.birthdate) {
            const birthYear = new Date(person.birthdate).getFullYear();
            ctx.font = '12px Arial';
            ctx.fillText(`Born: ${birthYear}`, x, y + 10);
        }

        // Draw location if available
        if (person.currentlocation) {
            ctx.font = '12px Arial';
            ctx.fillText(`📍 ${person.currentlocation}`, x, y + 30);
        }
    };

    const drawLine = (ctx, x1, y1, x2, y2, relation) => {
        // Set line style based on relationship
        ctx.beginPath();

        switch (relation) {
            case 'father':
            case 'mother':
                ctx.strokeStyle = '#8bc34a';
                ctx.setLineDash([5, 5]);
                break;
            case 'spouse':
                ctx.strokeStyle = '#9c27b0';
                ctx.setLineDash([]);
                break;
            case 'child':
                ctx.strokeStyle = '#ff9800';
                ctx.setLineDash([]);
                break;
            case 'grandparent':
                ctx.strokeStyle = '#4caf50';
                ctx.setLineDash([3, 3]);
                break;
            case 'grandchild':
                ctx.strokeStyle = '#ff5722';
                ctx.setLineDash([3, 3]);
                break;
            case 'inlaw':
                ctx.strokeStyle = '#e91e63';
                ctx.setLineDash([5, 5]);
                break;
            case 'sibling':
                ctx.strokeStyle = '#00bcd4';
                ctx.setLineDash([8, 4]);
                break;
            default:
                ctx.strokeStyle = '#90a4ae';
                ctx.setLineDash([]);
        }

        ctx.lineWidth = 2;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
    };

    // Handle canvas click to expand/collapse a person
    const handleCanvasClick = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Get click coordinates relative to canvas
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Check if click is on a person
        for (const personId in personPositions) {
            const pos = personPositions[personId];
            const boxWidth = 160;
            const boxHeight = 80;

            // Check if click is within person box
            if (
                clickX >= pos.x - boxWidth / 2 &&
                clickX <= pos.x + boxWidth / 2 &&
                clickY >= pos.y - boxHeight / 2 &&
                clickY <= pos.y + boxHeight / 2
            ) {
                // Toggle expand/collapse
                const personIdNum = parseInt(personId);
                if (expandedPersons.includes(personIdNum)) {
                    setExpandedPersons(expandedPersons.filter(id => id !== personIdNum));
                } else {
                    setExpandedPersons([...expandedPersons, personIdNum]);
                }
                return;
            }
        }
    };

    // Handle mouse move for hover effects
    const handleMouseMove = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Get mouse coordinates relative to canvas
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Check if mouse is over a person
        let hovering = null;
        for (const personId in personPositions) {
            const pos = personPositions[personId];
            const boxWidth = 160;
            const boxHeight = 80;

            // Check if mouse is within person box
            if (
                mouseX >= pos.x - boxWidth / 2 &&
                mouseX <= pos.x + boxWidth / 2 &&
                mouseY >= pos.y - boxHeight / 2 &&
                mouseY <= pos.y + boxHeight / 2
            ) {
                hovering = parseInt(personId);
                break;
            }
        }

        // Update hover state if changed
        if (hovering !== hoveredPerson) {
            setHoveredPerson(hovering);

            // Change cursor to pointer when hovering over a person
            canvas.style.cursor = hovering ? 'pointer' : 'default';
        }
    };

    return (
        <div className="family-tree-view">
            <h3>Family Network</h3>

            {loading ? (
                <div className="loading-network">
                    <p>Loading family network data...</p>
                </div>
            ) : error ? (
                <div className="network-error">
                    <p>{error}</p>
                </div>
            ) : (
                <>
                    <div className="canvas-container">
                        <canvas
                            ref={canvasRef}
                            className="family-canvas"
                            onClick={handleCanvasClick}
                            onMouseMove={handleMouseMove}
                        ></canvas>
                    </div>
                    <div className="instructions">
                        <p>Click on any person to expand/collapse their family connections.</p>
                        <p>Highlighted boxes indicate expanded persons.</p>
                    </div>
                </>
            )}

            <div className="legend">
                <div className="legend-item">
                    <div className="color-box main"></div>
                    <span>Selected Person</span>
                </div>
                <div className="legend-item">
                    <div className="color-box parent"></div>
                    <span>Parents</span>
                </div>
                <div className="legend-item">
                    <div className="color-box spouse"></div>
                    <span>Spouse</span>
                </div>
                <div className="legend-item">
                    <div className="color-box child"></div>
                    <span>Children</span>
                </div>
                <div className="legend-item">
                    <div className="color-box grandparent"></div>
                    <span>Grandparents</span>
                </div>
                <div className="legend-item">
                    <div className="color-box grandchild"></div>
                    <span>Grandchildren</span>
                </div>
                <div className="legend-item">
                    <div className="color-box sibling"></div>
                    <span>Siblings</span>
                </div>
            </div>
        </div>
    );
};

export default FamilyTreeView;
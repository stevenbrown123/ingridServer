//Basic Setup
var camera, scene, renderer;
var container;
//Detection
var mouse = new THREE.Vector2(), INTERSECTED;
var vector = new THREE.Vector3();
var raycaster;
//Selection
var SELECTED1 = null;
var SELECTED2 = null;
var SELECTED = null;
var SELECTIONLIST = null;
var SELECTEDEDGE = null;

//Modes
var mode;
//Manipulation
var controls = null;
var offset = new THREE.Vector3();
var positions = null;
var newPositions = null;
//Edge Manipulation
var cubeSelected = false;
var cube1 = null;
var cube2 = null;
var dashedLine1 = null;
var dashedLine2 = null;
var dashedLine3 = null;
var cancelConfirmation = 0;
var cubesExist = false;
var plane = null;
//PDF
const CANVAS_WIDTH_PORTRAIT = 190;
const CANVAS_WIDTH_LANDSCAPE = 280;
//Coloring
const DEFAULT_COLOR = 0xf2f2f2;			
//Animation
const TIME_BT_FRAMES = 1000/60;
//Shape Locations and Sizes
const NODE_LAYER = -200;
const EDGE_LAYER = NODE_LAYER - 1;
const ANIMATION_LAYER = EDGE_LAYER - .1;
const PLANE_LAYER = EDGE_LAYER;
const CUBE_LAYER = NODE_LAYER + .1;
const PLANE_SIZE = 10000;
const NODE_RADIUS = 15;
const CUBE_WIDTH = 15;
const EDGE_WIDTH = 15;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////                This section deals with graph functions                        /////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                              Complement                               //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
/*	Complement

	Handles the Complement function and animations relating to it

	public methods:
		main - performs all the necessary animation and graph manipulation
		
	Todo:
	Allow the animation to be skipped
*/
var complement = function() {
	const ANIMATION_TIME = 1000;
	const ITERATIONS = ANIMATION_TIME/TIME_BT_FRAMES;
	
	var main = function() {
		var size = GRAPH.nodes.length;
		var matrix = setUpMatrix(size);
		
		//Adds the new edges to the old, all are needed for animation
		for(var i = 0; i < size; i++) {
			for(var j = 0; j < size; j++) {
				if(!matrix[GRAPH.nodes[i].getId()][GRAPH.nodes[j].getId()]) {
					GRAPHDRAWER.addEdge({selections: [scene.getObjectById(GRAPH.nodes[i].getId()),scene.getObjectById(GRAPH.nodes[j].getId())], complement: true});
				}
			}
		}
		
		animationSetUp(matrix, size);
	}
	//Adjancency matrix
	var setUpMatrix = function(size) {
		var matrix = [];
		
		for(var i = 0; i < size; i++) {
			matrix[GRAPH.nodes[i].getId()] = [];
			
			for(var j = 0; j < size; j++) {
				matrix[GRAPH.nodes[i].getId()][GRAPH.nodes[j].getId()] = (GRAPH.findEdge(GRAPH.nodes[i].getId(), GRAPH.nodes[j].getId()) != null);
			}
		}
		
		for(var i = 0; i < size; i++) {
			matrix[GRAPH.nodes[i].getId()][GRAPH.nodes[i].getId()] = null;
		}
		
		return matrix;
	}
	//Fade in and fade out animation
	var animationSetUp = function(matrix, size) {
		for(var i = 0; i < ITERATIONS; i++) {
			
			(function(i) {
				setTimeout( function() {
				
				animation( matrix , size, i );

				}, TIME_BT_FRAMES*(i + 1) );
			})(i);
		}
		
		setTimeout( function() {
				
			completeAnimation( matrix, size);

		}, ANIMATION_TIME );
	}
	//Fades in/out for new/old edges
	var animation = function(matrix, size, iteration) {
		var obj;
		
		for(var i = 0; i < size; i++) {
			for(var j = 0; j < size; j++) {
				//Self loops don't exist
				if(matrix[GRAPH.nodes[i].getId()][GRAPH.nodes[j].getId()] == null) {
					continue;
				}
				//Fade in the new edges
				else if(!matrix[GRAPH.nodes[i].getId()][GRAPH.nodes[j].getId()]) {
					obj = scene.getObjectById(GRAPH.findEdge(GRAPH.nodes[i].getId(), GRAPH.nodes[j].getId()));
					obj.material.opacity = (iteration + 1)/ITERATIONS;
				}
				//Fade out the old edges
				else {
					obj = scene.getObjectById(GRAPH.findEdge(GRAPH.nodes[i].getId(), GRAPH.nodes[j].getId()));
					obj.material.opacity = 1 - (iteration + 1)/ITERATIONS;
				}
			}
		}
	}

	//Removes all edges (needed for animation), and brings back the new edges
	var completeAnimation = function(matrix, size) {
		while(GRAPH.edges.length > 0) {
			GRAPHDRAWER.removeEdge(GRAPH.edges[0].getNode1(), GRAPH.edges[0].getNode2());
		}
		
		for(var i = 0; i < size; i++) {
			for(var j = 0; j < size; j++) {
				if(!matrix[GRAPH.nodes[i].getId()][GRAPH.nodes[j].getId()]) {
					GRAPHDRAWER.addEdge({selections: [scene.getObjectById(GRAPH.nodes[i].getId()),scene.getObjectById(GRAPH.nodes[j].getId())]});
				}
			}
		}
	}
	
	return {
		main: main
	};
}
////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                             End Complement                            //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                          Edge Contraction                             //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
/*	Edge Contraction

	Handles the Edge Contraction function and its animation
	
	public methods:
	main - performs all the necessary animation and graph manipulation
	
	Todo:
	Allow the animation to be skipped
*/
var edgeContraction = function() {
	const ANIMATION_TIME = 1500;
	const ITERATIONS = ANIMATION_TIME/TIME_BT_FRAMES;

	//Visually outputs teh result
	var main = function(n1, n2) {
		n1 = scene.getObjectById(n1);
		n2 = scene.getObjectById(n2);
		
		//Following determines the new location the new node,
		//how fast the nodes should move towards each other for animation for each frame
		var pos1 = n1.position;
		var pos2 = n2.position;
		
		var distance = new THREE.Vector3(n2.position.x - n1.position.x, n2.position.y - n1.position.y, 0);
		var distance1 = new THREE.Vector3(distance.x/2, distance.y/2, 0);
		var distance2 = new THREE.Vector3(-distance.x/2, -distance.y/2, 0);
		
		var newLocation = new THREE.Vector3(n1.position.x + distance.x/2, n1.position.y + distance.y/2, NODE_LAYER);
		
		var travelSpeed1 = new THREE.Vector3(distance1.x/ITERATIONS, distance1.y/ITERATIONS, 0);
		var travelSpeed2 = new THREE.Vector3(distance2.x/ITERATIONS, distance2.y/ITERATIONS, 0);
		
		//Sets up the animation frames
		for(var i = 0; i < ITERATIONS; i++) {
			setTimeout( function() {
				
			animation( n1 , travelSpeed1 );
			animation( n2 , travelSpeed2 );

			}, TIME_BT_FRAMES*(i + 1) );
		}
		//Displays the final results
		setTimeout( function() {
			
			completeAnimation( n1 , newLocation );
			completeAnimation( n2 , newLocation );
			updateGraph(n1, n2, newLocation);
			
		}, TIME_BT_FRAMES*(ITERATIONS + 1));
	}

	//Moves the nodes and edges to the new location selected for the new node
	var animation = function(node, vector) {
		var deltaX = vector.x;
		var deltaY = vector.y;
		
		//New position for the node
		node.position.set(node.position.x + deltaX, node.position.y + deltaY, NODE_LAYER);
		
		SELECTEDLIST = GRAPH.findEdges(node.id);
		
		//Respositions the edges
		for(var i = 0; i < SELECTEDLIST.length; i++) {
			var curve;
			var object = scene.getObjectById(SELECTEDLIST[i][0]);
			var controlPoints = GRAPH.getControlPoints(object.id);
			positions = object.geometry.vertices;//51 points
			//0 17 34 51
									
			if(SELECTEDLIST[i][1] == 1) {
				curve = new THREE.CubicBezierCurve3(
					new THREE.Vector3( positions[0].x + deltaX, positions[0].y + deltaY, EDGE_LAYER ),
					new THREE.Vector3( controlPoints[0].x + deltaX, controlPoints[0].y + deltaY, EDGE_LAYER ),
					new THREE.Vector3( controlPoints[1].x, controlPoints[1].y, EDGE_LAYER ),
					new THREE.Vector3( positions[50].x, positions[50].y, EDGE_LAYER )
				);
				GRAPH.setControlPoints(object.id, {x: controlPoints[0].x + deltaX, y: controlPoints[0].y + deltaY, z: EDGE_LAYER}, {x: controlPoints[1].x, y: controlPoints[1].y, z: EDGE_LAYER});
			} else {
				curve = new THREE.CubicBezierCurve3(
					new THREE.Vector3( positions[0].x, positions[0].y , EDGE_LAYER ),
					new THREE.Vector3( controlPoints[0].x, controlPoints[0].y , EDGE_LAYER ),
					new THREE.Vector3( controlPoints[1].x + deltaX, controlPoints[1].y + deltaY , EDGE_LAYER ),
					new THREE.Vector3( positions[50].x + deltaX, positions[50].y + deltaY, EDGE_LAYER )
				);
			GRAPH.setControlPoints(object.id, {x:controlPoints[0].x, y: controlPoints[0].y, z: EDGE_LAYER}, {x:controlPoints[1].x + deltaX, y: controlPoints[1].y + deltaY , z: EDGE_LAYER});
			}
			newPositions = curve.getPoints(50);								
								
			for(var j = 0; j < positions.length; j++) {
				object.geometry.vertices[j] = newPositions[j];
			}
			object.geometry.verticesNeedUpdate = true;
		}
	}

	//Plops the the nodes and edges in correct location
	var completeAnimation = function(node, vector) {
		var deltaX = vector.x - node.position.x;
		var deltaY = vector.y - node.position.y;
		
		node.position.set(vector.x, vector.y, NODE_LAYER);
		
		SELECTEDLIST = GRAPH.findEdges(node.id);
		
		for(var i = 0; i < SELECTEDLIST.length; i++) {
			var curve;
			var object = scene.getObjectById(SELECTEDLIST[i][0]);
			var controlPoints = GRAPH.getControlPoints(object.id);
			positions = object.geometry.vertices;//51 points
			//0 17 34 51
									
			if(SELECTEDLIST[i][1] == 1) {
				curve = new THREE.CubicBezierCurve3(
					new THREE.Vector3( positions[0].x + deltaX, positions[0].y + deltaY, EDGE_LAYER ),
					new THREE.Vector3( controlPoints[0].x + deltaX, controlPoints[0].y + deltaY, EDGE_LAYER ),
					new THREE.Vector3( controlPoints[1].x, controlPoints[1].y, EDGE_LAYER ),
					new THREE.Vector3( positions[50].x, positions[50].y, EDGE_LAYER )
				);
				GRAPH.setControlPoints(object.id, {x: controlPoints[0].x + deltaX, y: controlPoints[0].y + deltaY, z: EDGE_LAYER}, {x: controlPoints[1].x, y: controlPoints[1].y, z: EDGE_LAYER});
			} else {
				curve = new THREE.CubicBezierCurve3(
					new THREE.Vector3( positions[0].x, positions[0].y , EDGE_LAYER ),
					new THREE.Vector3( controlPoints[0].x, controlPoints[0].y , EDGE_LAYER ),
					new THREE.Vector3( controlPoints[1].x + deltaX, controlPoints[1].y + deltaY , EDGE_LAYER ),
					new THREE.Vector3( positions[50].x + deltaX, positions[50].y + deltaY, EDGE_LAYER )
				);
			GRAPH.setControlPoints(object.id, {x: controlPoints[0].x, y: controlPoints[0].y, z: EDGE_LAYER}, {x:controlPoints[1].x + deltaX, y: controlPoints[1].y + deltaY , z: EDGE_LAYER});
			}
			newPositions = curve.getPoints(50);								
								
			for(var j = 0; j < positions.length; j++) {
				object.geometry.vertices[j] = newPositions[j];
			}
			object.geometry.verticesNeedUpdate = true;
		}
	}
	//Updates the actual graph
	var updateGraph = function(n1, n2, vector) {
		var newId;
		var edgeList;
		var temp;
		
		//Grabs all edges of the old nodes
		edgeList = GRAPH.findEdges(n1.id, true);
		temp = GRAPH.findEdges(n2.id, true);
		for(var i = 0; i < temp.length; i++) {
			edgeList.push(temp[i]);
		}
		
		//Removes the nodes (and edges)
		GRAPHDRAWER.removeNode(n1);
		GRAPHDRAWER.removeNode(n2);
		
		//Grabs the id of the new node
		newId = GRAPHDRAWER.addNode({position: vector});
		
		//Corrects the edges for the new node
		for(var i = 0; i < edgeList.length; i++) {
			if(edgeList[i][0] == n1.id || edgeList[i][0] == n2.id) {
				edgeList[i][0] = newId;
			}
			if(edgeList[i][1] == n1.id || edgeList[i][1] == n2.id) {
				edgeList[i][1] = newId;
			}
			//Draws them out
			GRAPHDRAWER.addEdge({selections: [scene.getObjectById(edgeList[i][0]), scene.getObjectById(edgeList[i][1])] });
		}
	}
	
	return {
		main: main
	};
}
////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                      End Edge Contraction                             //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                   Eulerian Cycle                                      //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
/*	Eulerian Cycle

	Handles the Eularian Cycle function and deals with its animation
	Currently only visually outputs one cycle
	
	Public Methods:
	main - visually outputs the answer
	resetArrows - cleans up the drawing
	
	Todo:
	Output all unique answers
	Add a method to skip the animation
	Add a method to visually display other unique cycles 
*/
var eulerianCycle = function() {
	const ANIMATION_TIME = 2000;
	const ITERATIONS = ANIMATION_TIME/TIME_BT_FRAMES;//splits frames 
	const ARROW_COLOR = 0xff0000;
	const ARROW_LAYER = 0; //Keep at this value, it won't appear otherwise
	const HEAD_LENGTH = 20;
	const HEAD_WIDTH = 10;
	var arrows = []; //visual objects
	var actualIterations; //correction of ITERATIONS
	
	//Visually outputs answer
	var main = function() {
		var size;
		var matrix;
		var circuit;//the answer
		
		//Checks all qualifiying criteria
		if(GRAPH.edges.length == 0) {
			return [];
		}	
		if(!noOddDegrees()) {
			return false;
		}
		size = GRAPH.nodes.length;
		matrix = setUpMatrix(size);
		if(!allNonZeroDegreeConnected(matrix)) {
			return false;
		}
		
		//The answer
		circuit = hierholzerAlgorithm(matrix);
		
		for(var i = 0; i < circuit.length; i++) {
			circuit[i] = circuit[i].getId();
		}
		
		animationSetUp(circuit);
		
		return circuit;
	}
	//Adjacency matrix
	var setUpMatrix = function(size) {
		var matrix = [];
		
		for(var i = 0; i < size; i++) {
			matrix[GRAPH.nodes[i].getId()] = [];
			
			for(var j = 0; j < size; j++) {
				matrix[GRAPH.nodes[i].getId()][GRAPH.nodes[j].getId()] = (GRAPH.findEdge(GRAPH.nodes[i].getId(), GRAPH.nodes[j].getId()) != null);
			}
		}
		
		for(var i = 0; i < size; i++) {
			matrix[GRAPH.nodes[i].getId()][GRAPH.nodes[i].getId()] = null;
		}
		
		return matrix;
	}
	//Criteria for eularian cycle
	var noOddDegrees = function() {
		for(var i = 0; i < GRAPH.nodes.length; i++) {
			if(GRAPH.nodes[i].getDegree() % 2 == 1) {
				return false;
			}
		}
		return true;
	}
	//Criteria for eularian cycle
	var allNonZeroDegreeConnected = function(matrix) {
		var bool = true;//assume true
		
		var notVisited = new Set(GRAPH.nodes);
		var next = [];
		var start;
		
		var add = [];
		var del = [];
		var index;
		
		//Grabs the first connected node
		for(var i = 0; i < GRAPH.nodes.length; i++) {
			if(GRAPH.nodes[i].getDegree() != 0) {
				start = GRAPH.nodes[i];
			}
		}
		
		//Grabs it's adjacent nodes
		for(var i = 0; i < GRAPH.nodes.length; i++) {
			if(matrix[start.getId()][GRAPH.nodes[i].getId()]) {
				next.push(GRAPH.nodes[i]);
			}
		}
		
		notVisited.delete(start);
		
		//BFS
		while(next.length > 0) {
			
			for(var i = 0; i < next.length; i++) {
				notVisited.delete(next[i]);
			}

			for(var i = 0; i < next.length; i++) {
				
				for(var j = 0; j < GRAPH.nodes.length; j++) {
					if(matrix[next[i].getId()][GRAPH.nodes[j].getId()] 
					&& notVisited.has(GRAPH.nodes[j])
					&& !add.includes(GRAPH.nodes[j])) {
						add.push(GRAPH.nodes[j]);
					}
				}
				
				del.push(next[i]);
			}

			for(var i = 0; i < del.length; i++) {
				index = next.indexOf(del[i]);
				next.splice(index, 1);
			}
			
			del = [];
			
			for(var i = 0; i < add.length; i++) {
				next.push(add[i]);
			}
			
			add = [];
		}
		
		//Conncected nodes that have not been visited
		notVisited.forEach(function(val){
			if(val.getDegree() != 0) {
				bool = false;
			}
		});
		
		return bool;		
	}
	
	//The actual algorithm
	var hierholzerAlgorithm = function(matrix) {
		var circuit = [];
		var unusedEdges = {}; //"id of node" => # of unused edges
		var edgesVisited = new Set();
		var start;
		var last;
				
		//Grabs first connected node as a start
		for(var i = 0; GRAPH.nodes.length; i++) {
			if(GRAPH.nodes[i].getDegree() != 0) {
				start = GRAPH.nodes[i];
				circuit.push(start);
				break;
			}
		}
		
		while(true) {
			//Finds first adjacent node to continue path
			for(var i = 0; i < GRAPH.nodes.length; i++) {
				if(matrix[start.getId()][GRAPH.nodes[i].getId()] && !circuit.includes(GRAPH.nodes[i])) {
					circuit.push(GRAPH.nodes[i]);
					last = GRAPH.nodes[i];
					unusedEdges[start.getId().toString()] = unusedEdges[start.getId().toString()] === 
						undefined ? start.getDegree() - 1 : unusedEdges[start.getId().toString()] - 1;
					unusedEdges[last.getId().toString()] = unusedEdges[last.getId().toString()] === 
						undefined ? last.getDegree() - 1 : unusedEdges[last.getId().toString()] - 1;
					edgesVisited.add(GRAPH.findEdge(start.getId(), last.getId()));
					break;
				}
			}
			
			//Builds path until start node is encountered
			while(start !== last) {
				//Chooses next node, checks if the start is encountered or not
				for(var i = 0; i < GRAPH.nodes.length; i++) {
					if(matrix[last.getId()][GRAPH.nodes[i].getId()] && start == GRAPH.nodes[i] && !edgesVisited.has(GRAPH.findEdge(last.getId(), GRAPH.nodes[i].getId()))) {
						edgesVisited.add(GRAPH.findEdge(last.getId(), GRAPH.nodes[i].getId()));
						last = start;
						unusedEdges[circuit[circuit.length - 1].getId().toString()]--;
						unusedEdges[start.getId().toString()]--;
						break;
					}
					else if(matrix[last.getId()][GRAPH.nodes[i].getId()] && !edgesVisited.has(GRAPH.findEdge(last.getId(), GRAPH.nodes[i].getId()))) {
						edgesVisited.add(GRAPH.findEdge(last.getId(), GRAPH.nodes[i].getId()));
						last = GRAPH.nodes[i];
						circuit.push(last);
						unusedEdges[last.getId().toString()] = unusedEdges[last.getId().toString()] === 
							undefined ? last.getDegree() - 1 : unusedEdges[last.getId().toString()] - 1;
						unusedEdges[circuit[circuit.length - 2].getId().toString()]--;
						break;
					}
				}
			}
			
			start = null;
			
			//Finds first node with unused edges
			for(var i = 0; i < GRAPH.nodes.length; i++) {
				if(unusedEdges[GRAPH.nodes[i].getId().toString()] !== undefined &&
					unusedEdges[GRAPH.nodes[i].getId().toString()] !== 0) {
					start = last = GRAPH.nodes[i];
					break;
				}
			};
			
			//This is the eulerian circuit
			if(start == null) {
				circuit.push(last);
				return circuit;
			}
			
			//Rotates circuit for the new starting node
			while(start != circuit[0]) {
				circuit = ciruit.push(circuit.shift());
			}
			circuit.push(last);
		}
	}
	
	//Animation where the arrows are drawn out incrementally starting with the first edge to the last in the circuit
	var animationSetUp = function(circuit) {
		var iterationsPerEdge = ITERATIONS/(circuit.length - 1);
		var endPoints = [];
		var directionVectors = [];
		var finalLengths = [];
		
		//Collects the endpoints for the arrows
		for(var i = 0; i < circuit.length; i++) {
			endPoints.push(scene.getObjectById(circuit[i]).position);
		}
		//Finds the required length of the arrows, and directions
		for(var i = 0; i < endPoints.length - 1; i++) {
			finalLengths.push(new THREE.Vector3(endPoints[i + 1].x - endPoints[i].x, endPoints[i + 1].y - endPoints[i].y, 0));
			directionVectors.push(new THREE.Vector3(1,1,1));
			directionVectors[i].copy(finalLengths[i]);
			directionVectors[i].normalize();
			finalLengths[i] = Math.sqrt(Math.pow(finalLengths[i].x, 2) + Math.pow(finalLengths[i].y, 2));
		}
		
		iterationsPerEdge = Math.ceil(iterationsPerEdge);
		actualIterations = iterationsPerEdge * directionVectors.length;//actual total iterations
		
		//Set up for animation
		for(var i = 0; i < actualIterations; i++) {
			
			(function(i) {
				setTimeout(function() {
	
				animation(endPoints[Math.floor(i/iterationsPerEdge)], 
				directionVectors[Math.floor(i/iterationsPerEdge)], 
				finalLengths[Math.floor(i/iterationsPerEdge)] * (i % iterationsPerEdge / iterationsPerEdge),
				Math.floor(i/iterationsPerEdge));
			
				}, (i + 1)*TIME_BT_FRAMES);
			})(i);
		}
		
		setTimeout(function() {
			
			animationComplete(endPoints, directionVectors, finalLengths);
			
		}, (actualIterations + 1)*TIME_BT_FRAMES );
		
	}
	//Draws the arrows incrementally, and replaces an old arrow when appropriate
	var animation = function(orig, dir, length, i) {
		if(arrows[i] === undefined) {
			arrows[i] = new THREE.ArrowHelper( dir, orig, length, ARROW_COLOR , HEAD_LENGTH, HEAD_LENGTH  )
			scene.add( arrows[i] )
		}
		else {
			scene.remove( arrows[i] );
			arrows[i] = new THREE.ArrowHelper( dir, orig, length, ARROW_COLOR , HEAD_LENGTH, HEAD_LENGTH  )
			scene.add( arrows[i] )
		}
	}
	//Final visual
	var animationComplete = function(endPoints, directionVectors, finalLengths) {
		
		for(var i = 0; i < directionVectors.length; i++) {
			scene.remove( arrows[i] );
			arrows[i] = new THREE.ArrowHelper( directionVectors[i], endPoints[i], finalLengths[i], ARROW_COLOR , HEAD_LENGTH, HEAD_LENGTH  );
			scene.add( arrows[i] );
		}
	}
	//Cleans up visual
	var resetArrows = function() {
		for(var i = 0; i < arrows.length; i++) {
			scene.remove(arrows[i]);
		}
		arrows = [];
	}
	
	return {
		resetArrows: resetArrows,
		main: main
	}
}
////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                  End Eulerian Cycle                                   //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////                This section deals with the actual graph                       /////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                              Graph                                    //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
/*	Graph
	
	The actual graph.
	!!!To keep the display matching the graph, DO NOT manipulate the graph using the methods provided.
	!!!Use graphDrawer.js for that.
	
	Returns a Graph object with public methods/properties:
	nodes - array of Node objects
	edges - array of Edge objects
	camera - camera object (used for the saving/loading feature)
	print - this used to test for correct output 
	addNode ------------------
	addEdge					  |
	removeNode                |
	removeEdge				  |-----self explanatory (all require the id of the object)
	findNode				  |
	findEdge				  |
	findEdges------------------
	getControlPoints - for purposes of manipulating the edges as bezier curves (SUBJECT FOR DELETION FOR FINAL PRODUCT)
	setControlPoints - for purposes of manipulating the edges as bezier curves (SUBJECT FOR DELETION FOR FINAL PRODUCT)
	
	Todo:
	Naming nodes
*/
var Graph = function() {
	//Node Object
	var Node = function(id) {
		var position;
		var color;
		var name;
		var degree = 0;
		
		var getId = function() {
			return id;
		}
		var getPosition = function() {
			return position;
		}
		var getColor = function() {
			return color;
		}
		var getName = function() {
			return name;
		}
		var getDegree = function() {
			return degree;
		}
		
		var setPosition = function(p) {
			position = p;
		}
		
		var setColor = function(c) {
			color = c;
		}
		var setName = function(n) {
			name = n;
		}
		
		var incrementDegree = function() {
			degree++;
		}
		var decrementDegree = function() {
			degree--;
		}
		
		return {
			getId: getId,
			getPosition: getPosition,
			getColor: getColor,
			getName: getName,
			getDegree: getDegree,
			setPosition: setPosition,
			setColor: setColor,
			setName: setName,
			incrementDegree: incrementDegree,
			decrementDegree: decrementDegree
		};
	}
	//Edge Object
	var Edge = function(id, node1, node2, controlPoint1, controlPoint2) {
		var endPoint1;
		var endPoint2;
		var color;
		
		var getId = function() {
			return id;
		}
		var getNode1 = function() {
			return node1;
		}
		var getNode2 = function() {
			return node2;
		}
		//(SUBJECT FOR DELETION FOR FINAL PRODUCT)
		var getControlPoint1 = function() {
			return controlPoint1;
		}
		//(SUBJECT FOR DELETION FOR FINAL PRODUCT)
		var getControlPoint2 = function() {
			return controlPoint2;
		}
		var getEndPoint1 = function() {
			return endPoint1;
		}
		var getEndPoint2 = function() {
			return endPoint1;
		}
		var getColor = function() {
			return color;
		}
		
		//(SUBJECT FOR DELETION FOR FINAL PRODUCT)
		var setControlPoint1 = function(cp) {
			controlPoint1 = cp;
		}
		//(SUBJECT FOR DELETION FOR FINAL PRODUCT)
		var setControlPoint2 = function(cp) {
			controlPoint2 = cp;
		}
		var setEndPoint1 = function(ep) {
			endPoint1 = ep;
		}
		var setEndPoint2 = function(ep) {
			endPoint2 = ep;
		}
		var setColor = function(c) {
			color = c;
		}
		
		return {
			getId: getId,
			getNode1: getNode1,
			getNode2: getNode2,
			getControlPoint1: getControlPoint1, //(SUBJECT FOR DELETION FOR FINAL PRODUCT)
			getControlPoint2: getControlPoint2, //(SUBJECT FOR DELETION FOR FINAL PRODUCT)
			getEndPoint1: getEndPoint1,
			getEndPoint2: getEndPoint2,
			getColor: getColor,
			setControlPoint1: setControlPoint1, //(SUBJECT FOR DELETION FOR FINAL PRODUCT)
			setControlPoint2: setControlPoint2, //(SUBJECT FOR DELETION FOR FINAL PRODUCT)
			setEndPoint1: setEndPoint1,
			setEndPoint2: setEndPoint2,
			setColor, setColor
		}
	}
	//Camera Object
	var Camera = function() {
		var position;
		var zoom;
		
		var getPosition = function() {
			return position;
		}
		var getZoom = function() {
			return zoom;
		}
		
		var setPosition = function(p) {
			position = p;
		}
		var setZoom = function(z) {
			zoom = z;
		}
		
		return {
			getPosition: getPosition,
			getZoom: getZoom,
			setPosition: setPosition,
			setZoom: setZoom
		};
	}
	//Graph Object
	var NewGraph = function() {
		var nodes = [];
		var edges = [];
		
		var camera = Camera();
		
		//For testing purposes
		var print = function(){
			var string = "";
			string += "Nodes: \n";
			for(var i = 0; i < nodes.length; i++) {
				string += ["id:", nodes[i].getId(), ""].join(" ");
				string += ["deg:", nodes[i].getDegree(), ""].join(" ");
				string += "\n";
			}
			string += "Edges: \n";
			for(var i = 0; i < edges.length; i++) {
				string += ["id:", edges[i].getId(), ""].join(" ");
				string += ["node1:", edges[i].getNode1(), ""].join(" ");
				string += ["node2:", edges[i].getNode2(), ""].join(" ");
				string += "\n";
			}
			console.log(string);
		};
				
		//Requires a unique object id, unique name(if one is provided)
		var addNode = function(n, name=null) {
			
			nodes.push(Node(n));
			return true;
			
		};
		
		//Requires the node pair be unique, unique object id, rejects self loops
		//(SUBJECT FOR MODIFICATION IF CONTROL POINTS ARE TO BE DELETED)
		var addEdge = function(id, n1, n2, cp1, cp2) {
			for(var i = 0; i < edges.length; i++) {
				if(edges[i].getNode1() == n1 && 
				edges[i].getNode2() == n2 ||
				edges[i].getNode1() == n2 &&
				edges[i].getNode2() == n1) {
					return false;
				}
			}
			
			if(n1 == n2) {
				return false;
			}
			
			edges.push(new Edge(id, n1, n2, cp1, cp2));	
			findNode(n1).incrementDegree();
			findNode(n2).incrementDegree();
					
			return true;
		};
		
		//Removes nodes and corresponding edges. Returns list of Object Id's. Required node object id.
		var removeNode = function(n) {
			var removeList = [];
			
			for(var i = 0; i < nodes.length; i++) {
				if(nodes[i].getId() == n) {
					nodes.splice(i, 1);
					removeList.push(n);
				
					edgesToRemove = removeEdge(n, 0, true);
					for(var i = 0; i < edgesToRemove.length; i++) {
						removeList.push(edgesToRemove[i]);
					}
					break;
				}
			}
			
			return removeList;
		};
		
		//Removes edges. Returns a list of Object Id's. Requires one (node deletion) or both node id's (edge deletion).
		var removeEdge = function(n1, n2, all=false) {
			var removeList = [];
			if(all) {
				for(var i = 0; i < edges.length; ) {
					if(edges[i].getNode1() == n1) {
						findNode(edges[i].getNode2()).decrementDegree();
						removeList.push(edges[i].getId());
						edges.splice(i, 1);
					}
					else if(edges[i].getNode2() == n1) {
						findNode(edges[i].getNode1()).decrementDegree();
						removeList.push(edges[i].getId());
						edges.splice(i, 1);
					}
					else {
						i++;
					}
				}
			}
			else {
				for(var i = 0; i < edges.length; i++) {
					if(edges[i].getNode1() == n1 && edges[i].getNode2() == n2
					|| edges[i].getNode1() == n2 && edges[i].getNode2() == n1) {
						findNode(edges[i].getNode1()).decrementDegree();
						findNode(edges[i].getNode2()).decrementDegree();
						removeList.push(edges[i].getId());
						edges.splice(i, 1);
						break;
					}
				}
			}
			return removeList;
		};
		
		//Find node by id.
		var findNode = function(n) {
			for(var i = 0; i < nodes.length; i++) {
				if(nodes[i].getId() == n) {
					return nodes[i];
				}
			}
		}
		
		//Find edge for pair of nodes. Requires object ids.
		var findEdge = function(n1, n2) {
			var edge = null;
			for(var i = 0; i < edges.length; i++) {
				if(edges[i].getNode1() == n1 && edges[i].getNode2() == n2
				|| edges[i].getNode1() == n2 && edges[i].getNode2() == n1) {
					edge = edges[i].getId();
					break;
				}
			}
			return edge;
		};
		
		//Finds all edges for a node. Required object id.
		var findEdges = function(n, both=false) {
			var edgesFound = [];
			if(both) {
				for(var i = 0; i < edges.length; i++) {
					if(edges[i].getNode1() == n || edges[i].getNode2() == n) {
						edgesFound.push([edges[i].getNode1(), edges[i].getNode2()]);
					}
				}
			} else {
				for(var i = 0; i < edges.length; i++) {
					if(edges[i].getNode1() == n) {
						edgesFound.push([edges[i].getId(), 1]);
					}
					else if(edges[i].getNode2() == n) {
						edgesFound.push([edges[i].getId(), 2]);
					}
				}
			}
			
			return edgesFound;
		};
		
		//(SUBJECT FOR DELETION FOR FINAL PRODUCT)
		var getControlPoints = function(e) {
			for(var i = 0; i < edges.length; i++) {
				if(edges[i].getId() == e) {
					return [edges[i].getControlPoint1(), edges[i].getControlPoint2()];
				}
			}
		};
		//(SUBJECT FOR DELETION FOR FINAL PRODUCT)
		var setControlPoints = function(e, v1, v2) {
			for(var i = 0; i < edges.length; i++) {
				if(edges[i].getId() == e) {
					edges[i].setControlPoint1({x: v1.x, y: v1.y, z: v1.z});
					edges[i].setControlPoint2({x: v2.x, y: v2.y, z: v2.z});
					return;
				}
			}
		};
		
		return {
			nodes: nodes,
			edges: edges,
			camera: camera,
			print: print,
			addNode: addNode,
			addEdge: addEdge,
			removeNode: removeNode,
			removeEdge: removeEdge,
			findNode: findNode,
			findEdge: findEdge,
			findEdges: findEdges,
			getControlPoints: getControlPoints,
			setControlPoints: setControlPoints
		};
	}
	
	return NewGraph();
} 
////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                          End Graph                                    //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                          Graph Drawer                                 //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
/*	Graph Drawer

	Any manipulation of the graph should be done through these.
	Handles keeping what is displayed in sync with the graph data.
	
	Public Methods:
		addNode ---------------
		addEdge				   |
		removeNode			   |------Self-Explanatory, but look below for more details
		removeEdge			   |
		clearGraph--------------
		
	Todo:
	Naming nodes
*/
var graphDrawer = function() {
	var addNode = function(options) {
	/* 	options = {
			position,	<--For everything else
			load		<--For when loading graph data with a link, should be Node object from JSON
		}
	*/
		var geometry;
		var object;

		if(typeof options.load === "undefined") {
			geometry = new THREE.CircleBufferGeometry( NODE_RADIUS , 32 );
			object = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color: DEFAULT_COLOR} ) );
			object.position.x = options.position.x;
			object.position.y = options.position.y;
			object.position.z = NODE_LAYER;
			object.userData = "Node";
		} else {
			geometry = new THREE.CircleBufferGeometry( NODE_RADIUS , 32 );
			object = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color: options.load.color} ) );
			object.position.x = options.load.position.x;
			object.position.y = options.load.position.y;
			object.position.z = NODE_LAYER;
			object.userData = "Node";
		}

		GRAPH.addNode(object.id);
		scene.add( object );
		
		return object.id;
	}
	var addEdge = function(options) {
	/*	options = {
			selections,		<---For Complement, Edge Contracton, and via interactive display
			loading = {		<---For when loading graph data
				load, 		<---the Edge object to be loaded from the JSON
				nodeMap		<---When recreating the scene, the nodes will have new ids assigned. This is to preserve the proper connection.
			},					 
			complement		<--For the Complement function
		}
	*/		
		var curve;

		//Everything else
		if(typeof options.selections !== "undefined") {
			curve = new THREE.CubicBezierCurve3(
				new THREE.Vector3( options.selections[0].position.x, options.selections[0].position.y, EDGE_LAYER ),
				new THREE.Vector3( options.selections[0].position.x, options.selections[0].position.y, EDGE_LAYER ),
				new THREE.Vector3( options.selections[1].position.x, options.selections[1].position.y, EDGE_LAYER),
				new THREE.Vector3( options.selections[1].position.x, options.selections[1].position.y, EDGE_LAYER)
			);
		} 
		//Loading
		else {
			curve = new THREE.CubicBezierCurve3(
				new THREE.Vector3( options.loading.load.endPoint1.x, options.loading.load.endPoint1.y, options.loading.load.endPoint1.z ),
				new THREE.Vector3( options.loading.load.controlPoint1.x, options.loading.load.controlPoint1.y, options.loading.load.controlPoint1.z ),
				new THREE.Vector3( options.loading.load.controlPoint2.x, options.loading.load.controlPoint2.y, options.loading.load.controlPoint2.z ),
				new THREE.Vector3( options.loading.load.endPoint2.x, options.loading.load.endPoint2.y, options.loading.load.endPoint2.z)
			);
		}
		
		var material;
		
		//Everything else
		if(typeof options.selections !== "undefined" && typeof options.complement === "undefined" ||
			typeof options.loading !== "undefined") {
			material = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true });
		}
		//Used as part of the beginning of the Complement animation
		else {
			material = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 });
		}
		
		//Edge object
		var geometry = new THREE.Geometry();
		geometry.vertices = curve.getPoints(50);
		var line = new THREE.Line( geometry, material );
		line.userData = "Edge";
		
		var bool = false;//Assume edge is invalid
		
		//For everything else, validates edge, or not
		if(typeof options.selections != "undefined") {
			bool = GRAPH.addEdge(line.id, options.selections[0].id, options.selections[1].id, options.selections[0].position,  options.selections[1].position );
		} 
		//Loading
		else {
			var n1 = nodeMap[options.loading.load.node1];
			var n2 = nodeMap[options.loading.load.node2];
		
			bool = GRAPH.addEdge(line.id, n1, n2, options.loading.load.controlPoint1, options.loading.load.controlPoint2);
		}
		
		//Check edge validity before creating object
		//Everything else
		if(typeof options.loading == "undefined" && bool) {
			scene.add( line );
		}
		//Loading
		else if(typeof options.loading != "undefined" && bool) {
			scene.add( line );
		}
	}
	//Remvoes the node and edges attached to it (sync)
	var removeNode = function(object) {
		var list = GRAPH.removeNode(object.id);
		removeObjects(list);
	}
	//Removes a single edge (sync)
	var removeEdge = function(sel1, sel2) {
		var list = GRAPH.removeEdge(sel1, sel2);
		removeObjects(list);
	}
	//Removes everything (sync)
	var clearGraph = function() {
		while(GRAPH.nodes.length > 0) {
			removeNode(scene.getObjectById(GRAPH.nodes[0].getId()));
		}
	}
	//Actual function to remove the objects from display
	var removeObjects = function(list) {
		for(var i = 0; i < list.length; i++) {
			scene.remove(scene.getObjectById(list[i], true));
		}
	}
	var nameNode = function(name) {		
		var bitmap = document.createElement('canvas');
		var g = bitmap.getContext('2d');
		
		bitmap.width = 128;
		bitmap.height = 128;
		//g.font = 'Bold 128px Arial';
		//g.textAlign = "center";

		g.font = 'Bold 128px Arial';
		g.fillStyle = 'white';
		g.fillText(name, 0, 128);
		
		
		/*g.font = '20pt Arial';
		//g.textBaseline = "middle";
		
		bitmap.height = 128;
		bitmap.width = g.measureText(name).width;
		
		
		g.fillStyle = '#fff';
		g.fillText(name, 0, 128);
		g.strokeStyle = 'white';
		g.strokeText(name, 0, 128);*/
		
		var texture = new THREE.Texture(bitmap) 
		texture.needsUpdate = true;
		texture.minFilter = THREE.LinearFilter;
		
		material = new THREE.MeshBasicMaterial({ map : texture, /*transparent: true*/})
		plane = new THREE.Mesh(new THREE.PlaneGeometry(name.length*100, 100), material);
		plane.material.side = THREE.DoubleSide;
		plane.position.z = -200;
		plane.userData = "text";
		
		scene.add(plane);
		
		console.log(name);
	}
	
	return {
		addNode : addNode,
		addEdge : addEdge,
		removeNode : removeNode,
		removeEdge : removeEdge,
		clearGraph : clearGraph,
		nameNode : nameNode
	};
}
////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                        End Graph Drawer                               //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                           Graph Parser                                //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
/*	graphParser INCOMPLETE

	Handles all the parsing and generating of a graph by user input
	
	Public Methods:
	parseSet - parses out the node and edge set and generates a graph
	parseSeq - parses out the degree sequence and generates a graph
	
	Todo:
	Actually generate a graph visaully
*/

var graphParser = function() {

	//Parses the node and edge set
	var parseSet = function(nodeStr, edgeStr) {

		nodeSet = new Set();
		edgeSet = new Set();
		errorMsg = [];
		
		//Node names can only contain contain numbers, letters, underscores
		//Edge set input can only contain a semi colon separated list of node pairs separated by commas
		var nodeRegex = /[\s]*[\w][\w\s]*/;
		var edgeSetRegex = /[\s]*[\w][\w\s]*[,][\s]*[\w][\w\s]*([;][\s]*[\w][\w\s]*[,][\s]*[\w][\w\s]*)*/;
		
		if(nodeStr == "") {
			hintBox("No nodes were named, so there was no graph to create.");
			return;
		}
		
		//Removes execcseive spaces, and splits into array
		var strArray = nodeStr.replace(/\s+/,' ').trim();
		strArray = strArray.split(",");
		
		//
		for(var i = 0; i < strArray.length; i++) {
			strArray[i] = strArray[i].trim();
			
			//Ignores blanks
			if(/^\\s*$/.test(strArray[i]) || strArray[i] == "") {
				continue;
			}
			//Stops on an erroneous name
			if(!nodeRegex.test(strArray[i])) {
				hintBox( "'" + strArray[i] + "' The names for the nodes can only contain numbers, letters, underscores.");
				return;
			}
			//Avoids duplicates
			else if(nodeSet.has(strArray[i])) {
				errorMsg.push(strArray[i] + " was already included. Duplicate names are not allowed.");
			} 
			//Adds as node
			else {
				nodeSet.add(strArray[i]);
			}
		}
		
		//Removes excessive spaces
		var strArray = edgeStr.replace(/\s+/,' ').trim();
		
		//Stops on erroneous input
		if(!edgeSetRegex.test(strArray)) {
			hintBox("The edge set does follow the correct format.");
			return;
		}
		
		//Splits inti array of pairs
		strArray = strArray.split(";");
		for(var i = 0; i < strArray.length; i++) {
			//Ignores blanks
			if(/^\\s*$/.test(strArray[i]) || strArray[i] == "") {
				continue;
			}
			//Splits pair further
			strArray[i] = strArray[i].split(",");
			//Confirms that they are pairs
			if(!(Array.isArray(strArray[i]) && strArray[i].length == 2)) {
				hintBox(edgeStr.split(";")[i] + "must have two nodes");
			}
			
			strArray[i][0] = strArray[i][0].trim();
			strArray[i][1] = strArray[i][1].trim();
			//Stops when a node was never named
			if(!nodeSet.has(strArray[i][0])) {
				hintBox(strArray[i][0] + " was not defined as a node.");
			}
			else if(!nodeSet.has(strArray[i][1])) {
				hintBox(strArray[i][1] + " was not defined as a node.");
			}
			//Ignores duplicate edges
			else if (edgeSet.has([strArray[i][0], strArray[i][1]]) || edgeSet.has([strArray[i][1], strArray[i][0]])){
				errorMsg.push("Edge " + strArray[i][0] + " , " + strArray[i][1] + " was already included. Only simple graphs are allowed.");
			}
			//Add the edge
			else {
				edgeSet.add([strArray[i][0], strArray[i][1]]);
			}
		}
		
		//Prints out any errors that have occured but can be ignored.
		if(errorMsg.length != 0) {
			var str = "";
			for(var i = 0; i < errorMsg.length; i++) {
				str += errorMsg[i] + "<br/>";
			}
			hintBox(str);
		}
		
		nodeSet = Array.from(result.nodeSet);
		edgeSet = Array.from(result.edgeSet);
		
		//Generate the graph...
		return;
	}

	//Parses degree sequence
	var parseSeq = function(degStr) {
		
		var nodeSet = [];
		var edgeSet = [];
		var errorMsg = "";
		
		//String must be a comma separated list allowing spaces
		var degRegex = /[\s]*[\d]+[\s]*([,][\s]*[\d]+[\s]*)/;
		var degArray;
		
		if(!degRegex.test(degStr)) {
			errorMsg = "The degree sequence must be a comma separated list of numbers. Leave no excessive/trailing commas";
			hintBox(errorMsg);
			return;
		}
		
		degArray = degStr.replace(/\s+/,' ').trim();
		degArray = degArray.split(",");
		
		//Extracts numbers
		for(var i = 0; i < degArray.length; i++) {
			degArray[i] = Number(degArray[i]);
		}
		
		//Create a node and edge set
		errorMsg = havel_hakiniAlgorithm(degArray);
		if(typeof msg == "string") {
			hintBox(errorMsg);
			return;
		}
		else {
			nodeSet = errorMsg.nodeSet;
			edgeSet = errorMsg.edgeSet;
		}
		
		//Generate the graph...
		return;
	}
	//Degree sequence to Node and Edge set
	var havel_hakiniAlgorithm = function(degArray) {
		
		var nodeSet = [];
		var edgeSet = [];
		var sum = 0;
		
		//Check if it can be a legit graph
		for(var i = 0; i < degArray.length ; i++) {
			sum += degArray[i];
			
			if(degArray[i] >= degArray.length) {
				return "This is not a real graph, nodes cannot have a degree that is >= to the number of nodes.";
			}
		}
		if(sum%2 == 1) {
			return "This is not a real graph, the sum of all degrees for real graphs is even.";
		}
		
		//Sorts in non-increasing order
		degArray.sort(function(a,b) {
			if( a >  b )
				return -1;
			if( a < b )
				return 1
			return 0;
		});
		
		//Make nodes
		for(var i = 0; i < degArray.length ; i++) {
			nodeSet.push({id: "_" + i, degReq: degArray[i]});
		}
		
		//Sort in non-increasing order
		nodeSet.sort(function(a,b) {
			if( a.degReq >  b.degReq )
				return -1;
			if( a.degReq < b.degReq )
				return 1;
			return 0;
		});
		
		//Make edges
		while(nodeSet[0].degReq != 0) {
			
			//Add edges while decrementing the required degree for the respective nodes
			for(var i = 1; i <= nodeSet.degReq; i++) {
				edgeSet.push([nodeSet[0].id, nodeSet[i].id]);
				nodeSet[i].degReq--;
			}
			nodeSet[0].degReq = 0;
			
			//Sort in non-increasing order
			nodeSet.sort(function(a,b) {
				if( a.degReq >  b.degReq )
					return -1;
				if( a.degReq < b.degReq )
					return 1
				return 0;
			});
		}
		
		return {nodeSet: nodeSet, edgeSet: edgeSet};
	}
	
	return {
		parseSet: parseSet,
		parseSeq: parseSeq
	};
}
////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                       End Graph Parser                                //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////                This is where the actual fun begins                            /////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//Graph
var GRAPH = Graph();
var GRAPHDRAWER = new graphDrawer();
var GRAPHPARSER = new graphParser();

//Graph Functions
var COMPLEMENT = complement();
var EDGECONTRACTION = edgeContraction();
var EULERIANCYCLE = eulerianCycle();


$(document).ready(function(){

	init();
	animate();
	
	///////////////////////////////////////////////////////////////////////////////////////
	/////////////// The flip panels outside the graph      ////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////	
	
	//Flip panels
	$("#flip-1").click(function(){
		$("#panel-1").slideToggle("slow");
		$("#panel-2").slideUp("slow");
		$("#panel-3").slideUp("slow");
		$("#panel-4").slideUp("slow");
		$("#panel-5").slideUp("slow");
	});
	$("#flip-2").click(function(){
		$("#panel-2").slideToggle("slow");
		$("#panel-1").slideUp("slow");
		$("#panel-3").slideUp("slow");
		$("#panel-4").slideUp("slow");
		$("#panel-5").slideUp("slow");
	});
	$("#flip-3").click(function(){
		$("#panel-3").slideToggle("slow");
		$("#panel-1").slideUp("slow");
		$("#panel-2").slideUp("slow");
		$("#panel-4").slideUp("slow");
		$("#panel-5").slideUp("slow");
	});
	$("#flip-4").click(function(){
		$("#panel-4").slideToggle("slow");
		$("#panel-1").slideUp("slow");
		$("#panel-2").slideUp("slow");
		$("#panel-3").slideUp("slow");
		$("#panel-5").slideUp("slow");
	});
	$("#flip-5").click(function(){
		$("#panel-5").slideToggle("slow");
		$("#panel-1").slideUp("slow");
		$("#panel-2").slideUp("slow");
		$("#panel-3").slideUp("slow");
		$("#panel-4").slideUp("slow");
	});
	
	//Submissions
	$("#submit-set").click(function() {
		var nodestr = $("#nodes").val();
		var edgestr = $("#edges").val();
		
		GRAPHPARSER.parseSet(nodestr, edgestr);
	});
	$("#submit-seq").click(function() {
		var degstr = $("#degree-seq").val();
		
		GRAPHPARSER.parseSeq(degstr);
	});
		
	///////////////////////////////////////////////////////////////////////////////////////
	/////////////// Buttons outside the renderer, and saving                ///////////////
	/////////////// (Why this is seperate from buttons is just coincidence) ///////////////
	///////////////////////////////////////////////////////////////////////////////////////	
	
	//Saving
	$("#save-PDF").click(function() {
		$("#PDFModal").show();
	});
	$("#save-PDF-Set").click(function() {
		var orientation = $("input[name=Orientation]:checked", "#PDF-form").val();
		var filename = $("#Filename").val();
		
		orientation = orientation == "Landscape" ? "l" : "p"; 
		
		var doc = new jsPDF(orientation, "mm", "a4");
		var imgData = renderer.domElement.toDataURL("image/jpeg");
		
		if(orientation == "p") {
			doc.addImage(imgData, 'JPEG', 10, 10, CANVAS_WIDTH_PORTRAIT, CANVAS_WIDTH_PORTRAIT*$("#renderer").height()/$("#renderer").width());
		} else {
			doc.addImage(imgData, 'JPEG', 10, 35, CANVAS_WIDTH_LANDSCAPE, CANVAS_WIDTH_LANDSCAPE*$("#renderer").height()/$("#renderer").width());
		}
		
		doc.save(filename);
		$("#PDFModal").hide();
	});
	$(".close").click(function() {
		$("#PDFModal").hide();
	});
	$("#save-Link").click(function() {
		var obj;
	
		for(var i = 0; i < GRAPH.nodes.length; i++) {
			obj = scene.getObjectById(GRAPH.nodes[i].getId());
			GRAPH.nodes[i].setPosition(obj.position);
			GRAPH.nodes[i].setColor(obj.material.color.getHex());
		}		

		for(var i = 0; i < GRAPH.edges.length; i++) {
			obj = scene.getObjectById(GRAPH.edges[i].getId());
			GRAPH.edges[i].setEndPoint1(obj.geometry.vertices[0]);
			GRAPH.edges[i].setEndPoint2(obj.geometry.vertices[50]);
		}
		
		GRAPH.camera.setPosition(camera.position);
		GRAPH.camera.setZoom(camera.zoom);
		
		obj = {};
		obj.nodes = [];
		
		for(var i = 0; i < GRAPH.nodes.length; i++) {
			obj.nodes.push({id: GRAPH.nodes[i].getId(),
				position: new THREE.Vector3(Math.round(GRAPH.nodes[i].getPosition().x * 100)/ 100,
					Math.round(GRAPH.nodes[i].getPosition().y * 100)/ 100,
					Math.round(GRAPH.nodes[i].getPosition().z * 100)/ 100),
				color: GRAPH.nodes[i].getColor(),
				name: GRAPH.nodes[i].getName(),
				degree: GRAPH.nodes[i].getDegree()});
		}
		
		obj.edges = [];
		for(var i = 0; i < GRAPH.edges.length; i++) {
			obj.edges.push({id: GRAPH.edges[i].getId(),
				node1: GRAPH.edges[i].getNode1(),
				node2: GRAPH.edges[i].getNode2(),
				controlPoint1: new THREE.Vector3(Math.round(GRAPH.edges[i].getControlPoint1().x * 100) / 100,
					Math.round(GRAPH.edges[i].getControlPoint1().y * 100) / 100,
					Math.round(GRAPH.edges[i].getControlPoint1().z * 100) / 100),
				controlPoint2: new THREE.Vector3(Math.round(GRAPH.edges[i].getControlPoint2().x * 100) / 100,
					Math.round(GRAPH.edges[i].getControlPoint2().y * 100) / 100,
					Math.round(GRAPH.edges[i].getControlPoint2().z * 100) / 100)})
		}
		
		obj.camera = {};
		obj.camera.position = new THREE.Vector3(Math.round(GRAPH.camera.getPosition().x * 100)/ 100, 
			Math.round(GRAPH.camera.getPosition().y * 100)/ 100,
			Math.round(GRAPH.camera.getPosition().z * 100)/ 100);
		obj.camera.zoom = GRAPH.camera.getZoom();
		
		var json = JSON.stringify(obj);
		console.log(json);
		
		//SOMETHING
	});
	
	///////////////////////////////////////////////////////////////////////////////////////
	/////////////// Maintaining the renderer and proper controls  /////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////	
	
	//Resizing and Locating Mouse
	$(window).resize(function(){
		renderer.setSize( $("#renderer").width(), $("#renderer").height() );
		camera.left = $("#renderer").width() / - 2;
		camera.right = $("#renderer").width() / 2;
		camera.top = $("#renderer").height() / 2;
		camera.bottom = $("#renderer").height() / - 2;
		camera.updateProjectionMatrix();
	});			
	$("#renderer").mousemove(function(event){
		var totalOffsetX = 0;
		var totalOffsetY = 0;
		var canvasX = 0;
		var canvasY = 0;
		var currentElement = this;
		
		//Calculate collective offset
		do{
			totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
			totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
		}
		while(currentElement = currentElement.offsetParent)

		canvasX = event.pageX - totalOffsetX;
		canvasY = event.pageY - totalOffsetY;
	
		mouse.x = ( canvasX / $("canvas").innerWidth() ) * 2 - 1;
		mouse.y = - ( canvasY / $("canvas").innerHeight() ) * 2 + 1;
	});
	
	//Enables/Disables controls
	$("#renderer").mouseleave(function() {
		controls.enable = false;
	});
	$("#renderer").mouseenter(function() {
		controls.enable = true;
	});
	
	
	//Modes
	$("#renderer").click(function(event) {
		if(mode == "drawNode") {
			drawNode();
		}
		else if(mode == "drawEdge") {	
			drawEdge();
		}
		else if(mode == "deleteNode") {
			deleteNode();
		}
		else if(mode == "deleteEdge") {
			deleteEdge();
		}
		else if(mode == "moveEdge") {
			moveEdge();
		}
		else if(mode == "contractionMode") {
			contractEdge();
		}
		else if(mode == "renameNodeMode") {
			renameNode(event.pageX, (event.pageY - $(this).offset().top));
		}
	});
	
	///////////////////////////////////////////////////////////////////////////////////////
	/////////////// Handlers for when the user actively    ////////////////////////////////
    /////////////// interacts the page.                    ////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////	
	
	//Naming a node via input form
	$("#nodeNameInput").hide();
	$(window).click(function(){
		cancelConfirmation++;
		
		if(cancelConfirmation == 2) {
			$("#nodeNameInput").hide();
			$("#nodeName").val("");
			cancelConfirmation = 0;
		}
	});
	$("#nodeNameInput").click(function(event){
		event.stopPropagation();
	});
	$("#nodeNameInput").on('keyup', function (e) {
		if(e.keyCode == 13 && $("#nameNodeInput").css("display") !== "none") {
			var name = $("#nodeName").val();
			nameNode(name);
			$("#nodeName").val("");
			$("#nodeNameInput").hide();
			cancelConfirmation = 0;
		}
	});
	
	//Reseting the camera (Ctrl + Q)
	$(window).keydown(function (event) {
		if(event.which == 81 && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			controls.reset();
		}
	});
		
	//Manipulation
	$("#renderer").mousedown(function(){
		if(mode == "moveNode") {
			var intersects = raycaster.intersectObjects( scene.children );
			if(intersects.length > 0 && intersects[0].object.userData == "Node") {
				controls.enable = false;
				SELECTED1 = intersects[0].object;
				SELECTEDLIST = GRAPH.findEdges(SELECTED1.id);
			}
		}
		else if(mode == "moveEdge") {
			var intersects = raycaster.intersectObjects( scene.children );
			if(cubesExist && (INTERSECTED == cube1 || INTERSECTED == cube2)) {
				SELECTED = INTERSECTED;
				cubeSelected = true;
			}
		}
	});

	$("#renderer").mousemove(function(){
		if(mode == "moveNode") {
			if(SELECTED1) {
				var intersects = raycaster.intersectObject( plane );
				var deltaX = SELECTED1.position.x;
				var deltaY = SELECTED1.position.y;
				SELECTED1.position.set(intersects[0].point.x, intersects[0].point.y, NODE_LAYER);
				var deltaX = intersects[0].point.x - deltaX;
				var deltaY = intersects[0].point.y - deltaY;
				
				for(var i = 0; i < SELECTEDLIST.length; i++) {
					var curve;
					var object = scene.getObjectById(SELECTEDLIST[i][0]);
					var controlPoints = GRAPH.getControlPoints(object.id);
					positions = object.geometry.vertices;//51 points
					//0 17 34 51
						
					if(SELECTEDLIST[i][1] == 1) {
						curve = new THREE.CubicBezierCurve3(
							new THREE.Vector3( intersects[0].point.x, intersects[0].point.y, EDGE_LAYER ),
							new THREE.Vector3( controlPoints[0].x + deltaX, controlPoints[0].y + deltaY, EDGE_LAYER ),
							new THREE.Vector3( controlPoints[1].x, controlPoints[1].y, EDGE_LAYER ),
							new THREE.Vector3( positions[50].x, positions[50].y, EDGE_LAYER )
						);
						GRAPH.setControlPoints(object.id, {x: controlPoints[0].x + deltaX, y: controlPoints[0].y + deltaY, z: EDGE_LAYER}, {x: controlPoints[1].x, y: controlPoints[1].y, z: EDGE_LAYER});
					} else {
						curve = new THREE.CubicBezierCurve3(
							new THREE.Vector3( positions[0].x, positions[0].y , EDGE_LAYER ),
							new THREE.Vector3( controlPoints[0].x, controlPoints[0].y , EDGE_LAYER ),
							new THREE.Vector3( controlPoints[1].x + deltaX, controlPoints[1].y + deltaY , EDGE_LAYER ),
							new THREE.Vector3( intersects[0].point.x, intersects[0].point.y, EDGE_LAYER )
						);
					GRAPH.setControlPoints(object.id, {x: controlPoints[0].x, y: controlPoints[0].y, z: EDGE_LAYER}, {x: controlPoints[1].x + deltaX, y: controlPoints[1].y + deltaY , z: EDGE_LAYER});
					}
					newPositions = curve.getPoints(50);								
						
					for(var j = 0; j < positions.length; j++) {
						object.geometry.vertices[j] = newPositions[j];
					}
					object.geometry.verticesNeedUpdate = true;
				}
			}
		}
		else if(mode == "moveEdge") {
			if(SELECTED && (SELECTED == cube1 || SELECTED == cube2)) {
				var intersects = raycaster.intersectObject( plane );
				SELECTED.position.set(intersects[0].point.x, intersects[0].point.y, CUBE_LAYER);
				var curve;
				var object = scene.getObjectById(SELECTEDEDGE);
				var controlPoints = GRAPH.getControlPoints(SELECTEDEDGE);
				positions = object.geometry.vertices;
				curve = new THREE.CubicBezierCurve3(
					new THREE.Vector3( positions[0].x, positions[0].y, EDGE_LAYER ),
					new THREE.Vector3( cube1.position.x, cube1.position.y, EDGE_LAYER ),
					new THREE.Vector3( cube2.position.x, cube2.position.y, EDGE_LAYER ),
					new THREE.Vector3( positions[50].x, positions[50].y, EDGE_LAYER )
				);
				GRAPH.setControlPoints(SELECTEDEDGE, {x: cube1.position.x, y: cube1.position.y, z: EDGE_LAYER}, {x: cube2.position.x, y: cube2.position.y, z: EDGE_LAYER});
				newPositions = curve.getPoints(50);
				
				for(var j = 0; j < positions.length; j++) {
					object.geometry.vertices[j] = newPositions[j];
				}
					
				var geometry1 = new THREE.Geometry();
				geometry1.vertices.push(
					new THREE.Vector3( positions[0].x, positions[0].y, EDGE_LAYER ),
					new THREE.Vector3( cube1.position.x, cube1.position.y, EDGE_LAYER )
				);
				dashedLine1.geometry.vertices[0] = geometry1.vertices[0];
				dashedLine1.geometry.vertices[1] = geometry1.vertices[1];
				dashedLine1.geometry.computeLineDistances();
					
				var geometry2 = new THREE.Geometry();
				geometry2.vertices.push(
					new THREE.Vector3( cube1.position.x, cube1.position.y, EDGE_LAYER ),
					new THREE.Vector3( cube2.position.x, cube2.position.y, EDGE_LAYER )
				);
				dashedLine2.geometry.vertices[0] = geometry2.vertices[0];
				dashedLine2.geometry.vertices[1] = geometry2.vertices[1];
				dashedLine2.geometry.computeLineDistances();
					
				var geometry3 = new THREE.Geometry();
				geometry3.vertices.push(
					new THREE.Vector3( cube2.position.x, cube2.position.y, EDGE_LAYER ),
					new THREE.Vector3( positions[50].x, positions[50].y, EDGE_LAYER )
				);
				dashedLine3.geometry.vertices[0] = geometry3.vertices[0];
				dashedLine3.geometry.vertices[1] = geometry3.vertices[1];
				dashedLine3.geometry.computeLineDistances();
					
				object.geometry.verticesNeedUpdate = true;
				dashedLine1.geometry.verticesNeedUpdate = true;
				dashedLine1.geometry.lineDistancesNeedUpdate = true;
				dashedLine2.geometry.verticesNeedUpdate = true;
				dashedLine2.geometry.lineDistancesNeedUpdate = true;
				dashedLine3.geometry.verticesNeedUpdate = true;
				dashedLine3.geometry.lineDistancesNeedUpdate = true;
			}
		}
	});
	$("#renderer").mouseup(function(event){
		switch(event.which) {
			case 1:
				if(mode == "moveNode") {
				controls.enable = true;
				SELECTED1 = null;
				SELECTEDLIST = null;
			}
			else if(mode == "moveEdge") {
				if(cubesExist && (SELECTED == cube1 || SELECTED == cube2)) {
					controls.enable = true;
					SELECTED = null;
				}
			}
				break;
			case 3:
				plane.position.set(camera.position.x, camera.position.y, PLANE_LAYER);
				break;
		}
		
	});
	
	
		
	
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////                               ~Misc~                                                                       ////////////////////////////////////
///////////////////////////  This section handles initializing the renderer, and setting up any other HTML for input over the canvas,  ////////////////////////////////////
/////////////////////////// the function that handles the text in the hint box, and loading the graph.                                 ////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function init() {
	//Setup
	camera = new THREE.OrthographicCamera( $("#renderer").width() / - 2, $("#renderer").width() / 2, $("#renderer").height() / 2, $("#renderer").height() / - 2, 1, 10000 )
	scene = new THREE.Scene(); 
	var light = new THREE.DirectionalLight( 0xffffff, 1 );
	light.position.set( 1, 1, 1 ).normalize();
	scene.add( light );
	
	//Setup and Detection
	raycaster = new THREE.Raycaster();
	renderer = new THREE.WebGLRenderer({antialias: false, preserveDrawingBuffer: true});
	renderer.setSize( $("#renderer").width(), $("#renderer").height() ); 
	renderer.setClearColor( 0xa0f0f0 ); 
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.sortObjects = false;
	$("#renderer").get(0).appendChild(renderer.domElement);
	
	//Allow stacking on top of canvas (buttons, inputs, etc.)
	renderer.domElement.style.position = "absolute";
	renderer.domElement.style.zIndex = 0;
	
	$("#nodeNameInput").appendTo("#renderer");
	$("#nodeNameInput").css( "zIndex", 2 );
	$("#nodeNameInput").css( "position", "absolute" );
	
	//Control setup
	controls = new THREE.OrbitControls(camera, renderer.domElement);
	controls.target = new THREE.Vector3(0,0,NODE_LAYER);
	controls.enableRotate = false;
	
	//Used to detect where the mouse is
	plane = new THREE.Mesh(new THREE.PlaneBufferGeometry( PLANE_SIZE , PLANE_SIZE ,8,8), new THREE.MeshBasicMaterial({color: 0x000000, alphaTest: 0, visible: false}));
	plane.position.set(camera.position.x, camera.position.y, PLANE_LAYER);
	plane.userData = "Plane";
	scene.add(plane);
	
	hintBox();
}


function hintBox(text="") {			
	if(text != "") {
		text += "<br/><br/>"; 
	}
	$("#hint").html(text + "Ctrl + Q - resets the camera view<br/>Hold Down Right Mouse Button - Pan<br/>Scroll - Zoom In/Out<br/>");
}



//Loading a Graph in
function load() {
	var obj = JSON.parse(degstr);
	var nodeMap = [];
	var newId;
		
	for(var i = 0; i < obj.nodes.length; i++) {
		newId = GRAPHDRAWER.addNode({load: obj.nodes[i]});
		nodeMap[obj.nodes[i].id] = newId;
	}
		
	for(var i = 0; i < obj.edges.length; i++) {
		GRAPHDRAWER.addEdge({loading: {load: obj.edges[i], nodeMap: nodeMap}});
	}
							
	camera.zoom = obj.camera.getZoom();
	camera.position.set(obj.camera.getPosition());
}
	
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////                ~Actions~                                                              /////////////////////////////////////////////////////////
/////////////////////////// Anything that involves checking what the user has selected for an action goes here.   /////////////////////////////////////////////////////////
/////////////////////////// (Mouse detection)                                                                     /////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////	
function drawNode() {
	var intersects = raycaster.intersectObjects( scene.children );
	if ( intersects.length > 1 && INTERSECTED.userData == "Node" ) {
	} else {
		intersects = raycaster.intersectObject( plane );
		GRAPHDRAWER.addNode({position: intersects[0].point});
	}
}
function drawEdge() {
	var intersects = raycaster.intersectObjects( scene.children );
	if(INTERSECTED != null && INTERSECTED.userData == "Node") {
		if(SELECTED1 == null) {
			SELECTED1 = INTERSECTED.id;
		} else {
			SELECTED2 = INTERSECTED.id;
			
			if(SELECTED1 == SELECTED2) {
				SELECTED1 = SELECTED2 = null;
			} else {
				SELECTED1 = scene.getObjectById(SELECTED1, true);
				SELECTED2 = scene.getObjectById(SELECTED2, true);
				GRAPHDRAWER.addEdge({selections: [SELECTED1, SELECTED2]});
					
				SELECTED1 = SELECTED2 = null;
			}
		}
	} else {
		SELECTED1 = SELECTED2 = null;
	}
}
function deleteNode() {
	var intersects = raycaster.intersectObjects( scene.children );
	if(INTERSECTED != null && INTERSECTED.userData == "Node") {
		GRAPHDRAWER.removeNode(scene.getObjectById(INTERSECTED.id, true));
	}
}
function deleteEdge() {
	var intersects = raycaster.intersectObjects( scene.children );
	if(INTERSECTED != null && INTERSECTED.userData == "Node") {
		if(SELECTED1 == null) {
			SELECTED1 = INTERSECTED.id;
		} else {
			SELECTED2 = INTERSECTED.id;
				
			if(SELECTED1 == SELECTED2) {
				SELECTED1 = SELECTED2 = null;
			} else {							
				GRAPHDRAWER.removeEdge(SELECTED1, SELECTED2);
				SELECTED1 = SELECTED2 = null;
			}
		}
	} else {
		SELECTED1 = SELECTED2 = null;
	}
}
function moveEdge() {
	if(!cubeSelected) {
		var intersects = raycaster.intersectObjects( scene.children );
		
		if(INTERSECTED != null && INTERSECTED.userData == "Node") {
			if(SELECTED1 == null) {
				SELECTED1 = INTERSECTED.id;
			} else{
				SELECTED2 = INTERSECTED.id;
				
				if(SELECTED1 == SELECTED2) {
					SELECTED1 = SELECTED2 = null;
				} else {						
					SELECTEDEDGE = GRAPH.findEdge(SELECTED1, SELECTED2);
						
					if(SELECTEDEDGE != null) {
						
						if(cubesExist) {
							cancelConfirmation = 0;
							scene.remove(cube1);
							scene.remove(cube2);
							scene.remove(dashedLine1);
							scene.remove(dashedLine2);
							scene.remove(dashedLine3);
						}
					
						var cps = GRAPH.getControlPoints(SELECTEDEDGE);
						var object = scene.getObjectById(SELECTEDEDGE);
						var vertices = object.geometry.vertices;
							
						var geometry = new THREE.BoxBufferGeometry(CUBE_WIDTH, CUBE_WIDTH, 0.1);
						var material1 = new THREE.MeshLambertMaterial({color: 0xff0000});
						var material2 = new THREE.MeshLambertMaterial({color: 0xff0000});
						cube1 = new THREE.Mesh(geometry, material1);
						cube2 = new THREE.Mesh(geometry, material2);
						cube1.position.set(cps[0].x, cps[0].y, CUBE_LAYER);
						cube2.position.set(cps[1].x, cps[1].y, CUBE_LAYER);
						cube1.userData = "Manip";
						cube2.userData = "Manip";
							
						var materialLine1 = new THREE.LineDashedMaterial( {
							color: 0x000000,
							lineWidth: 1,
							scale: 1,
							dashSize: 1,
							gapSize: 1,
						} );
						var materialLine2 = new THREE.LineDashedMaterial( {
							color: 0x000000,
							lineWidth: 1,
							scale: 1,
							dashSize: 1,
							gapSize: 1,
						} );
						var materialLine3 = new THREE.LineDashedMaterial( {
							color: 0x000000,
							lineWidth: 1,
							scale: 1,
							dashSize: 1,
							gapSize: 1,
						} );
							
						var geometry1 = new THREE.Geometry();
						geometry1.vertices.push(
							new THREE.Vector3( vertices[0].x, vertices[0].y, vertices[0].z ),
							new THREE.Vector3( cube1.position.x, cube1.position.y, cube1.position.z )
						);
						geometry1.computeLineDistances();
						var geometry2 = new THREE.Geometry();
						geometry2.vertices.push(
							new THREE.Vector3( cube1.position.x, cube1.position.y, cube1.position.z ),
							new THREE.Vector3( cube2.position.x, cube2.position.y, cube2.position.z )
						);
						geometry2.computeLineDistances();
						var geometry3 = new THREE.Geometry();
						geometry3.vertices.push(
							new THREE.Vector3( cube2.position.x, cube2.position.y, cube2.position.z ),
							new THREE.Vector3( vertices[50].x, vertices[50].y, vertices[50].z )
						);
						geometry3.computeLineDistances();
							
						dashedLine1 = new THREE.Line(geometry1, materialLine1);
						dashedLine2 = new THREE.Line(geometry2, materialLine2);
						dashedLine3 = new THREE.Line(geometry3, materialLine3);
						
						scene.add(cube1);
						scene.add(cube2);
						scene.add(dashedLine1);
						scene.add(dashedLine2);
						scene.add(dashedLine3);
						cubesExist = true;
					}
					SELECTED1 = SELECTED2 = null;
				}
			}
		} else if (INTERSECTED != null && INTERSECTED.userData == "Manip") {
		} else {
			SELECTED1 = SELECTED2 = null;
			if(cubesExist) {
				cancelConfirmation++;
			}
		}
	} else {
		cubeSelected = false;
	}
}
function contractEdge() {
	var intersects = raycaster.intersectObjects( scene.children );
	if(INTERSECTED != null && INTERSECTED.userData == "Node") {
		if(SELECTED1 == null) {
			SELECTED1 = INTERSECTED.id;
		} else {
			SELECTED2 = INTERSECTED.id;
				
			if(SELECTED1 != SELECTED2 && GRAPH.findEdge(SELECTED1, SELECTED2) != null) {
				EDGECONTRACTION.main(SELECTED1, SELECTED2);
			} 
			SELECTED1 = SELECTED2 = null;
		}
	} else {
		SELECTED1 = SELECTED2 = null;
	}
}
function renameNode(x, y) {
	//Pop up input box on top
	//Upon submitting, place text in front of node
	var intersects = raycaster.intersectObjects( scene.children );
	if(INTERSECTED != null && INTERSECTED.userData == "Node") {
		setTimeout(function(){
			nodeName = true;
		}, 1000);
		
		//Corrects location of input
		if(y < $("canvas").height()/2) {
			$("#nodeNameInput").css("top", y);
		} 
		else {
			$("#nodeNameInput").css("top", y - $("#nodeNameInput").height());
		}
		
		if(x < $("canvas").width()/2) {
			$("#nodeNameInput").css("left", x);
		}
		else {
			$("#nodeNameInput").css("left", x - $("#nodeNameInput").width() - 15);
		}
		
		$("#nodeNameInput").show();
	}
}
function nameNode(name) {
	GRAPHDRAWER.nameNode(name);
}
//Naming Node
function popUpNameInput() {
	
}
	
	
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////                               ~Modes~                                                                     /////////////////////////////////////
///////////////////////////  Clean up of animation, reseting selections made by the user, changing the modes, changing the hint box,  /////////////////////////////////////
/////////////////////////// and performing graph functions should be done here.                                                       /////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////	
function drawNodeMode() {
	hintBox("Left Click - Add a node");
	mode = "drawNode";
	resetSelection();
	cleanUpAnimation();
	cleanUp()
}
function drawEdgeMode() {
	hintBox("Left click on two node to add an edge between them.");
	mode = "drawEdge";
	resetSelection();
	cleanUpAnimation();
	cleanUp()
}
function deleteNodeMode() {
	hintBox("Left click on a node to delete it.");
	mode = "deleteNode";
	resetSelection();
	cleanUpAnimation();
	cleanUp()
}
function deleteEdgeMode() {
	hintBox("Click on the two nodes the edges connects to delete it.");
	mode = "deleteEdge";
	resetSelection();
	cleanUpAnimation();
	cleanUp()
}
function moveNodeMode() {
	hintBox("Hold left mouse button on the node to drag it.");
	mode = "moveNode";
	resetSelection();
	cleanUpAnimation();
}
function moveEdgeMode() {
	hintBox("Left click on the two connected nodes to select the edge that you would like to manipulate.<br/>Drag the red squares that appear to manipulate the edge.");
	mode = "moveEdge";
	resetSelection();
	cleanUpAnimation();
	cleanUp()
}
function contractionMode() {
	hintBox("Select the two nodes to which the edge connects to contract it.");
	mode = "contractionMode";
	resetSelection();
	cleanUpAnimation();
	cleanUp()
}
function renameNodeMode() {
	mode = "renameNodeMode";
	resetSelection();
	cleanUpAnimation();
	cleanUp()
}
function complementAct() {
	mode = "complementMode";
	resetSelection();
	cleanUpAnimation();
	cleanUp()
	COMPLEMENT.main();
}
function clearGraphAct() {
	mode = "clearGraphMode";
	resetSelection();
	cleanUpAnimation();
	cleanUp()
	GRAPHDRAWER.clearGraph();
}
function printGraphAct() {
	mode = "printGraphMode";
	resetSelection();
	cleanUpAnimation();
	cleanUp()
	GRAPH.print();
}
function eulerianCycleMode() {
	mode = "eulerianCycleMode";
	resetSelection();
	cleanUpAnimation();
	cleanUp()
	console.log(EULERIANCYCLE.main());
}
	
//Resets selections
function resetSelection() {
	SELECTED1 = SELECTED2 = SELECTIONLIST = SELECTEDEDGE = null;

	if(cubesExist) {
		scene.remove(cube1);
		scene.remove(cube2);
		scene.remove(dashedLine1);
		scene.remove(dashedLine2);
		scene.remove(dashedLine3);
		cancelConfirmation = 0;
		cubesExist = false;
	}
}
//All functions that clean up animations,input forms, etc. for sepcific functions should go here. 
function cleanUpAnimation() {
	EULERIANCYCLE.resetArrows();
}
function cleanUp() {
	$("#nodeName").val("");
	$("#nodeNameInput").hide();
}



///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////                               ~Animator/Rednerer~                                                         /////////////////////////////////////
///////////////////////////  Functions called to animate and render go here. Also, anything that needs to be checked constantly go    /////////////////////////////////////
/////////////////////////// here, detecting where the mouse is to check for detection.                                                /////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function animate() {
	if(cancelConfirmation == 2) {
		scene.remove(cube1);
		scene.remove(cube2);
		scene.remove(dashedLine1);
		scene.remove(dashedLine2);
		scene.remove(dashedLine3);
		cancelConfirmation = 0;
		cubesExist = false;
	}

	controls.update();
		
	requestAnimationFrame(animate); 
	renderer.render(scene, camera);
	render();
}

function render() {
	//Detection and Highlighting (only applicable to object with the Lambert material (cubes and nodes))
	raycaster.setFromCamera( mouse, camera );
	var intersects = raycaster.intersectObjects( scene.children );
	if ( intersects.length > 0  && intersects[ 0 ].object.material.hasOwnProperty('emissive') && intersects[0].userData !== "text") {
		if ( INTERSECTED != intersects[ 0 ].object ) {
			if ( INTERSECTED ) INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );
			INTERSECTED = intersects[ 0 ].object;
			INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
			INTERSECTED.material.emissive.setHex( 0xff0000 );
		}
	} else {
		if ( INTERSECTED ) INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );
		INTERSECTED = null;
	}
}
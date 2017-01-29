var eulerianCycle = function(TIME_BT_FRAMES) {
	const ANIMATION_TIME = 2000;
	const ITERATIONS = ANIMATION_TIME/TIME_BT_FRAMES;
	const ARROW_COLOR = 0xff0000;
	const ARROW_LAYER = 0;
	const HEAD_LENGTH = 20;
	const HEAD_WIDTH = 10;
	var arrows = [];
	var actualIterations;
	
	var main = function() {
		var size;
		var matrix;
		var circuit; 
		
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
		
		circuit = hierholzerAlgorithm(matrix);
		
		for(var i = 0; i < circuit.length; i++) {
			circuit[i] = circuit[i].getId();
		}
		
		animationSetUp(circuit);
		
		return circuit;
	}
	
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
	
	var noOddDegrees = function() {
		for(var i = 0; i < GRAPH.nodes.length; i++) {
			if(GRAPH.nodes[i].getDegree() % 2 == 1) {
				return false;
			}
		}
		return true;
	}
	
	var allNonZeroDegreeConnected = function(matrix) {
		var bool = true;
		
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
	
	var hierholzerAlgorithm = function(matrix) {
		var circuit = [];
		var unusedEdges = {}; //id of node => # of unused edges
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
			
			//Rotates circuit until
			while(start != circuit[0]) {
				circuit = ciruit.push(circuit.shift());
			}
			circuit.push(last);
		}
	}
	
	var animationSetUp = function(circuit) {
		var iterationsPerEdge = ITERATIONS/(circuit.length - 1);
		var endPoints = [];
		var directionVectors = [];
		var finalLengths = [];
		
		for(var i = 0; i < circuit.length; i++) {
			endPoints.push(scene.getObjectById(circuit[i]).position);
		}
		for(var i = 0; i < endPoints.length - 1; i++) {
			finalLengths.push(new THREE.Vector3(endPoints[i + 1].x - endPoints[i].x, endPoints[i + 1].y - endPoints[i].y, 0));
			directionVectors.push(new THREE.Vector3(1,1,1));
			directionVectors[i].copy(finalLengths[i]);
			directionVectors[i].normalize();
			finalLengths[i] = Math.sqrt(Math.pow(finalLengths[i].x, 2) + Math.pow(finalLengths[i].y, 2));
		}
		
		iterationsPerEdge = Math.ceil(iterationsPerEdge);
		actualIterations = iterationsPerEdge * directionVectors.length;
		
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
	
	var animationComplete = function(endPoints, directionVectors, finalLengths) {
		
		for(var i = 0; i < directionVectors.length; i++) {
			scene.remove( arrows[i] );
			arrows[i] = new THREE.ArrowHelper( directionVectors[i], endPoints[i], finalLengths[i], ARROW_COLOR , HEAD_LENGTH, HEAD_LENGTH  );
			scene.add( arrows[i] );
		}
	}
	
	var numberOfArrows = function() {
		return arrows.length;
	}
	var resetArrows = function() {
		arrows = [];
	}
	
	return {
		numberOfArrows: numberOfArrows,
		resetArrows: resetArrows,
		main: main
	}
}
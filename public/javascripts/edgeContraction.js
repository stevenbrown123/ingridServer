/*Edge Contraction
	public methods:
		main - performs all the necessary animation and graph manipulation
*/
var edgeContraction = function(GRAPHDRAWER, TIME_BT_FRAMES) {
	const ANIMATION_TIME = 1500;
	const ITERATIONS = ANIMATION_TIME/TIME_BT_FRAMES;

	var main = function(n1, n2) {
		n1 = scene.getObjectById(n1);
		n2 = scene.getObjectById(n2);
		
		var pos1 = n1.position;
		var pos2 = n2.position;
		
		var distance = new THREE.Vector3(n2.position.x - n1.position.x, n2.position.y - n1.position.y, 0);
		var distance1 = new THREE.Vector3(distance.x/2, distance.y/2, 0);
		var distance2 = new THREE.Vector3(-distance.x/2, -distance.y/2, 0);
		
		var newLocation = new THREE.Vector3(n1.position.x + distance.x/2, n1.position.y + distance.y/2, NODE_LAYER);
		
		var travelSpeed1 = new THREE.Vector3(distance1.x/ITERATIONS, distance1.y/ITERATIONS, 0);
		var travelSpeed2 = new THREE.Vector3(distance2.x/ITERATIONS, distance2.y/ITERATIONS, 0);
		
		for(var i = 0; i < ITERATIONS; i++) {
			setTimeout( function() {
				
			animation( n1 , travelSpeed1 );
			animation( n2 , travelSpeed2 );

			}, TIME_BT_FRAMES*(i + 1) );
		}
		
		setTimeout( function() {
			
			completeAnimation( n1 , newLocation );
			completeAnimation( n2 , newLocation );
			updateGraph(n1, n2, newLocation);
			
		}, TIME_BT_FRAMES*(ITERATIONS + 1));
	}

	var animation = function(node, vector) {
		var deltaX = vector.x;
		var deltaY = vector.y;
					
		node.position.set(node.position.x + deltaX, node.position.y + deltaY, NODE_LAYER);
		
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
			GRAPH.setControlPoints(object.id, {x:controlPoints[0].x, y: controlPoints[0].y, z: EDGE_LAYER}, {x:controlPoints[1].x + deltaX, y: controlPoints[1].y + deltaY , z: EDGE_LAYER});
			}
			newPositions = curve.getPoints(50);								
								
			for(var j = 0; j < positions.length; j++) {
				object.geometry.vertices[j] = newPositions[j];
			}
			object.geometry.verticesNeedUpdate = true;
		}
	}

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

	var updateGraph = function(n1, n2, vector) {
		var newId;
		var edgeList;
		var temp;
		
		edgeList = GRAPH.findEdges(n1.id, true);
		temp = GRAPH.findEdges(n2.id, true);
		for(var i = 0; i < temp.length; i++) {
			edgeList.push(temp[i]);
		}
		
		GRAPHDRAWER.removeNode(n1);
		GRAPHDRAWER.removeNode(n2);
		
		newId = GRAPHDRAWER.addNode({position: vector});
		
		for(var i = 0; i < edgeList.length; i++) {
			if(edgeList[i][0] == n1.id || edgeList[i][0] == n2.id) {
				edgeList[i][0] = newId;
			}
			if(edgeList[i][1] == n1.id || edgeList[i][1] == n2.id) {
				edgeList[i][1] = newId;
			}
			
			GRAPHDRAWER.addEdge({selections: [scene.getObjectById(edgeList[i][0]), scene.getObjectById(edgeList[i][1])] });
		}
	}
	
	return {
		main: main
	};
}


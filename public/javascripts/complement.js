/*Edge Contraction
	public methods:
		main - performs all the necessary animation and graph manipulation
*/
var complement = function(GRAPHDRAWER, TIME_BT_FRAMES) {
	const ANIMATION_TIME = 1000;
	const ITERATIONS = ANIMATION_TIME/TIME_BT_FRAMES;
	
	var main = function() {
		var size = GRAPH.nodes.length;
		var matrix = setUpMatrix(size);
		
		for(var i = 0; i < size; i++) {
			for(var j = 0; j < size; j++) {
				if(!matrix[GRAPH.nodes[i].getId()][GRAPH.nodes[j].getId()]) {
					GRAPHDRAWER.addEdge({selections: [scene.getObjectById(GRAPH.nodes[i].getId()),scene.getObjectById(GRAPH.nodes[j].getId())], complement: true});
				}
			}
		}
		
		animationSetUp(matrix, size);
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

	var animation = function(matrix, size, iteration) {
		var obj;
		
		for(var i = 0; i < size; i++) {
			for(var j = 0; j < size; j++) {
				if(matrix[GRAPH.nodes[i].getId()][GRAPH.nodes[j].getId()] == null) {
					continue;
				}
				else if(!matrix[GRAPH.nodes[i].getId()][GRAPH.nodes[j].getId()]) {
					obj = scene.getObjectById(GRAPH.findEdge(GRAPH.nodes[i].getId(), GRAPH.nodes[j].getId()));
					obj.material.opacity = (iteration + 1)/ITERATIONS;
				}
				else {
					obj = scene.getObjectById(GRAPH.findEdge(GRAPH.nodes[i].getId(), GRAPH.nodes[j].getId()));
					obj.material.opacity = 1 - (iteration + 1)/ITERATIONS;
				}
			}
		}
	}

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
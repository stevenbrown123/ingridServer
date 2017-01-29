//Self loops and Multigraphs are disallowed
var Graph = function() {
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

	var Edge = function(id, node1, node2, controlPoint1, controlPoint2) {
		var endPoint1;
		var endPoint2
		
		var getId = function() {
			return id;
		}
		var getNode1 = function() {
			return node1;
		}
		var getNode2 = function() {
			return node2;
		}
		var getControlPoint1 = function() {
			return controlPoint1;
		}
		var getControlPoint2 = function() {
			return controlPoint2;
		}
		var getEndPoint1 = function() {
			return endPoint1;
		}
		var getEndPoint2 = function() {
			return endPoint1;
		}
		
		var setControlPoint1 = function(cp) {
			controlPoint1 = cp;
		}
		var setControlPoint2 = function(cp) {
			controlPoint2 = cp;
		}
		var setEndPoint1 = function(ep) {
			endPoint1 = ep;
		}
		var setEndPoint2 = function(ep) {
			endPoint2 = ep;
		}
		
		return {
			getId: getId,
			getNode1: getNode1,
			getNode2: getNode2,
			getControlPoint1: getControlPoint1,
			getControlPoint2: getControlPoint2,
			getEndPoint1: getEndPoint1,
			getEndPoint2: getEndPoint2,
			setControlPoint1: setControlPoint1,
			setControlPoint2: setControlPoint2,
			setEndPoint1: setEndPoint1,
			setEndPoint2: setEndPoint2,
		}
	}

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
			setPositon: setPosition,
			setZoom: setZoom
		};
	}

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
				
		//Only allows nodes with unique names (or with no names)
		var addNode = function(n, name=null, nameProvided=false) {
			
			nodes.push(Node(n));
			return true;
			
		};
		
		//Only one edge between two nodes
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
		
		//Removes nodes and corresponding edges. Returns list of Object Id's
		var removeNode = function(n, nameProvided=false) {
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
		
		//Removes edges. Returns a list of Object Id's
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
		
		//Find node
		var findNode = function(n) {
			for(var i = 0; i < nodes.length; i++) {
				if(nodes[i].getId() == n) {
					return nodes[i];
				}
			}
		}
		
		//Find edge for pair of nodes
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
		
		//Finds all edges for a node
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
		
		var getControlPoints = function(e) {
			for(var i = 0; i < edges.length; i++) {
				if(edges[i].getId() == e) {
					return [edges[i].getControlPoint1(), edges[i].getControlPoint2()];
				}
			}
		};
		
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
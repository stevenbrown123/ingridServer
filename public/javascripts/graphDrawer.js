/*Any manipulation of the graph should be done through these.
	Handles keeping what is displayed in sync with the graph data.
	Public Methods:
		addNode
		addEdge
		removeNode
		removeEdge
		clearGraph
*/
var graphDrawer = function() {
	/* 	options = {
			position,
			load
		}
		
	*/
	var addNode = function(options) {
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
			selections,		(actual objects in the scene representing the )
			loading = {
				load, 
				nodeMap
			},					 
			complement
		}
	*/		
		var curve;

		if(typeof options.selections !== "undefined") {
			curve = new THREE.CubicBezierCurve3(
				new THREE.Vector3( options.selections[0].position.x, options.selections[0].position.y, EDGE_LAYER ),
				new THREE.Vector3( options.selections[0].position.x, options.selections[0].position.y, EDGE_LAYER ),
				new THREE.Vector3( options.selections[1].position.x, options.selections[1].position.y, EDGE_LAYER),
				new THREE.Vector3( options.selections[1].position.x, options.selections[1].position.y, EDGE_LAYER)
			);
		} else {
			curve = new THREE.CubicBezierCurve3(
				new THREE.Vector3( options.loading.load.endPoint1.x, options.loading.load.endPoint1.y, options.loading.load.endPoint1.z ),
				new THREE.Vector3( options.loading.load.controlPoint1.x, options.loading.load.controlPoint1.y, options.loading.load.controlPoint1.z ),
				new THREE.Vector3( options.loading.load.controlPoint2.x, options.loading.load.controlPoint2.y, options.loading.load.controlPoint2.z ),
				new THREE.Vector3( options.loading.load.endPoint2.x, options.loading.load.endPoint2.y, options.loading.load.endPoint2.z)
			);
		}
		
		var material;
		
		if(typeof options.selections !== "undefined" && typeof options.complement === "undefined" ||
			typeof options.loading !== "undefined") {
			material = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true });
		}
		else {
			material = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 });
		}
		
		var geometry = new THREE.Geometry();
		geometry.vertices = curve.getPoints(50);
		var line = new THREE.Line( geometry, material );
		line.userData = "Edge";
		
		var bool = false;
		
		if(typeof options.selections != "undefined") {
			bool = GRAPH.addEdge(line.id, options.selections[0].id, options.selections[1].id, options.selections[0].position,  options.selections[1].position );
		} 
		else {
			var n1 = nodeMap[options.loading.load.node1];
			var n2 = nodeMap[options.loading.load.node2];
		
			bool = GRAPH.addEdge(line.id, n1, n2, options.loading.load.controlPoint1, options.loading.load.controlPoint2);
		}
		
		if(typeof options.loading == "undefined" && bool) {
			scene.add( line );
		}
		else if(typeof options.loading != "undefined" && bool) {
			scene.add( line );
		}
	}
	var removeNode = function(object) {
		var list = GRAPH.removeNode(object.id);
		removeObjects(list);
	}
	var removeEdge = function(sel1, sel2) {
		var list = GRAPH.removeEdge(sel1, sel2);
		removeObjects(list);
	}
	var clearGraph = function() {
		while(GRAPH.nodes.length > 0) {
			removeNode(scene.getObjectById(GRAPH.nodes[0].getId()));
		}
	}
	var removeObjects = function(list) {
		for(var i = 0; i < list.length; i++) {
			scene.remove(scene.getObjectById(list[i], true));
		}
	}
	
	return {
		addNode : addNode,
		addEdge : addEdge,
		removeNode : removeNode,
		removeEdge : removeEdge,
		clearGraph : clearGraph
	};
}


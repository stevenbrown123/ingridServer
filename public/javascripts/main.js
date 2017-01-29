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



//Graph
var GRAPH = Graph();
var GRAPHDRAWER = new graphDrawer();

//Graph Functions
var COMPLEMENT = complement(GRAPHDRAWER, TIME_BT_FRAMES);
var EDGECONTRACTION = edgeContraction(GRAPHDRAWER, TIME_BT_FRAMES);
var EULERIANCYCLE = eulerianCycle(TIME_BT_FRAMES);

$(document).ready(function(){

	init();
	animate();
	
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
	
	
	
	//Enables/Disables controls
	$("#renderer").mouseleave(function() {
		controls.enable = false;
	});
	$("#renderer").mouseenter(function() {
		controls.enable = true;
	});
		
		
		
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
	

	
	//Reseting the camera (Ctrl + Q)
	$(window).keydown(function (event) {
		if(event.which == 81 && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			controls.reset();
		}
	});
	
		
		
	//Renderer
	$("#renderer").click(function() {
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
			renameNode();
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
	
	
		
	//Submissions
	$("#submit-set").click(function() {
		var nodestr = $("#nodes").val();
		var edgestr = $("#edges").val();
		
		var result = parseSet(nodestr, edgestr);
		
		var msg = "";
		
		for(var i = 0; i < result.errorMsg.length; i++) {
			msg += result.errorMsg[i] + "<br/>";
		}
		
		hintBox(msg);
		
		if(result.createGraph) {
									
		}
	});
	$("#submit-seq").click(function() {
		var degstr = $("#degree-seq").val();
		
		
	});
	
	
	
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
		
		var json = JSON.stringify(GRAPH);
		
		//SOMETHING
	});
});

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
	
	controls = new THREE.OrbitControls(camera, renderer.domElement);
	controls.target = new THREE.Vector3(0,0,NODE_LAYER);
	controls.enableRotate = false;
		
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
	
	
	
//Actions
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
function renameNode() {
	
}

	
	
//Modes
function drawNodeMode() {
	hintBox("Left Click - Add a node");
	mode = "drawNode";
	resetSelection();
	cleanUpAnimation();
}
function drawEdgeMode() {
	hintBox("Left click on two node to add an edge between them.");
	mode = "drawEdge";
	resetSelection();
	cleanUpAnimation();
}
function deleteNodeMode() {
	hintBox("Left click on a node to delete it.");
	mode = "deleteNode";
	resetSelection();
	cleanUpAnimation();
}
function deleteEdgeMode() {
	hintBox("Click on the two nodes the edges connects to delete it.");
	mode = "deleteEdge";
	resetSelection();
	cleanUpAnimation();
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
}
function contractionMode() {
	mode = "contractionMode";
	resetSelection();
	cleanUpAnimation();
}
function renameNodeMode() {
	mode = "renameNodeMode";
	resetSelection();
	cleanUpAnimation();
}
function complementAct() {
	mode = "complementMode";
	resetSelection();
	cleanUpAnimation();
	COMPLEMENT.main();
}
function clearGraphAct() {
	mode = "clearGraphMode";
	resetSelection();
	cleanUpAnimation();
	GRAPHDRAWER.clearGraph();
}
function printGraphAct() {
	mode = "printGraphMode";
	resetSelection();
	cleanUpAnimation();
	GRAPH.print();
}
function renameNodeMode() {
	
}
function eulerianCycleMode() {
	mode = "eulerianCycleMode";
	resetSelection();
	cleanUpAnimation();
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
function cleanUpAnimation() {
	for(var i = 0; i < EULERIANCYCLE.numberOfArrows(); i++) {
		scene.remove(arrows[i]);
		console.log(i);
	}
	
	EULERIANCYCLE.resetArrows();
}



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
	if ( intersects.length > 0  && intersects[ 0 ].object.material.hasOwnProperty('emissive')) {
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
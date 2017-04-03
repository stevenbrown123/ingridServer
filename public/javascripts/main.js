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
var SELECTEDEDGE = null;
//Modes
var mode;
//Manipulation
var controls = null;
var offset = new THREE.Vector3();
var cancelConfirmation = 0;
//PDF
const CANVAS_WIDTH_PORTRAIT = 190;
const CANVAS_WIDTH_LANDSCAPE = 280;
//Coloring
const DEFAULT_COLOR = 0xf2f2f2;
const DEFAULT_EDGE_COLOR = 0x000000;			
//Animation
const TIME_BT_FRAMES = 1000/60;
//Shape Locations and Sizes
const NODE_LAYER = -200;
const LABEL_LAYER = NODE_LAYER + 1;
const EDGE_LAYER = NODE_LAYER - 1;
const ANIMATION_LAYER = EDGE_LAYER - .1;
const PLANE_LAYER = EDGE_LAYER;
const CUBE_LAYER = NODE_LAYER + .1;
const PLANE_SIZE = 10000;
const NODE_RADIUS = 15;
const CUBE_WIDTH = 5;
const EDGE_WIDTH = 15;
//Naming
var nodeToBeNamed = null;
var font;



//Just what kind of bullshit where Javascript has a set object, but does not implement set functions???
Set.prototype.difference = function(setB) {
    var difference = new Set(this);
    for (var elem of setB) {
        difference.delete(elem);
    }
    return difference;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////                               ~Utils~                                                                     /////////////////////////////////////
///////////////////////////  Handles anything that requires parallel processing to speed up the process.                              /////////////////////////////////////           
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////	
var utils = function() {
	var setUpMatrix = function() {
		var matrix = [];
		
		for(var i = 0; i < GRAPH.nodes.length; i++) {
			matrix[GRAPH.nodes[i].getId()] = [];
			
			for(var j = 0; j < GRAPH.nodes.length; j++) {
				matrix[GRAPH.nodes[i].getId()][GRAPH.nodes[j].getId()] = 
				(GRAPH.findEdge(GRAPH.nodes[i].getId(), GRAPH.nodes[j].getId()) != null);
			}
		}
		
		for(var i = 0; i < GRAPH.nodes.length; i++) {
			matrix[GRAPH.nodes[i].getId()][GRAPH.nodes[i].getId()] = null;
		}
		
		return matrix;
	}
	
	var setUpMatrixId = function() {
		var matrix = [];
		
		for(var i = 0; i < GRAPH.nodes.length; i++) {
			matrix[GRAPH.nodes[i].getId()] = [];
			
			for(var j = 0; j < GRAPH.nodes.length; j++) {
				matrix[GRAPH.nodes[i].getId()][GRAPH.nodes[j].getId()] = 
					GRAPH.findEdge(GRAPH.nodes[i].getId(), GRAPH.nodes[j].getId());
			}
		}
		
		for(var i = 0; i < GRAPH.nodes.length; i++) {
			matrix[GRAPH.nodes[i].getId()][GRAPH.nodes[i].getId()] = null;
		}
		
		return matrix;
	}
	
	var setUpEdgeMatrix = function() {
		var matrix = [];
		var nodesForEdge1 = null;
		var nodesForEdge2 = null;
		
		for(var i = 0; i < GRAPH.edges.length; i++) {
			matrix[GRAPH.edges[i].getId()] = [];
			nodesForEdge1 = GRAPH.getNodesForEdge(GRAPH.edges[i].getId());
			
			for(var j = 0; j < GRAPH.edges.length; j++) {
				if(i === j) {
					matrix[GRAPH.edges[i].getId()][GRAPH.edges[i].getId()] = false;
				}
				else {
					nodesForEdge2 = GRAPH.getNodesForEdge(GRAPH.edges[j].getId());
					
					if(nodesForEdge1[0] === nodesForEdge2[0]
					|| nodesForEdge1[0] === nodesForEdge2[1]
					|| nodesForEdge1[1] === nodesForEdge2[0]
					|| nodesForEdge1[1] === nodesForEdge2[1]) {
						matrix[GRAPH.edges[i].getId()][GRAPH.edges[j].getId()] = true;
					}
					else {
						matrix[GRAPH.edges[i].getId()][GRAPH.edges[j].getId()] = false;
					}
				}
			}
		}
		
		return matrix;
	}
	
	var createLabel = function(text, color='black') {
		var canvas = document.createElement('canvas');
		var g = canvas.getContext('2d');
		var fontsize = 128;		
		
		canvas.height = 115;
		canvas.width = 100;
		
		g.font = 'Bold ' + fontsize +'px Arial';
		g.fillStyle = color;
		g.textAlign = 'center';
		g.fillText(text, canvas.width/2, canvas.height);
		
		while(g.measureText(text).width > canvas.width) {
			g.clearRect(0, 0, canvas.width, canvas.height);
			
			fontsize = fontsize / 2;
			canvas.height = canvas.height/2;
			
			g.font = 'Bold ' + fontsize +'px Arial';
			g.textAlign = 'center';
			g.fillText(text, canvas.width/2, canvas.height);
		}
		
		var texture = new THREE.Texture(canvas) 
		texture.needsUpdate = true;
		texture.minFilter = THREE.LinearFilter;
		
		var myPlane = new THREE.Mesh(new THREE.PlaneGeometry(text.length*20, 20), new THREE.MeshBasicMaterial({transparent: true, map: texture}));
		myPlane.material.side = THREE.DoubleSide;
		myPlane.userData = "text";
		
		return myPlane;
	}
	
	return {
		setUpMatrix: setUpMatrix,
		setUpMatrixId: setUpMatrixId,
		setUpEdgeMatrix: setUpEdgeMatrix,
		createLabel: createLabel
	};
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////                               ~Web Worker Manager~                                                        /////////////////////////////////////
///////////////////////////  Handles anything that requires parallel processing to speed up the process.                              /////////////////////////////////////           
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////	
var webWorkerManager = function() {
	var maxWorkers = navigator.hardwareConcurrency || 4;
	
	var blobs = [];
	var workers = [];
	var jobCount = [];
	
	var interval = null;
	var dots = 0;
	const MAX_DOTS = 4;
	const DEC_COUNTER = 3.00;
	var worked = false;
	
	for(var i = 0; i < maxWorkers; i++) {
		jobCount[i] = 0;
		blobs.push(new Blob([
		  document.querySelector('#webWorker').textContent
		], { type: "text/javascript" }));
		workers.push(new Worker(window.URL.createObjectURL(blobs[i])));
		workers[i].onmessage = function(response) {
			workerComm(response);
		}
	}
	
	var workerComm = function(response) {
		var data = JSON.parse(response.data);
		worked = true;
		
		if(data.status === "Incomplete") {
			enlistWebWorker(JSON.stringify({type: data.type, context: data.context}));
		}
		else {
			if(data.type === "EC") {
				EULERIANCYCLE.checkNewSolution(data.context.circuit);
			}
			else if(data.type === "EP") {
				EULERIANPATH.checkNewSolution(data.context.circuit);
			}
			else if(data.type === "HC") {
				HAMILTONIANCYCLE.checkNewSolution(data.context.circuit);
			}
			else if(data.type === "HP") {
				HAMILTONIANPATH.addNewSolution(data.context.path);
			}
			else if(data.type === "GC") {
				GRAPHCOLOR.checkNewSolution(data.context.nodeColors);
			}
		}
	}
	
	var enlistWebWorker = function(message) {
		if(interval === null) {
			interval = setInterval(checkWorking, 250);
		}
		
		var assigned = leastOccupiedWorker();
		jobCount[assigned]++;
		worked = true;
		workers[assigned].postMessage(message);
	}
	
	var leastOccupiedWorker = function() {
		var x = Math.min.apply(null, jobCount);
		return jobCount.indexOf(x);
	}
	
	var restart = function() {
		for(var i = 0; i < workers.length; i++) {
			workers[i].terminate();
		}
		
		workers = [];
		blobs = [];
		
		doneWorking();
		clearInterval(interval);
		interval = null;
		worked = false;
		
		for(var i = 0; i < maxWorkers; i++) {
			jobCount[i] = 0;
			blobs.push(new Blob([
			  document.querySelector('#webWorker').textContent
			], { type: "text/javascript" }));
			workers.push(new Worker(window.URL.createObjectURL(blobs[i])));
			workers[i].onmessage = function(response) {
				workerComm(response);
			}
		}
	}
	
	var checkWorking = function() {
		if(worked === true) {
			worked = false;
			doWorking();
		}
		else {
			doneWorking();
			clearInterval(interval);
			interval = null;
			worked = false;
		}
	}
	
	var doWorking = function() {
		dots = (dots + 1) % MAX_DOTS;
		if(dots === 0){
			HINTBOX.setWorkingOnMessage("Still working");
		}
		else if(dots === 1) {
			HINTBOX.setWorkingOnMessage("Still working.");
		}
		else if(dots === 2) {
			HINTBOX.setWorkingOnMessage("Still working..");
		}
		else {
			HINTBOX.setWorkingOnMessage("Still working...");
		}
	}
	
	var doneWorking = function() {
		HINTBOX.setWorkingOnMessage("");
	}
	
	return {
		enlistWebWorker: enlistWebWorker,
		restart: restart
	};
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////                               ~Animation~                                                                  ////////////////////////////////////
///////////////////////////  Any function that deals with animation in general. Skipping, replaying, canceling, going on to the next  /////////////////////////////////////
/////////////////////////// solution for animation. Hiding and showing buttons that affect animation.                                 /////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////	
var animationControl = function() {
	const MARGIN = 20;
	const MAX_COLOR = 20;
	var colorNumber = 0;
	
	var colors = [ 0xff0000, 0x00ff00, 0x0000ff, 0xffe900, 0xff9900,
					0x9800ff, 0xff009d, 0x00faff, 0x00ffb6, 0x50ff00,
					0xffffff, 0xba9b71, 0x754317, 0x8b57e0, 0xceafff,
					0xf79688, 0xff6dc2, 0x8e5f00, 0x00ff33, 0xfc9cfa];
	
	var skipAnimation = function() {		
		if(mode === "complementMode") {
			COMPLEMENT.skipAnimation();
		}
		else if(mode === "edgeContractionMode") {
			EDGECONTRACTION.skipAnimation();
		}
		else if(mode === "eulerianCycleMode") {
			EULERIANCYCLE.skipAnimation();
		}
		else if(mode === "eulerianPathMode") {
			EULERIANPATH.skipAnimation();
		}
		else if(mode === "hamiltonianCycleMode") {
			HAMILTONIANCYCLE.skipAnimation();
		}
		else if(mode === "hamiltonianPathMode") {
			HAMILTONIANPATH.skipAnimation();
		}
	}
	var nextAnimation = function() {
		if(mode === "eulerianCycleMode") {
			EULERIANCYCLE.nextSolution();
		}
		else if(mode === "eulerianPathMode") {
			EULERIANPATH.nextSolution();
		}
		else if(mode === "hamiltonianCycleMode") {
			HAMILTONIANCYCLE.nextSolution();
		}
		else if(mode === "hamiltonianPathMode") {
			HAMILTONIANPATH.nextSolution();
		}
		else if(mode === "graphColorMode") {
			GRAPHCOLOR.nextSolution();
		}
	}
	var prevAnimation = function() {
		if(mode === "eulerianCycleMode") {
			EULERIANCYCLE.prevSolution();
		}
		else if(mode === "eulerianPathMode") {
			EULERIANPATH.prevSolution();
		}
		else if(mode === "hamiltonianCycleMode") {
			HAMILTONIANCYCLE.prevSolution();
		}
		else if(mode === "hamiltonianPathMode") {
			HAMILTONIANPATH.prevSolution();
		}
		else if(mode === "graphColorMode") {
			GRAPHCOLOR.prevSolution();
		}
	}
	var replayAnimation = function() {
		if(mode === "eulerianCycleMode") {
			EULERIANCYCLE.replaySolution();
		}
		else if(mode === "eulerianPathMode") {
			EULERIANPATH.replaySolution();
		}
		else if(mode === "hamiltonianCycleMode") {
			HAMILTONIANCYCLE.replaySolution();
		}
		else if(mode === "hamiltonianPathMode") {
			HAMILTONIANPATH.replaySolution();
		}
	}
	//Called when the user switches modes
	var cleanUpAnimation = function() {
		if(mode === "eulerianCycleMode") {
			EULERIANCYCLE.cleanUpAnimation();
		}
		else if(mode === "eulerianPathMode") {
			EULERIANPATH.cleanUpAnimation();
		}
		else if(mode === "hamiltonianCycleMode") {
			HAMILTONIANCYCLE.cleanUpAnimation();
		}
		else if(mode === "hamiltonianPathMode") {
			HAMILTONIANPATH.cleanUpAnimation();
		}
		else if(mode === "graphColorMode") {
			GRAPHCOLOR.decolorNodes();
		}
	}
	var showPreSelectButton = function() {
		$("#go").show();
	}
	var hidePreSelectButton = function() {
		$("#go").hide();
	}
	var showButtons = function() {
		$("#previous").show();
		$("#next").show();
		$("#replay").show();
		$("#skip").show();
		$("#solution-counter").show();
	}
	var showColorPicker = function() {
		$("#color-picker").show();
	}
	var hideColorPicker = function() {
		$("#color-picker").hide();
	}
	var nextColor = function() {
		colorNumber = (colorNumber + 1) % MAX_COLOR;
		updateColorCounter(colorNumber);
	}
	var go = function() {
		if(mode === "graphColorMode") {
			GRAPHCOLOR.main();
		}
		else if(mode === "hamiltonianPathMode") {
			HAMILTONIANPATH.main();
		}
		else if(mode === "hamiltonianCycleMode") {
			HAMILTONIANCYCLE.main();
		}
		else if(mode === "eulerianCycleMode") {
			EULERIANCYCLE.main();
		}
		else if(mode === "eulerianPathMode") {
			EULERIANPATH.main();
		}
	}	
	var prevColor = function() {
		colorNumber = colorNumber - 1;
		colorNumber = (colorNumber < 0) ? MAX_COLOR - 1 : colorNumber;
		updateColorCounter(colorNumber);
	}
	var updateColorCounter = function(num) {
		$("#color-counter").text("Color #" + (num+1) + ":");
		
		$("#custom").spectrum("set", toCorrectHexString((colors[colorNumber]).toString(16)));
	}
	var toCorrectHexString = function(color) {
		while(color.length < 6) {
			color = "0" + color;
		}
		
		return color;
	}
	
	var changeColor = function(color) {
		colors[colorNumber] = color;
		GRAPHCOLOR.clearSolutions();;
	}
	
	var hideButtons = function() {
		$("#previous").hide();
		$("#next").hide();
		$("#skip").hide();
		$("#replay").hide();
		$("#solution-counter").hide();
	}
	var swapButtons = function(bool) {
		if(bool === true) {
			$("#skip").show();
			$("#replay").hide();
		} 
		else {
			$("#skip").hide();
			$("#replay").show();
		}	
	}
	var buttonSetup = function() {
		$("#previous").appendTo("#renderer");
		$("#previous").css( "zIndex", 2 );
		$("#previous").css( "position", "absolute" );
		
		$("#replay").appendTo("#renderer");
		$("#replay").css( "zIndex", 2 );
		$("#replay").css( "position", "absolute" );
		
		$("#skip").appendTo("#renderer");
		$("#skip").css( "zIndex", 2 );
		$("#skip").css( "position", "absolute" );
		
		$("#skip").width($("#replay").width());
		$("#skip").height($("#skip").height());
		
		$("#next").appendTo("#renderer");
		$("#next").css( "zIndex", 2 );
		$("#next").css( "position", "absolute" );

		$("#solution-counter").appendTo("#renderer");
		$("#solution-counter").css( "zIndex", 2 );
		$("#solution-counter").css( "position", "absolute" );
		
		$("#color-picker").appendTo("#renderer");
		$("#color-picker").css( "zIndex", 2 );
		$("#color-picker").css( "position", "absolute" );
		
		$("#go").appendTo("#renderer");
		$("#go").css( "zIndex", 2 );
		$("#go").css( "position", "absolute" );
		
		$("#previous").hide();
		$("#replay").hide();
		$("#next").hide();
		$("#skip").hide();
		$("#solution-counter").hide();
		$("#color-picker").hide();
		$("#go").hide();
	}
	var positionButtons = function() {
		showButtons();
		showColorPicker();
		$("#previous").css("top", $("#renderer").height() - $("#previous").height()*2);
		$("#previous").css("left", MARGIN );
		
		$("#replay").css("top", $("#previous").position().top);
		$("#replay").css("left", $("#previous").position().left + $("#previous").width()*2 + MARGIN);
		
		$("#skip").css("top",$("#previous").position().top);
		$("#skip").css("left", $("#previous").position().left + $("#previous").width()*2 + MARGIN);
		
		$("#next").css("top", $("#previous").position().top);
		$("#next").css("left", $("#skip").position().left + $("#skip").width()*2 + MARGIN);
		
		$("#solution-counter").css("top", $("#previous").position().top);
		$("#solution-counter").css("left", $("#next").position().left + $("#next").width()*2 + MARGIN);
		
		$("#custom").spectrum({
			color: "#f00",
			change: function(color) {
				changeColor(parseInt((color.toHexString()).replace(/^#/, ''), 16));
			}
		});
		
		$("#color-picker").css("top",  $("#renderer").height() - $("#color-picker").height() - MARGIN);
		$("#color-picker").css("left", $("#renderer").width() - $("#color-picker").width() - MARGIN*2);
		
		$("#go").css( "top", $("#previous").position().top );
		$("#go").css( "left", $("#renderer").width() - $("#go").width() - MARGIN*2 );
		
		if(mode !== "eulerianCycleMode"
		&& mode !== "eulerianPathMode"
		&& mode !== "hamiltonianCycleMode"
		&& mode !== "hamiltonianPathMode"
		&& mode !== "graphColorMode") {
			hideButtons();
		}
		if(mode !== "graphColorMode") {
			hideColorPicker();
		}
		if(mode !== "hamiltonianPathMode"
		&& mode !== "hamiltonianCycleMode"
		&& mode !== "eulerianCycleMode"
		&& mode !== "eulerianPathMode") {
			hidePreSelectButton();
		}
	}	
	
	var updateCounter = function(num, length) {
		if(length === 0){
			$("#solution-counter").text("0 solutions");
		}
		else if(num === undefined) {
			$("#solution-counter").text("")
		}
		else {
			$("#solution-counter").text( (num+1) + " / " + length);
		}
	}
	
	var clearAllSolutions = function() {
		EULERIANCYCLE.clearSolutions();
		EULERIANPATH.clearSolutions();
		HAMILTONIANCYCLE.clearSolutions();
		HAMILTONIANPATH.clearSolutions();
		GRAPHCOLOR.clearSolutions();
	}
	
	return {
		colors: colors,
		
		go: go,
		nextAnimation: nextAnimation,
		prevAnimation: prevAnimation,
		replayAnimation: replayAnimation,
		skipAnimation: skipAnimation,
		cleanUpAnimation: cleanUpAnimation,
		showButtons: showButtons,
		hideButtons: hideButtons,
		showColorPicker: showColorPicker,
		hideColorPicker: hideColorPicker,
		showPreSelectButton: showPreSelectButton,
		hidePreSelectButton: hidePreSelectButton,
		prevColor: prevColor,
		nextColor: nextColor,
		swapButtons: swapButtons,
		buttonSetup: buttonSetup,
		positionButtons: positionButtons,
		updateCounter: updateCounter,
		clearAllSolutions: clearAllSolutions
	};
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////                This section deals with graph functions                        /////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////                               ~Hint Box~                                                                  /////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var hintBox = function() {
	var errorMessage = "";
	var workingOnMessage = "";
	var modeMessage = "";
	var formatMessage = "";
	const generalMessage = "Ctrl + Q - resets the camera view<br/>" +
		"Hold Down Right Mouse Button - Pan<br/>Scroll - Zoom In/Out<br/>";
	
	var setErrorMessage = function(str) {
		errorMessage = str;
		outPutMessage();
	}
	var setFormatMessage = function(str) {
		formatMessage =
		outPutMessage();
	}
	var setWorkingOnMessage = function(str) {
		workingOnMessage = str;
		outPutMessage();
	}
	var setModeMessage = function(str) {
		modeMessage = str;
		outPutMessage();
	}
	
	var outPutMessage =function() {
		$("#hint").html((errorMessage !== undefined && errorMessage.length !== 0 ? errorMessage + "<br/>" : "") + 
			(formatMessage !== undefined && formatMessage.length !== 0 ? formatMessage + "<br/>" : "") +
			(workingOnMessage !== undefined && workingOnMessage.length !== 0 ? workingOnMessage + "<br/>" : "") + 
			(modeMessage !== undefined && modeMessage.length !== 0 ? modeMessage + "<br/>" : "") + generalMessage);
	}
	
	return {
		setErrorMessage: setErrorMessage,
		setWorkingOnMessage: setWorkingOnMessage,
		setModeMessage: setModeMessage,
		setFormatMessage: setFormatMessage
	};
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////                               ~End Hint Box~                                                              /////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                              ~Complement~                             //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
/*	Complement

	Handles the Complement function and animations relating to it

	public methods:
		main - performs all the necessary animation and graph manipulation
		skipAnimation - called when user decides to do other stuff
*/
var complement = function() {
	const ANIMATION_TIME = 1000;
	const ITERATIONS = ANIMATION_TIME/TIME_BT_FRAMES;
	
	var doing = false;
	var timeouts = [];
	
	var matrix;
	var size;
	
	var main = function() {
		doing = true;
		size = GRAPH.nodes.length;
		matrix = setUpMatrix();
		
		//Adds the new edges to the old, all are needed for animation
		for(var i = 0; i < size; i++) {
			for(var j = 0; j < size; j++) {
				if(!matrix[GRAPH.nodes[i].getId()][GRAPH.nodes[j].getId()]) {
					GRAPHDRAWER.addEdge({selections: [scene.getObjectById(GRAPH.nodes[i].getId()),scene.getObjectById(GRAPH.nodes[j].getId())], complement: true});
				}
			}
		}
		
		animationSetUp();
	}
	//Adjancency matrix
	var setUpMatrix = function() {
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
	var animationSetUp = function() {
		for(var i = 0; i < ITERATIONS; i++) {
			
			(function(i) {
				timeouts.push(setTimeout( function() {
				
				animation( i );

				}, TIME_BT_FRAMES*(i + 1) ));
			})(i);
		}
		
		timeouts.push(setTimeout( function() {
				
			completeAnimation();

		}, ANIMATION_TIME ));
	}
	//Fades in/out for new/old edges
	var animation = function(iteration) {
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
	var completeAnimation = function() {
		if(doing === false) {
			return;
		}
		while(GRAPH.edges.length > 0) {
			GRAPHDRAWER.removeEdge(GRAPH.edges[0].getId());
		}
		
		for(var i = 0; i < size; i++) {
			for(var j = 0; j < size; j++) {
				if(!matrix[GRAPH.nodes[i].getId()][GRAPH.nodes[j].getId()]) {
					GRAPHDRAWER.addEdge({selections: [scene.getObjectById(GRAPH.nodes[i].getId()),scene.getObjectById(GRAPH.nodes[j].getId())]});
				}
			}
		}
		
		doing = false;
	}
	
	var skipAnimation = function() {
		for (var i = 0; i < timeouts.length; i++) {
			clearTimeout(timeouts[i]);
		}
		timeouts = [];
		
		completeAnimation();
	}
	
	return {
		main: main,
		skipAnimation: skipAnimation
	};
}
////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                             End Complement                            //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                          ~Edge Contraction~                           //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
/*	Edge Contraction

	Handles the Edge Contraction function and its animation
	
	public methods:
	main - performs all the necessary animation and graph manipulation
	skipAnimation - called when user decides to do other stuff
*/
var edgeContraction = function() {
	const ANIMATION_TIME = 1500;
	const ITERATIONS = ANIMATION_TIME/TIME_BT_FRAMES;
	
	var timeouts = [];
	var doing = false;
	
	var node1;
	var node2;

	var pos1;
	var pos2;
		
	var distance;
	var distance1;
	var distance2;
		
	var newLocation;
		
	var travelSpeed1;
	var travelSpeed2;

	//Visually outputs teh result
	var main = function(n1, n2) {
		doing = true;
		node1 = scene.getObjectById(n1);
		node2 = scene.getObjectById(n2);
		
		//Following determines the new location the new node,
		//how fast the nodes should move towards each other for animation for each frame
		pos1 = node1.position;
		pos2 = node2.position;
		
		distance = new THREE.Vector3(node2.position.x - node1.position.x, node2.position.y - node1.position.y, 0);
		distance1 = new THREE.Vector3(distance.x/2, distance.y/2, 0);
		distance2 = new THREE.Vector3(-distance.x/2, -distance.y/2, 0);
		
		newLocation = new THREE.Vector3(node1.position.x + distance.x/2, node1.position.y + distance.y/2, NODE_LAYER);
		
		travelSpeed1 = new THREE.Vector3(distance1.x/ITERATIONS, distance1.y/ITERATIONS, 0);
		travelSpeed2 = new THREE.Vector3(distance2.x/ITERATIONS, distance2.y/ITERATIONS, 0);
		
		animationSetUp();
	}
	
	var animationSetUp = function() {
		//Sets up the animation frames
		for(var i = 0; i < ITERATIONS; i++) {
			timeouts.push(setTimeout( function() {
				
			animation( node1 , travelSpeed1 );
			animation( node2 , travelSpeed2 );

			}, TIME_BT_FRAMES*(i + 1) ));
		}
		//Displays the final results
		timeouts.push(setTimeout( function() {
			
			completeAnimation( node1 , newLocation );
			completeAnimation( node2 , newLocation );
			updateGraph(node1, node2, newLocation);
			
		}, TIME_BT_FRAMES*(ITERATIONS + 1)));
	}

	//Moves the nodes and edges to the new location selected for the new node
	var animation = function(node, vector) {
		
		//New position for the node
		node.position.set(node.position.x + vector.x, node.position.y + vector.y, NODE_LAYER);
		
		GRAPHDRAWER.repositionEdges(node);
	}

	//Plops the the nodes and edges in correct location
	var completeAnimation = function(node, vector) {
		var deltaX = vector.x - node.position.x;
		var deltaY = vector.y - node.position.y;
		
		node.position.set(vector.x, vector.y, NODE_LAYER);
		
		GRAPHDRAWER.repositionEdges(node);
	}
	//Updates the actual graph
	var updateGraph = function(n1, n2, vector) {
		var newId;
		var edgeList;
		var temp;
		
		if(doing === false) {
			return;
		}
		
		doing = false;
		
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
		
		doing = false;
	}
	
	var skipAnimation = function() {
		if(doing === false) {
			return;
		}
		
		for (var i = 0; i < timeouts.length; i++) {
			clearTimeout(timeouts[i]);
		}
		timeouts = [];
		
		completeAnimation( node1 , newLocation );
		completeAnimation( node2 , newLocation );
		updateGraph(node1, node2, newLocation);
	}
	
	return {
		main: main,
		skipAnimation: skipAnimation
	};
}
////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                      End Edge Contraction                             //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                   ~Eulerian Cycle~                                    //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
/*	Eulerian Cycle

	Handles the Eularian Cycle function and deals with its animation
	Currently only visually outputs one cycle
	
	Public Methods:
	main - visually outputs the answer
	resetArrows - cleans up the drawing
*/
var eulerianCycle = function() {
	const ANIMATION_TIME = 2000;
	const ITERATIONS = ANIMATION_TIME/TIME_BT_FRAMES;//splits frames 
	const ARROW_COLOR = 0xff0000;
	const ARROW_LAYER = 0; //Keep at this value, it won't appear otherwise
	const HEAD_LENGTH = 20;
	const HEAD_WIDTH = 10;
	const ORDER_TEXT_COLOR = 'white';
	const ORDER_TEXT_DISTANCE_Y = 45;
	
	var doing = false;
	
	var timeout = [];	
	var solutions = [];
	var currSol = 0;
	var animationObjects = [];
	var orderTexts = [];
	var animationParameters = [];
	
	var preSelectList = [];
	var preSelectLabels =[];
	var preSelectNodeList = [];
	const PRESELECT_LABEL_COLOR = 'red';
	
	var actualIterations; //correction of ITERATIONS
	var matrix;
	
	var timeouts = [];//Animation that is still animating
	
	//Visually outputs answer
	var main = function() {
		if(solutions.length === 0) {
			
			ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
			
			//Checks all qualifiying criteria
			if(GRAPH.edges.length == 0) {
				return [];
			}	
			if(!noOddDegrees()) {
				return false;
			}
			
			matrix = UTILS.setUpMatrixId();
			
			if(!allNonZeroDegreeConnected()) {
				return false;
			}
			
			//The answer(s)
			//solutions.push(hierholzerAlgorithm());
			
			enlistWebWorkers();
		}
		else {
			animationSetUp();
			ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
		}
		
		return;
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
	var allNonZeroDegreeConnected = function() {
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
	var hierholzerAlgorithm = function() {
		var circuit = [];
		var unusedEdges = []; //"id of node" => # of unused edges
		var edgesVisited = new Set();
		var start;
		var last = 0;
				
		//Grabs first connected node as a start
		for(var i = 0; GRAPH.nodes.length; i++) {
			if(GRAPH.nodes[i].getDegree() != 0) {
				start = GRAPH.nodes[i].getId();
				circuit.push(start);
				break;
			}
		}
		
		enlistWebWorkers(circuit, unusedEdges, edgesVisited, start, last);
		
		while(true) {
			//Finds first adjacent node to continue path
			for(var i = 0; i < GRAPH.nodes.length; i++) {
				if(matrix[start][GRAPH.nodes[i].getId()] !== null && !circuit.includes(GRAPH.nodes[i].getId())) {
					circuit.push(GRAPH.nodes[i].getId());
					last = GRAPH.nodes[i].getId();
					unusedEdges[start] = unusedEdges[start] === undefined || unusedEdges[start] === 
						null ? GRAPH.findNode(start).getDegree() - 1 : unusedEdges[start] - 1;
					unusedEdges[last] = unusedEdges[last] === undefined || unusedEdges[last] === 
						null ? GRAPH.findNode(last).getDegree() - 1 : unusedEdges[last] - 1;
					edgesVisited.add(GRAPH.findEdge(start, last));
					break;
				}
			}
			
			//Builds path until start node is encountered
			while(start !== last) {
				//Chooses next node, checks if the start is encountered or not
				for(var i = 0; i < GRAPH.nodes.length; i++) {
					if(matrix[last][GRAPH.nodes[i].getId()] !== null && start === GRAPH.nodes[i].getId() && !edgesVisited.has(GRAPH.findEdge(last, GRAPH.nodes[i].getId()))) {
						edgesVisited.add(GRAPH.findEdge(last, GRAPH.nodes[i].getId()));
						last = start;
						unusedEdges[circuit[circuit.length - 1]]--;
						unusedEdges[start]--;
						break;
					}
					else if(matrix[last][GRAPH.nodes[i].getId()] !== null && !edgesVisited.has(GRAPH.findEdge(last, GRAPH.nodes[i].getId()))) {
						edgesVisited.add(GRAPH.findEdge(last, GRAPH.nodes[i].getId()));
						last = GRAPH.nodes[i].getId();
						circuit.push(last);
						unusedEdges[last] = unusedEdges[last] === undefined || unusedEdges[last] ===
							null ? GRAPH.findNode(last).getDegree() - 1 : unusedEdges[last] - 1;
						unusedEdges[circuit[circuit.length - 2]]--;
						break;
					}
				}
			}
			
			start = null;
			
			//Finds first node with unused edges
			for(var i = 0; i < GRAPH.nodes.length; i++) {
				if((unusedEdges[GRAPH.nodes[i].getId()] !== undefined || 
					unusedEdges[GRAPH.nodes[i].getId()] !== null) &&
					unusedEdges[GRAPH.nodes[i].getId()] !== 0) {
					start = last = GRAPH.nodes[i].getId();
					break;
				}
			};
			
			//This is the eulerian circuit
			if(start == null) {
				circuit.push(last);
				return circuit;
			}
			
			//Rotates circuit for the new starting node
			while(start !== circuit[0]) {
				circuit.push(circuit.shift());
			}
			circuit.push(last);
		}
	}
	
	var enlistWebWorkers = function() {
		var start;
		var last;
		var unusedEdges = [];
		
		var nodesForEdge = null;
		
		if(preSelectNodeList.length !== 0) {
			start = preSelectNodeList[0];
			last = preSelectNodeList[preSelectNodeList.length - 1];
		}
		else {
			start = GRAPH.nodes[0].getId();
			last = GRAPH.nodes[0].getId();
		}
		
		for(var i = 0; i < preSelectList.length; i++) {
			nodesForEdge = GRAPH.getNodesForEdge(preSelectList[i]);
			
			unusedEdges[nodesForEdge[0]] = unusedEdges[nodesForEdge[0]] === undefined || 
				unusedEdges[nodesForEdge[0]] === null ? GRAPH.findNode(nodesForEdge[0]).getDegree() - 1 : 
				unusedEdges[nodesForEdge[0]] - 1;
			unusedEdges[nodesForEdge[1]] = unusedEdges[nodesForEdge[1]] === undefined || 
				unusedEdges[nodesForEdge[1]] === null ? GRAPH.findNode(nodesForEdge[1]).getDegree() - 1 : 
				unusedEdges[nodesForEdge[1]] - 1;
		}
		
		WEBWORKERMANAGER.enlistWebWorker(JSON.stringify({
			type: "EC",
			context: {
				circuit: preSelectNodeList,
				edgesVisited: preSelectList,
				unusedEdges: unusedEdges,
				start: start,
				last: last,
				matrix: matrix,
				GRAPH: GRAPH.toStringJ()
			}
		}));
	}
	
	var createOrderTextBoxes = function(solution) {
		var obj;
		var orderPlane;
		
		console.log(solution)
		
		for(var i = 0; i < solution.length; i++) {
			orderPlane = UTILS.createLabel(i.toString(), ORDER_TEXT_COLOR);
			obj = scene.getObjectById(solution[i]);
			
			orderPlane.position.set(obj.position.x, obj.position.y + ORDER_TEXT_DISTANCE_Y, LABEL_LAYER);
			scene.add(orderPlane);
			orderTexts.push(orderPlane);
		}
	}
	
	var checkNewSolution = function(newSolution) {
		clearPreselect();
		
		for(var i = 0; i < solutions.length; i++) {
			if(rotateSolutionCheck(newSolution, solutions[i])) {
				return;
			}
		}		
		
		solutions.push(newSolution);
		ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
	}
	
	var rotateSolutionCheck = function(newSolution, solution) {
		for(var i = 0; i < newSolution.length - 1; i++) {
			newSolution.shift();
			newSolution.push(newSolution[0]);
			
			if(matchSolutions(newSolution, solution)) {
				return true;
			}
		}
		
		return false;
	}
	
	var matchSolutions = function(newSolution, solution) {
		for(var i = 0; i < newSolution.length; i++) {
			if(newSolution[i] !== solution[i]) {
				return false;
			}
		}
		return true;
	}
	
	//Animation where the arrows are drawn out incrementally starting with the first edge to the last in the circuit
	var animationSetUp = function() {
		if(solutions.length === 0) {
			return;
		}
		
		ANIMATIONCONTROL.swapButtons(true);
		
		var circuit = [];
		for(var i = 0; i < solutions[currSol].length; i++) {
			circuit.push(solutions[currSol][i]);
		}
		
		createOrderTextBoxes(solutions[currSol]);
		
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
		
		animationParameters[currSol] = {endPoints: endPoints,
			directionVectors: directionVectors,
			finalLengths: finalLengths};
		
		//Set up for animation
		for(var i = 0; i < actualIterations; i++) {
			
			timeouts.push((function(i) {
				setTimeout(function() {
	
				animation(endPoints[Math.floor(i/iterationsPerEdge)], 
				directionVectors[Math.floor(i/iterationsPerEdge)], 
				finalLengths[Math.floor(i/iterationsPerEdge)] * (i % iterationsPerEdge / iterationsPerEdge),
				Math.floor(i/iterationsPerEdge));
			
				}, (i + 1)*TIME_BT_FRAMES);
			})(i));
		}
		
		timeouts.push(setTimeout(function() {
			
			animationComplete(endPoints, directionVectors, finalLengths);
			
		}, (actualIterations + 1)*TIME_BT_FRAMES ));
	}
	//Draws the arrows incrementally, and replaces an old arrow when appropriate
	var animation = function(orig, dir, length, i) {
		if(animationObjects[i] === undefined) {
			animationObjects[i] = new THREE.ArrowHelper( dir, orig, length, ARROW_COLOR , HEAD_LENGTH, HEAD_LENGTH  )
			scene.add( animationObjects[i] )
		}
		else {
			scene.remove( animationObjects[i] );
			animationObjects[i] = new THREE.ArrowHelper( dir, orig, length, ARROW_COLOR , HEAD_LENGTH, HEAD_LENGTH  )
			scene.add( animationObjects[i] )
		}
	}
	//Final visual
	var animationComplete = function(endPoints, directionVectors, finalLengths) {
		
		for(var i = 0; i < directionVectors.length; i++) {
			scene.remove( animationObjects[i] );
			animationObjects[i] = new THREE.ArrowHelper( directionVectors[i], endPoints[i], finalLengths[i], ARROW_COLOR , HEAD_LENGTH, HEAD_LENGTH  );
			scene.add( animationObjects[i] );
		}
		ANIMATIONCONTROL.swapButtons(false);
	}
	//Skip the animation
	var skipAnimation = function() {
		for(var i = 0; i < timeouts.length; i++) {
			clearTimeout(timeouts[i]);
		}
		timeouts = [];
		cleanUpAnimation();
		
		if(solutions.length !== 0) {
			animationComplete(animationParameters[currSol].endPoints,
			animationParameters[currSol].directionVectors,
			animationParameters[currSol].finalLengths);
		}
	}
	//Clear the animation
	var cleanUpAnimation = function(){
		clearPreselect();
		for(var i = 0; i < animationObjects.length; i++) {
			scene.remove(animationObjects[i]);
		}
		for(var i = 0; i < orderTexts.length; i++) {
			scene.remove(orderTexts[i]);
		}
		animationObjects = [];
		orderTexts = [];
	}
	var clearSolutions = function() {
		currSol = 0;
		solutions = [];
	}
	
	var nextSolution = function() {
		if(solutions.length === 0) {
			return;
		}
		
		cleanUpAnimation();
		currSol = (currSol + 1)%solutions.length;
		animationSetUp();
		ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
	}
	var prevSolution = function() {
		if(solutions.length === 0) {
			return;
		}
		
		cleanUpAnimation();
		currSol = ((currSol - 1 >= 0)? currSol - 1 : solutions.length - 1)%solutions.length;
		animationSetUp();
		ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
	}
	var replaySolution = function() {
		if(solutions.length === 0) {
			return;
		}
		
		cleanUpAnimation();
		animationSetUp();
	}
	
	var preselect = function(id) {
		var myLabel;
		var obj;
		var index;
		var objToRemove;
		
		console.log(id);
		
		//Deconstruct the last part of the path
		if(preSelectList.includes(id)) {
			index = preSelectList.indexOf(id);
			
			for(var i = index; i <preSelectList.length;) {
				preSelectList.splice(index, 1);
			}
			
			for(var i = index; i < preSelectLabels.length; ) {
				scene.remove(preSelectLabels[i]);
				preSelectLabels.splice(i, 1);
			}
			
			if(preSelectList.length === 0) {
				preSelectNodeList = [];
			}
			else {
				for(var i = preSelectList.length + 1; i < preSelectNodeList.length; ) {
					preSelectNodeList.splice(i, 1);
				}
			}
		}
		else {
			if(!validateSelection(id)) {
				HINTBOX.setErrorMessage("The edge you selected is invalid.");
				return;
			}
			
			HINTBOX.setErrorMessage("");
			
			preSelectList.push(id);
			
			myLabel = UTILS.createLabel(preSelectList.length.toString(), PRESELECT_LABEL_COLOR);
			obj = scene.getObjectById(id);
			
			myLabel.position.set(obj.position.x, obj.position.y, LABEL_LAYER);
			
			preSelectLabels.push(myLabel);
			scene.add(myLabel);
		}
		
		WEBWORKERMANAGER.restart();
		ANIMATIONCONTROL.updateCounter();
		clearSolutions();
	}
	
	var clearPreselect = function() {
		for(var i = 0; i < preSelectList.length; ) {
			scene.remove(preSelectLabels[i]);
			preSelectLabels.splice(i, 1);
			preSelectList.splice(i, 1);
		}
		preSelectNodeList = [];
	}
	
	var validateSelection = function(id) {
		var nodesForEdge1 = null;
		var nodesForEdge2 = null;
		var targetNode = null;
		
		if(preSelectList.length === 0) {
			nodesForEdge1 = GRAPH.getNodesForEdge(id);
			preSelectNodeList = [nodesForEdge1[0], nodesForEdge1[1]];
			return true;
		}
		if(preSelectList.length === 1) {
			nodesForEdge1 = GRAPH.getNodesForEdge(preSelectList[0]);
			nodesForEdge2 = GRAPH.getNodesForEdge(id);
			
			if(nodesForEdge1[0] === nodesForEdge2[0]) {
				preSelectNodeList = [nodesForEdge1[1], nodesForEdge1[0], nodesForEdge2[1]];
				return true;
			}
			if(nodesForEdge1[0] === nodesForEdge2[1]) {
				preSelectNodeList = [nodesForEdge1[1], nodesForEdge1[0], nodesForEdge2[0]];
				return true;
			}
			if(nodesForEdge1[1] === nodesForEdge2[0]) {
				preSelectNodeList = [nodesForEdge1[0], nodesForEdge1[1], nodesForEdge2[1]];
				return true;
			}
			if(nodesForEdge1[1] === nodesForEdge2[1]) {
				preSelectNodeList = [nodesForEdge1[0], nodesForEdge1[1], nodesForEdge2[0]];
				return true;
			}
			
			return false;
		}
		
		nodesForEdge1 = GRAPH.getNodesForEdge(preSelectList[preSelectList.length - 1]);
		nodesForEdge2 = GRAPH.getNodesForEdge(preSelectList[preSelectList.length - 2]);
		
		if(nodesForEdge1[0] === nodesForEdge2[0] ||
		nodesForEdge1[0] === nodesForEdge2[1]) {
			targetNode = nodesForEdge1[1];
		}
		else {
			targetNode = nodesForEdge1[0];
		}
		
		nodesForEdge2 = GRAPH.getNodesForEdge(id);
		
		if(targetNode === nodesForEdge2[0]) {
			preSelectNodeList.push(nodesForEdge2[1]);
			return true;
		}
		if(targetNode === nodesForEdge2[1]) {
			preSelectNodeList.push(nodesForEdge2[0]);
			return true;
		}
		
		return false;
	}
	
	return {
		solutions: solutions,
		currSol: currSol,
		
		doing: doing,
		main: main,
		skipAnimation: skipAnimation,
		cleanUpAnimation: cleanUpAnimation,
		nextSolution: nextSolution,
		prevSolution: prevSolution,
		replaySolution: replaySolution,
		checkNewSolution: checkNewSolution,
		clearSolutions: clearSolutions,
		preselect: preselect
	}
}
////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                  End Eulerian Cycle                                   //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                   ~Eulerian Path ~                                    //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
/*	Eulerian Cycle

	Handles the Eularian Cycle function and deals with its animation
	Currently only visually outputs one cycle
	
	Public Methods:
	main - visually outputs the answer
	resetArrows - cleans up the drawing
*/
var eulerianPath = function() {
	const ANIMATION_TIME = 2000;
	const ITERATIONS = ANIMATION_TIME/TIME_BT_FRAMES;//splits frames 
	const ARROW_COLOR = 0xff0000;
	const ARROW_LAYER = 0; //Keep at this value, it won't appear otherwise
	const HEAD_LENGTH = 20;
	const HEAD_WIDTH = 10;
	const ORDER_TEXT_COLOR = 'white';
	const ORDER_TEXT_DISTANCE_Y = 45;
	
	var doing = false;
	
	var timeout = [];	
	var solutions = [];
	var currSol = 0;
	var animationObjects = [];
	var orderTexts = [];
	var animationParameters = [];
	
	var preSelectList = [];
	var preSelectLabels =[];
	var preSelectNodeList = [];
	const PRESELECT_LABEL_COLOR = 'red';
	
	var actualIterations; //correction of ITERATIONS
	var matrix;
	var matrixE;
	
	var timeouts = [];//Animation that is still animating
	
	//Visually outputs answer
	var main = function() {
		if(solutions.length === 0) {
			
			ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
			
			//Checks all qualifiying criteria
			if(GRAPH.edges.length == 0) {
				return [];
			}	
			if(!twoOrZeroOddDegrees()) {
				return false;
			}
			
			matrix = UTILS.setUpMatrixId();
			matrixE = UTILS.setUpEdgeMatrix();
			
			if(!allNonZeroDegreeConnected()) {
				return false;
			}
			
			enlistWebWorkers();
		}
		else {
			animationSetUp();
			ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
		}
		
		return;
	}
	
	//Criteria for eularian path
	var twoOrZeroOddDegrees = function() {
		var count = 0;
		
		for(var i = 0; i < GRAPH.nodes.length; i++) {
			if(GRAPH.nodes[i].getDegree() % 2 == 1) {
				count++;
			}
		}
		return count === 0 || count === 2;
	}
	//Criteria for eularian cycle
	var allNonZeroDegreeConnected = function() {
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
	
	var enlistWebWorkers = function() {
	
		WEBWORKERMANAGER.enlistWebWorker(JSON.stringify({
			type: "EP",
			context: {
				path: preSelectList,
				matrix: matrixE,
				GRAPH: GRAPH.toStringJ()
			}
		}));
	}
	
	var createOrderTextBoxes = function(solution) {
		var obj;
		var orderPlane;
		
		console.log(solution)
		
		for(var i = 0; i < solution.length; i++) {
			orderPlane = UTILS.createLabel(i.toString(), ORDER_TEXT_COLOR);
			obj = scene.getObjectById(solution[i]);
			
			orderPlane.position.set(obj.position.x, obj.position.y + ORDER_TEXT_DISTANCE_Y, LABEL_LAYER);
			scene.add(orderPlane);
			orderTexts.push(orderPlane);
		}
	}
	
	var checkNewSolution = function(newSolution) {
		clearPreselect();
		
		for(var i = 0; i < solutions.length; i++) {
			if(rotateSolutionCheck(newSolution, solutions[i])) {
				return;
			}
		}		
		
		solutions.push(newSolution);
		ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
	}
	
	var rotateSolutionCheck = function(newSolution, solution) {
		for(var i = 0; i < newSolution.length - 1; i++) {
			newSolution.shift();
			newSolution.push(newSolution[0]);
			
			if(matchSolutions(newSolution, solution)) {
				return true;
			}
		}
		
		return false;
	}
	
	var matchSolutions = function(newSolution, solution) {
		for(var i = 0; i < newSolution.length; i++) {
			if(newSolution[i] !== solution[i]) {
				return false;
			}
		}
		return true;
	}
	
	//Animation where the arrows are drawn out incrementally starting with the first edge to the last in the circuit
	var animationSetUp = function() {
		if(solutions.length === 0) {
			return;
		}
		
		ANIMATIONCONTROL.swapButtons(true);
		
		var circuit = [];
		for(var i = 0; i < solutions[currSol].length; i++) {
			circuit.push(solutions[currSol][i]);
		}
		
		createOrderTextBoxes(solutions[currSol]);
		
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
		
		animationParameters[currSol] = {endPoints: endPoints,
			directionVectors: directionVectors,
			finalLengths: finalLengths};
		
		//Set up for animation
		for(var i = 0; i < actualIterations; i++) {
			
			timeouts.push((function(i) {
				setTimeout(function() {
	
				animation(endPoints[Math.floor(i/iterationsPerEdge)], 
				directionVectors[Math.floor(i/iterationsPerEdge)], 
				finalLengths[Math.floor(i/iterationsPerEdge)] * (i % iterationsPerEdge / iterationsPerEdge),
				Math.floor(i/iterationsPerEdge));
			
				}, (i + 1)*TIME_BT_FRAMES);
			})(i));
		}
		
		timeouts.push(setTimeout(function() {
			
			animationComplete(endPoints, directionVectors, finalLengths);
			
		}, (actualIterations + 1)*TIME_BT_FRAMES ));
	}
	//Draws the arrows incrementally, and replaces an old arrow when appropriate
	var animation = function(orig, dir, length, i) {
		if(animationObjects[i] === undefined) {
			animationObjects[i] = new THREE.ArrowHelper( dir, orig, length, ARROW_COLOR , HEAD_LENGTH, HEAD_LENGTH  )
			scene.add( animationObjects[i] )
		}
		else {
			scene.remove( animationObjects[i] );
			animationObjects[i] = new THREE.ArrowHelper( dir, orig, length, ARROW_COLOR , HEAD_LENGTH, HEAD_LENGTH  )
			scene.add( animationObjects[i] )
		}
	}
	//Final visual
	var animationComplete = function(endPoints, directionVectors, finalLengths) {
		
		for(var i = 0; i < directionVectors.length; i++) {
			scene.remove( animationObjects[i] );
			animationObjects[i] = new THREE.ArrowHelper( directionVectors[i], endPoints[i], finalLengths[i], ARROW_COLOR , HEAD_LENGTH, HEAD_LENGTH  );
			scene.add( animationObjects[i] );
		}
		ANIMATIONCONTROL.swapButtons(false);
	}
	//Skip the animation
	var skipAnimation = function() {
		for(var i = 0; i < timeouts.length; i++) {
			clearTimeout(timeouts[i]);
		}
		timeouts = [];
		cleanUpAnimation();
		
		if(solutions.length !== 0) {
			animationComplete(animationParameters[currSol].endPoints,
			animationParameters[currSol].directionVectors,
			animationParameters[currSol].finalLengths);
		}
	}
	//Clear the animation
	var cleanUpAnimation = function(){
		clearPreselect();
		for(var i = 0; i < animationObjects.length; i++) {
			scene.remove(animationObjects[i]);
		}
		for(var i = 0; i < orderTexts.length; i++) {
			scene.remove(orderTexts[i]);
		}
		animationObjects = [];
		orderTexts = [];
	}
	var clearSolutions = function() {
		currSol = 0;
		solutions = [];
	}
	
	var nextSolution = function() {
		if(solutions.length === 0) {
			return;
		}
		
		cleanUpAnimation();
		currSol = (currSol + 1)%solutions.length;
		animationSetUp();
		ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
	}
	var prevSolution = function() {
		if(solutions.length === 0) {
			return;
		}
		
		cleanUpAnimation();
		currSol = ((currSol - 1 >= 0)? currSol - 1 : solutions.length - 1)%solutions.length;
		animationSetUp();
		ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
	}
	var replaySolution = function() {
		if(solutions.length === 0) {
			return;
		}
		
		cleanUpAnimation();
		animationSetUp();
	}
	
	var preselect = function(id) {
		var myLabel;
		var obj;
		var index;
		var objToRemove;
		
		//Deconstruct the last part of the path
		if(preSelectList.includes(id)) {
			index = preSelectList.indexOf(id);
			
			for(var i = index; i <preSelectList.length;) {
				preSelectList.splice(index, 1);
			}
			
			for(var i = index; i < preSelectLabels.length; ) {
				scene.remove(preSelectLabels[i]);
				preSelectLabels.splice(i, 1);
			}
			
			if(preSelectList.length === 0) {
				preSelectNodeList = [];
			}
			else {
				for(var i = preSelectList.length + 1; i < preSelectNodeList.length; ) {
					preSelectNodeList.splice(i, 1);
				}
			}
		}
		else {
			if(!validateSelection(id)) {
				HINTBOX.setErrorMessage("The edge you selected is invalid.");
				return;
			}
			
			HINTBOX.setErrorMessage("");
			
			preSelectList.push(id);
			
			myLabel = UTILS.createLabel(preSelectList.length.toString(), PRESELECT_LABEL_COLOR);
			obj = scene.getObjectById(id);
			
			myLabel.position.set(obj.position.x, obj.position.y, LABEL_LAYER);
			
			preSelectLabels.push(myLabel);
			scene.add(myLabel);
		}
		
		WEBWORKERMANAGER.restart();
		ANIMATIONCONTROL.updateCounter();
		clearSolutions();
	}
	
	var clearPreselect = function() {
		for(var i = 0; i < preSelectList.length; ) {
			scene.remove(preSelectLabels[i]);
			preSelectLabels.splice(i, 1);
			preSelectList.splice(i, 1);
		}
	}
	
	var validateSelection = function(id) {
		var nodesForEdge1 = null;
		var nodesForEdge2 = null;
		var targetNode = null;
		
		if(preSelectList.length === 0) {
			nodesForEdge1 = GRAPH.getNodesForEdge(id);
			preSelectNodeList = [nodesForEdge1[0], nodesForEdge1[1]];
			return true;
		}
		if(preSelectList.length === 1) {
			nodesForEdge1 = GRAPH.getNodesForEdge(preSelectList[0]);
			nodesForEdge2 = GRAPH.getNodesForEdge(id);
			
			if(nodesForEdge1[0] === nodesForEdge2[0]
			|| nodesForEdge1[0] === nodesForEdge2[1]
			|| nodesForEdge1[1] === nodesForEdge2[0]
			|| nodesForEdge1[1] === nodesForEdge2[1]) {
				return true;
			}
			
			return false;
		}
		
		nodesForEdge1 = GRAPH.getNodesForEdge(preSelectList[preSelectList.length - 1]);
		nodesForEdge2 = GRAPH.getNodesForEdge(preSelectList[preSelectList.length - 2]);
		
		if(nodesForEdge1[0] === nodesForEdge2[0] ||
		nodesForEdge1[0] === nodesForEdge2[1]) {
			targetNode = nodesForEdge1[1];
		}
		else {
			targetNode = nodesForEdge1[0];
		}
		
		nodesForEdge2 = GRAPH.getNodesForEdge(id);
		
		if(targetNode === nodesForEdge2[0]) {
			preSelectNodeList.push(nodesForEdge2[1]);
			return true;
		}
		if(targetNode === nodesForEdge2[1]) {
			preSelectNodeList.push(nodesForEdge2[0]);
			return true;
		}
		
		return false;
	}
	
	return {
		solutions: solutions,
		currSol: currSol,
		
		doing: doing,
		main: main,
		skipAnimation: skipAnimation,
		cleanUpAnimation: cleanUpAnimation,
		nextSolution: nextSolution,
		prevSolution: prevSolution,
		replaySolution: replaySolution,
		checkNewSolution: checkNewSolution,
		clearSolutions: clearSolutions,
		preselect: preselect
	}
}
////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                  End Eularian Path                                    //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                      ~Hamiltonian Cycle~                             //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
var hamiltonianCycle = function() {
	const ANIMATION_TIME = 2000;
	const ITERATIONS = ANIMATION_TIME/TIME_BT_FRAMES;
	const ARROW_COLOR = 0x0000ff;
	const ARROW_LAYER = 0; //Keep at this value, it won't appear otherwise
	const HEAD_LENGTH = 20;
	const HEAD_WIDTH = 10;
	const ORDER_TEXT_COLOR = 'white';
	const ORDER_TEXT_DISTANCE_Y = 45;
	
	var doing = false;
	
	var timeout = [];	
	var solutions = [];
	var currSol = 0;
	var animationObjects = [];
	var orderTexts = [];
	var animationParameters = [];
	
	var preSelectList = [];
	var preSelectLabels =[];
	const PRESELECT_LABEL_COLOR = 'red';
	const LABEL_OFFSET = 50;
	
	var actualIterations; //correction of ITERATIONS
	var matrix;
	
	var timeouts = [];//Animation that is still animating
	
	var main = function() {
		if(solutions.length === 0) {
				
			ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
			
			matrix = UTILS.setUpMatrixId();
			
			if(GRAPH.nodes.length <= 1) {
				return;
			}
			
			if(disconnected()) {
				return false;
			}
			
			enlistWebWorkers();
		}
		else {
			animationSetUp();
			ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
		}
		
		return;
	}
	
	var disconnected = function() {		
		for(var i = 0; i < GRAPH.nodes.length; i++) {
			if(GRAPH.nodes[i].getDegree() === 0) {
				return true;
			}
		}
		return false;
	}
	
	var enlistWebWorkers = function() {
		WEBWORKERMANAGER.enlistWebWorker(JSON.stringify({
			type: "HC",
			context: {
				circuit: preSelectList,
				nodesVisited: preSelectList,
				matrix: matrix,
				GRAPH: GRAPH.toStringJ()
			}
		}));
	}
	
	var checkNewSolution = function(circuit) {
		clearPreselect();
		
		for(var i = 0; i < solutions.length; i++) {
			if(rotateSolutionCheck(circuit, solutions[i])) {
				return;
			}
		}	
		
		solutions.push(circuit);
		ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
		
		if(solutions.length == 1) {
			animationSetUp();
		}
	}
	
	var rotateSolutionCheck = function(newSolution, solution) {
		for(var i = 0; i < newSolution.length - 1; i++) {
			newSolution.push(newSolution.shift());
			
			if(matchSolutions(newSolution, solution)) {
				return true;
			}
		}
		
		return false;
	}
	
	var matchSolutions = function(newSolution, solution) {
		for(var i = 0; i < newSolution.length; i++) {
			if(newSolution[i] !== solution[i]) {
				return false;
			}
		}
		return true;
	}
	
	var animationSetUp = function() {
		cleanUpAnimation();
		
		if(solutions.length === 0) {
			return;
		}
		
		ANIMATIONCONTROL.swapButtons(true);
		
		var circuit = [];
		for(var i = 0; i < solutions[currSol].length; i++) {
			circuit.push(solutions[currSol][i]);
		}
		
		createOrderTextBoxes(solutions[currSol]);
		
		circuit.push(solutions[currSol][0]);
		
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
		
		animationParameters[currSol] = {endPoints: endPoints,
			directionVectors: directionVectors,
			finalLengths: finalLengths};
			
		//Set up for animation
		for(var i = 0; i < actualIterations; i++) {
			
			timeouts.push((function(i) {
				setTimeout(function() {
	
				animation(endPoints[Math.floor(i/iterationsPerEdge)], 
				directionVectors[Math.floor(i/iterationsPerEdge)], 
				finalLengths[Math.floor(i/iterationsPerEdge)] * (i % iterationsPerEdge / iterationsPerEdge),
				Math.floor(i/iterationsPerEdge));
			
				}, (i + 1)*TIME_BT_FRAMES);
			})(i));
		}
		
		timeouts.push(setTimeout(function() {
			
			animationComplete(endPoints, directionVectors, finalLengths);
			
		}, (actualIterations + 1)*TIME_BT_FRAMES ));
	}
	
	var animation = function(orig, dir, length, i) {
		if(animationObjects[i] === undefined) {
			animationObjects[i] = new THREE.ArrowHelper( dir, orig, length, ARROW_COLOR , HEAD_LENGTH, HEAD_LENGTH  )
			scene.add( animationObjects[i] )
		}
		else {
			scene.remove( animationObjects[i] );
			animationObjects[i] = new THREE.ArrowHelper( dir, orig, length, ARROW_COLOR , HEAD_LENGTH, HEAD_LENGTH  )
			scene.add( animationObjects[i] )
		}
	}
	
	var animationComplete = function(endPoints, directionVectors, finalLengths) {
		for(var i = 0; i < directionVectors.length; i++) {
			scene.remove( animationObjects[i] );
			animationObjects[i] = new THREE.ArrowHelper( directionVectors[i], endPoints[i], finalLengths[i], ARROW_COLOR , HEAD_LENGTH, HEAD_LENGTH  );
			scene.add( animationObjects[i] );
		}
		ANIMATIONCONTROL.swapButtons(false);
	}
	
	var skipAnimation = function() {
		for(var i = 0; i < timeouts.length; i++) {
			clearTimeout(timeouts[i]);
		}
		timeouts = [];
		cleanUpAnimation();
		
		if(solutions.length !== 0) {
			animationComplete(animationParameters[currSol].endPoints,
			animationParameters[currSol].directionVectors,
			animationParameters[currSol].finalLengths);
		}
	}
	
	var createOrderTextBoxes = function(solution) {
		var obj;
		var orderPlane;
		
		console.log(solution)
		
		for(var i = 0; i < solution.length; i++) {
			orderPlane = UTILS.createLabel(i.toString(), ORDER_TEXT_COLOR);
			obj = scene.getObjectById(solution[i]);
			
			orderPlane.position.set(obj.position.x, obj.position.y + ORDER_TEXT_DISTANCE_Y, LABEL_LAYER);
			scene.add(orderPlane);
			orderTexts.push(orderPlane);
		}
	}
	
	var cleanUpAnimation = function(){
		clearPreselect();
		for(var i = 0; i < animationObjects.length; i++) {
			scene.remove(animationObjects[i]);
		}
		for(var i = 0; i < orderTexts.length; i++) {
			scene.remove(orderTexts[i]);
		}
		animationObjects = [];
		orderTexts = [];
	}
	var clearSolutions = function() {
		currSol = 0;
		solutions = [];
	}
	
	var nextSolution = function() {
		if(solutions.length === 0) {
			return;
		}
		
		cleanUpAnimation();
		currSol = (currSol + 1)%solutions.length;
		animationSetUp();
		ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
	}
	var prevSolution = function() {
		if(solutions.length === 0) {
			return;
		}
		
		cleanUpAnimation();
		currSol = ((currSol - 1 >= 0)? currSol - 1 : solutions.length - 1)%solutions.length;
		animationSetUp();
		ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
	}
	var replaySolution = function() {
		if(solutions.length === 0) {
			return;
		}
		
		cleanUpAnimation();
		animationSetUp();
	}
	
	var preselect = function(id) {
		var myLabel;
		var obj;
		var index;
		var objToRemove;
		
		if(preSelectList.includes(id)) {
			index = preSelectList.indexOf(id);
			preSelectList.splice(index, 1);
			
			scene.remove(preSelectLabels[index]);
			preSelectLabels.splice(index, 1);
			
			for(var i = index; i < preSelectLabels.length; ) {
				scene.remove(preSelectLabels[i]);
				preSelectLabels.splice(i, 1);
			}
			
			reorderList(index);
		}
		else {
			preSelectList.push(id);
			
			myLabel = UTILS.createLabel(preSelectList.length.toString(), PRESELECT_LABEL_COLOR);
			obj = scene.getObjectById(id);
			
			myLabel.position.set(obj.position.x, obj.position.y + LABEL_OFFSET, LABEL_LAYER);
			
			preSelectLabels.push(myLabel);
			scene.add(myLabel);
		}
		
		WEBWORKERMANAGER.restart();
		ANIMATIONCONTROL.updateCounter();
		clearSolutions();
	}
	
	var reorderList = function(index) {
		var obj;
		var myLabel;
		
		for(var i = index; i < preSelectList.length; i++) {
			myLabel = UTILS.createLabel((preSelectLabels.length + 1).toString(), PRESELECT_LABEL_COLOR);
			obj = scene.getObjectById(preSelectList[i]);
			
			myLabel.position.set(obj.position.x, obj.position.y + LABEL_OFFSET, LABEL_LAYER);
			
			preSelectLabels.push(myLabel);
			scene.add(myLabel);
		}
	}
	
	var clearPreselect = function() {
		for(var i = 0; i < preSelectList.length; ) {
			scene.remove(preSelectLabels[i]);
			preSelectLabels.splice(i, 1);
			preSelectList.splice(i, 1);
		}
	}
	
	return {
		solutions: solutions,
		currSol, currSol,
		
		main: main,
		skipAnimation: skipAnimation,
		cleanUpAnimation: cleanUpAnimation,
		nextSolution: nextSolution,
		prevSolution: prevSolution,
		replaySolution: replaySolution,
		checkNewSolution: checkNewSolution,
		clearSolutions: clearSolutions,
		preselect: preselect
	}
}
////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                  End Hamiltonian Cycle                                //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                      ~Hamiltonian Path~                               //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
var hamiltonianPath = function() {
	const ANIMATION_TIME = 2000;
	const ITERATIONS = ANIMATION_TIME/TIME_BT_FRAMES;
	const ARROW_COLOR = 0x0000ff;
	const ARROW_LAYER = 0; //Keep at this value, it won't appear otherwise
	const HEAD_LENGTH = 20;
	const HEAD_WIDTH = 10;
	
	var doing = false;
	
	var timeout = [];	
	var solutions = [];
	var currSol = 0;
	var animationObjects = [];
	var animationParameters = [];
	
	var preSelectList = [];
	var preSelectLabels =[];
	const PRESELECT_LABEL_COLOR = 'red';
	const LABEL_OFFSET = 50;
	
	var actualIterations; //correction of ITERATIONS
	var matrix;
	
	var timeouts = [];//Animation that is still animating
	
	var main = function() {
		if(solutions.length === 0) {
			
			ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
				
			matrix = UTILS.setUpMatrixId();
			
			if(GRAPH.nodes.length <= 1) {
				return;
			}
			
			if(disconnected()) {
				return false;
			}
			
			enlistWebWorkers();
		}
		else {
			animationSetUp();
			ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
		}
		
		return;
	}
	
	var disconnected = function() {		
		for(var i = 0; i < GRAPH.nodes.length; i++) {
			if(GRAPH.nodes[i].getDegree() === 0) {
				return true;
			}
		}
		return false;
	}
	
	var enlistWebWorkers = function() {		
		WEBWORKERMANAGER.enlistWebWorker(JSON.stringify({
			type: "HP",
			context: {
				path: preSelectList,
				nodesVisited: preSelectList,
				matrix: matrix,
				GRAPH: GRAPH.toStringJ()
			}
		}));
	}
	
	var addNewSolution = function(path) {
		clearPreselect();
	
		solutions.push(path);
		ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
		
		if(solutions.length == 1) {
			animationSetUp();
		}
	}
	
	var animationSetUp = function() {
		cleanUpAnimation();
		
		if(solutions.length === 0) {
			return;
		}
		
		ANIMATIONCONTROL.swapButtons(true);
		
		var path = [];
		for(var i = 0; i < solutions[currSol].length; i++) {
			path.push(solutions[currSol][i]);
		}
		
		var iterationsPerEdge = ITERATIONS/(path.length - 1);
		var endPoints = [];
		var directionVectors = [];
		var finalLengths = [];
		
		//Collects the endpoints for the arrows
		for(var i = 0; i < path.length; i++) {
			endPoints.push(scene.getObjectById(path[i]).position);
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
		
		animationParameters[currSol] = {endPoints: endPoints,
			directionVectors: directionVectors,
			finalLengths: finalLengths};
			
		//Set up for animation
		for(var i = 0; i < actualIterations; i++) {
			
			timeouts.push((function(i) {
				setTimeout(function() {
	
				animation(endPoints[Math.floor(i/iterationsPerEdge)], 
				directionVectors[Math.floor(i/iterationsPerEdge)], 
				finalLengths[Math.floor(i/iterationsPerEdge)] * (i % iterationsPerEdge / iterationsPerEdge),
				Math.floor(i/iterationsPerEdge));
			
				}, (i + 1)*TIME_BT_FRAMES);
			})(i));
		}
		
		timeouts.push(setTimeout(function() {
			
			animationComplete(endPoints, directionVectors, finalLengths);
			
		}, (actualIterations + 1)*TIME_BT_FRAMES ));
	}
	
	var animation = function(orig, dir, length, i) {
		if(animationObjects[i] === undefined) {
			animationObjects[i] = new THREE.ArrowHelper( dir, orig, length, ARROW_COLOR , HEAD_LENGTH, HEAD_LENGTH  )
			scene.add( animationObjects[i] )
		}
		else {
			scene.remove( animationObjects[i] );
			animationObjects[i] = new THREE.ArrowHelper( dir, orig, length, ARROW_COLOR , HEAD_LENGTH, HEAD_LENGTH  )
			scene.add( animationObjects[i] )
		}
	}
	
	var animationComplete = function(endPoints, directionVectors, finalLengths) {
		for(var i = 0; i < directionVectors.length; i++) {
			scene.remove( animationObjects[i] );
			animationObjects[i] = new THREE.ArrowHelper( directionVectors[i], endPoints[i], finalLengths[i], ARROW_COLOR , HEAD_LENGTH, HEAD_LENGTH  );
			scene.add( animationObjects[i] );
		}
		ANIMATIONCONTROL.swapButtons(false);
	}
	
	var skipAnimation = function() {
		for(var i = 0; i < timeouts.length; i++) {
			clearTimeout(timeouts[i]);
		}
		timeouts = [];
		cleanUpAnimation();
		
		if(solutions.length !== 0) {
			animationComplete(animationParameters[currSol].endPoints,
			animationParameters[currSol].directionVectors,
			animationParameters[currSol].finalLengths);
		}
	}
	
	var cleanUpAnimation = function(){
		clearPreselect();
		for(var i = 0; i < animationObjects.length; i++) {
			scene.remove(animationObjects[i]);
		}
		animationObjects = [];
	}
	var clearSolutions = function() {
		currSol = 0;
		solutions = [];
	}
	
	var nextSolution = function() {
		if(solutions.length === 0) {
			return;
		}
		
		cleanUpAnimation();
		currSol = (currSol + 1)%solutions.length;
		animationSetUp();
		ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
	}
	var prevSolution = function() {
		if(solutions.length === 0) {
			return;
		}
		
		cleanUpAnimation();
		currSol = ((currSol - 1 >= 0)? currSol - 1 : solutions.length - 1)%solutions.length;
		animationSetUp();
		ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
	}
	var replaySolution = function() {
		if(solutions.length === 0) {
			return;
		}
		
		cleanUpAnimation();
		animationSetUp();
	}
	
	var preselect = function(id) {
		var myLabel;
		var obj;
		var index;
		var objToRemove;
		
		if(preSelectList.includes(id)) {
			index = preSelectList.indexOf(id);
			preSelectList.splice(index, 1);
			
			scene.remove(preSelectLabels[index]);
			preSelectLabels.splice(index, 1);
			
			for(var i = index; i < preSelectLabels.length; ) {
				scene.remove(preSelectLabels[i]);
				preSelectLabels.splice(i, 1);
			}
			
			reorderList(index);
		}
		else {
			preSelectList.push(id);
			
			myLabel = UTILS.createLabel(preSelectList.length.toString(), PRESELECT_LABEL_COLOR);
			obj = scene.getObjectById(id);
			
			myLabel.position.set(obj.position.x, obj.position.y + LABEL_OFFSET, LABEL_LAYER);
			
			preSelectLabels.push(myLabel);
			scene.add(myLabel);
		}
		
		WEBWORKERMANAGER.restart();
		ANIMATIONCONTROL.updateCounter();
		clearSolutions();
	}
	
	var reorderList = function(index) {
		var obj;
		var myLabel;
		
		for(var i = index; i < preSelectList.length; i++) {
			myLabel = UTILS.createLabel((preSelectLabels.length + 1).toString(), PRESELECT_LABEL_COLOR);
			obj = scene.getObjectById(preSelectList[i]);
			
			myLabel.position.set(obj.position.x, obj.position.y + LABEL_OFFSET, LABEL_LAYER);
			
			preSelectLabels.push(myLabel);
			scene.add(myLabel);
		}
	}
	
	var clearPreselect = function() {
		for(var i = 0; i < preSelectList.length; ) {
			scene.remove(preSelectLabels[i]);
			preSelectLabels.splice(i, 1);
			preSelectList.splice(i, 1);
		}
	}
	
	return {
		solutions: solutions,
		currSol, currSol,
		
		main: main,
		skipAnimation: skipAnimation,
		cleanUpAnimation: cleanUpAnimation,
		nextSolution: nextSolution,
		prevSolution: prevSolution,
		replaySolution: replaySolution,
		addNewSolution: addNewSolution,
		clearSolutions: clearSolutions,
		preselect: preselect
	}
}
////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                  End Hamiltonian Path                                 //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                      ~Graph Coloring~                                 //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
var graphColor = function() {
	const ANIMATION_TIME = 2000;
	const ITERATIONS = ANIMATION_TIME/TIME_BT_FRAMES;
	
	var doing = false;
	
	var timeout = [];	
	var solutions = [];
	var currSol = 0;
	var minColors = Number.POSITIVE_INFINITY;
	var colorGrouping = [];
	
	var actualIterations; //correction of ITERATIONS
	var matrix;
	
	var main = function() {
		if(solutions.length === 0) {
			ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
			
			matrix = UTILS.setUpMatrixId();
			
			enlistWebWorkers();
		}
		else {
			colorNodes();
			ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
		}
		
		return;
	}
	
	var enlistWebWorkers = function() {
		WEBWORKERMANAGER.enlistWebWorker(JSON.stringify({
			type: "GC",
			context: {
				nodeColors: [],
				nodesLeft: [],
				currentColor: -1,
				changeColor: false,
				matrix: matrix,
				GRAPH: GRAPH.toStringJ(),
				colors: ANIMATIONCONTROL.colors
			}
		}));
	}
	
	var checkNewSolution = function(colors) {
		if(colors.length === 0) {
			return;
		}
		
		//Only add if the solution is as or more optimized
		if(colors.length <= minColors) {
			//Remove longer solutions (should never occur, handled in the Welsh-Powell Algorithm in webworker)
			if(minColors !== colors.length) {
				minColors = colors.length;
				removeExcessSolutions();
			}
			//Check for uniqueness if necessary
			if(!checkColorGrouping(colors)) {
				return;
			}
			
			solutions.push(colors);
			ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
			
			//Color if first solution (don't interrupt user any other time)
			if(solutions.length == 1) {
				colorNodes();
			}
			
			//console.log(colorGrouping)
		}
	}
	
	//Create grouping, add to collection if unique
	var checkColorGrouping = function(colors) {
		var grouping = createNewGrouping(colors);
		
		if(compareGrouping(grouping)) {
			colorGrouping.push(grouping);
			return true;
		}
		
		return false;
	}
	
	//Compare grouping for uniqueness
	var compareGrouping = function(newGroup) {
		console.log(newGroup);
		var oldGroup;
		
		var same = true;
		
		for(var i = 0; i < colorGrouping.length; i++) {
			oldGroup = colorGrouping[i];
			
			if(differentGrouping(newGroup, oldGroup) == true) {
				same = false;
			}
			
			//Not unique
			if(same === true) {
				return false;
			}
			
			same = true;
		}
		
		return true;
	} 
	
	//Check if the color groupings differ
	var differentGrouping = function(x, y) {
		var matchedPairs = [];
		
		if(x.length !== y.length) {
			return true;
		}
		
		for(var i = 0; i < x.length ; i++) {
			for(var j = 0; j < y.length; j++) {
				if((x[i].difference(y[j])).size === 0
				&& matchedPairs[i] === undefined
				&& !matchedPairs.includes(j)) {
					matchedPairs[i] = j;
					break;
				}
			}
		}
		
		if(matchedPairs.length === x.length) {
			return false;
		}
		
		return true;
		
	}
	
	var createNewGrouping = function(colors) {
		var grouping = [];
		var grouped = false;
		
		console.log(colors);
		
		//Create first group color
		grouping.push([]);
		grouping[0].push(colors[0].color);
		grouping[0].push(colors[0].id);
		
		//For each color
		for(var i = 1; i < colors.length; i++) {
			//Check if it belongs in any of the groups
			for(var j = 0; j < grouping.length; j++) {
				if(grouping[j][0] === colors[i].color) {
					grouping[j].push(colors[i].id);
					grouped = true;
					break;
				}
			}
			//New color was found
			if(grouped === false) {
				grouping.push([]);
				grouping[grouping.length - 1].push(colors[i].color);
				grouping[grouping.length - 1].push(colors[i].id);
			}
			//Assume false for the next color
			grouped = false;
		}
		
		for(var i = 0; i < grouping.length; i++) {
			grouping[i].shift();
			grouping[i] = new Set(grouping[i]);
		}
		
		return grouping;
	}
	
	var removeExcessSolutions = function() {
		for(var i = 0; i < solutions.length; ) {
			if(solutions[i].length > minColors) {
				solutions.splice(i, 1);
			}
		}
	}
	
	var colorNodes = function() {
		if(solutions.length === 0) {
			return;
		}
		
		var obj;
		
		for(var i = 0; i < solutions[currSol].length; i++) {
			obj = scene.getObjectById(solutions[currSol][i].id);
			
			console.log(solutions[currSol][i].color);
			obj.material.color.setHex(solutions[currSol][i].color);
		}
	}
	
	var decolorNodes = function() {
		for(var i = 0; i < GRAPH.nodes.length; i++) {
			obj = scene.getObjectById(GRAPH.nodes[i].getId());
			
			obj.material.color.setHex(DEFAULT_COLOR);
		}
	}

	var clearSolutions = function() {
		currSol = 0;
		solutions = [];
		minColors = Number.POSITIVE_INFINITY;
	}
	
	var nextSolution = function() {
		if(solutions.length === 0) {
			return;
		}
		
		currSol = (currSol + 1)%solutions.length;
		colorNodes();
		ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
	}
	var prevSolution = function() {
		if(solutions.length === 0) {
			return;
		}
		
		currSol = ((currSol - 1 >= 0)? currSol - 1 : solutions.length - 1)%solutions.length;
		colorNodes();
		ANIMATIONCONTROL.updateCounter(currSol, solutions.length);
	}
	
	return {
		solutions: solutions,
		currSol, currSol,
		
		main: main,
		nextSolution: nextSolution,
		prevSolution: prevSolution,
		checkNewSolution: checkNewSolution,
		clearSolutions: clearSolutions,
		decolorNodes: decolorNodes,
		colorNodes: colorNodes
	}
}
////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                  End Graph Coloring                                   //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////                This section deals with the actual graph                       /////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                              ~Graph~                                  //////////////////////
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
*/
var Graph = function() {
	//Node Object
	var Node = function(id) {
		var position;
		var color = DEFAULT_COLOR;
		var name = "";
		var degree = 0;
		var labelId = 0;
		
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
		var getLabelId = function() {
			return labelId;
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
		var setLabelId = function(l) {
			labelId = l;
		}
		
		var incrementDegree = function() {
			degree++;
		}
		var decrementDegree = function() {
			degree--;
			if(degree < 0) {
				console.log("Error: A node's degree should not be less than 0!");
			}
		}
		
		var toStringAlmost = function() {
			return {
				id: getId(),
				color: getColor(),
				degree: getDegree(),
				position: position,
				name: name
			}
		}
		
		return {
			getId: getId,
			getPosition: getPosition,
			getColor: getColor,
			getName: getName,
			getDegree: getDegree,
			getLabelId: getLabelId,
			setPosition: setPosition,
			setColor: setColor,
			setName: setName,
			setLabelId: setLabelId,
			incrementDegree: incrementDegree,
			decrementDegree: decrementDegree,
			toStringAlmost, toStringAlmost
		};
	}
	//Edge Object
	var Edge = function(id, node1, node2) {
		var midPoint;
		var length; 
		var rotation
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
		var getMidPoint = function() {
			return midPoint;
		}
		var getLength = function() {
			return length;
		}
		var getRotation = function() {
			return rotation;
		}
		var getColor = function() {
			return color;
		}
		
		var setColor = function(c) {
			color = c;
		}
		
		var recalculateLength = function() {
			var l = scene.getObjectById(node1).position.clone();
			l.sub(scene.getObjectById(node2).position);
			l = Math.sqrt(Math.pow(l.x, 2) + Math.pow(l.y, 2));
			length = l;
		}
		var recalculateRotation = function() {
			var r = scene.getObjectById(node1).position.clone();
			r.sub(scene.getObjectById(node2).position);
			r.normalize();
			rotation = Math.atan(r.y / r.x);
		}
		var recalculateMidPoint = function() {
			var p = scene.getObjectById(node1).position.clone();
			p.add(scene.getObjectById(node2).position);
			p.divideScalar(2);
			p.z = EDGE_LAYER;
			midPoint = p;
		}
		
		var toStringAlmost = function() {
			return {
				id: getId(),
				node1: GRAPH.findNode(node1).getId(),
				node2: GRAPH.findNode(node2).getId(),
				color: getColor()
			}
		}
		
		return {
			getId: getId,
			getNode1: getNode1,
			getNode2: getNode2,
			getColor: getColor,
			getRotation: getRotation,
			getLength: getLength,
			getMidPoint: getMidPoint,
			setColor: setColor,
			recalculateLength: recalculateLength,
			recalculateRotation: recalculateRotation,
			recalculateMidPoint: recalculateMidPoint,
			toStringAlmost: toStringAlmost
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
		
		var toStringAlmost = function() {
			return {
				position: position,
				zoom: zoom
			}
		}
		
		return {
			getPosition: getPosition,
			getZoom: getZoom,
			setPosition: setPosition,
			setZoom: setZoom,
			toStringAlmost: toStringAlmost
		};
	}
	//Graph Object
	var NewGraph = function() {
		var nodes = [];
		var edges = [];
		
		var camera = Camera();
				
		//Requires a unique object id, unique name(if one is provided)
		var addNode = function(n, name=null) {
			
			nodes.push(Node(n));
			
			if(name !== null) {
				nameNode(n, name);
			}						
			return true;
		};
		
		//Name the node only if the name is unique and is different
		var nameNode = function(nId, name) {
			if(name === "") {
				return null;
			}
			
			for(var i = 0; i < nodes.length; i++) {
				if(nId === nodes[i].getId() && nodes[i].getName !== "" && name === nodes[i].getName()) {
					return null;
				}
				if(nId !== nodes[i].getId() && nodes[i].getName() === name) {
					return null;
				}
			}
			
			var node = findNode(nId);
			
			if(node.getName() !== "") {
				scene.remove(scene.getObjectById(node.getLabelId()));
				node.setName(name);
			}
			node.setName(name);
			node.setLabelId(GRAPHDRAWER.createLabel(name));			
			return node.getLabelId();
		}
		
		//Removes name and label from scene
		var removeName = function(nId) {
			var node = findNode(nId);
			
			if(node.getName !== "") {
				node.setName("");
				scene.remove(scene.getObjectById(node.getLabelId()));
				node.setLabelId(0);
			}
		}
		
		//Requires the node pair be unique, unique object id, rejects self loops
		var addEdge = function(id, n1, n2) {
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
			
			edges.push(new Edge(id, n1, n2));	
			findNode(n1).incrementDegree();
			findNode(n2).incrementDegree();
					
			return true;
		};
		
		//Removes nodes and corresponding edges. Returns list of Object Id's. Required node object id.
		var removeNode = function(n) {
			var removeList = [];
			
			if(findNode(n).getName() !== "") {
				removeName(n);
			}
			
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
		
		//Same as findEdge, but returns the Edge object
		var findEdgeObject = function(eId) {
			var edge = null;
			for(var i = 0; i < edges.length; i++) {
				if(edges[i].getId() == eId) {
					edge = edges[i];
					break;
				}
			}
			return edge;
		}
		
		var getNodesForEdge = function(eId) {
			var e = findEdgeObject(eId);
			return [e.getNode1(), e.getNode2()];	
		}
		
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
		
		var toStringJ = function() {
			var n = [];
			var e = [];
			
			for(var i = 0; i < nodes.length; i++) {
				n.push(nodes[i].toStringAlmost());
			}
			for(var i = 0; i < edges.length; i++) {
				e.push(edges[i].toStringAlmost());
			}
			
			return JSON.stringify({
				nodes: n,
				edges: e,
				camera: camera.toStringAlmost()
			});
		}
		
		return {
			nodes: nodes,
			edges: edges,
			camera: camera,
			addNode: addNode,
			addEdge: addEdge,
			removeNode: removeNode,
			removeEdge: removeEdge,
			nameNode, nameNode,
			removeName: removeName,
			findNode: findNode,
			findEdge: findEdge,
			getNodesForEdge: getNodesForEdge,
			findEdges: findEdges,
			findEdgeObject: findEdgeObject,
			toStringJ: toStringJ
		};
	}
	
	return NewGraph();
} 
////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                          End Graph                                    //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                          ~Graph Drawer~                               //////////////////////
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
			object = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color: DEFAULT_COLOR } ) );
			object.position.x = options.position.x;
			object.position.y = options.position.y;
			object.position.z = NODE_LAYER;
			object.userData = "Node";
			GRAPH.addNode(object.id);
			
		} else {
			geometry = new THREE.CircleBufferGeometry( NODE_RADIUS , 32 );
			object = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color: DEFAULT_COLOR } ) );
			object.position.x = options.load.position.x;
			object.position.y = options.load.position.y;
			object.position.z = NODE_LAYER;
			object.userData = "Node";
			GRAPH.addNode(object.id, options.load.name);
		}

		scene.add( object );
		
		var label = scene.getObjectById(GRAPH.findNode(object.id).getLabelId());
		if(label) {
			label.position.set(object.position.x, object.position.y, LABEL_LAYER);
		}
		
		WEBWORKERMANAGER.restart();
		ANIMATIONCONTROL.clearAllSolutions();
		autoSave();
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
		var geometry = new THREE.BoxBufferGeometry( 1, CUBE_WIDTH, 1 );			
		
		var material;
		
		//Everything else
		if(typeof options.selections !== "undefined" && typeof options.complement === "undefined" ||
			typeof options.loading !== "undefined") {
			material = new THREE.MeshLambertMaterial({ color: DEFAULT_EDGE_COLOR, transparent: true });
		}
		//Used as part of the beginning of the Complement animation
		else {
			material = new THREE.MeshLambertMaterial({ color: DEFAULT_EDGE_COLOR, transparent: true, opacity: 0 });
		}	
		
		//Edge Object
		var cube = new THREE.Mesh( geometry, material );
		cube.userData = "Edge";
		
		var bool = false;//Assume edge is invalid
		
		//For everything else, validates edge, or not
		if(typeof options.selections !== "undefined") {
			bool = GRAPH.addEdge(cube.id, options.selections[0].id, options.selections[1].id);
		} 
		//Loading
		else {
			var n1 = options.loading.nodeMap[options.loading.load.node1];
			var n2 = options.loading.nodeMap[options.loading.load.node2];
		
			bool = GRAPH.addEdge(cube.id, n1, n2);
		}
		
		//Check edge validity before creating object
		if(bool) {
			var edge = GRAPH.findEdgeObject(cube.id);
			edge.recalculateLength();
			edge.recalculateRotation();
			edge.recalculateMidPoint();
			
			cube.scale.x = edge.getLength();
			cube.rotation.z = edge.getRotation();
			cube.position.set(edge.getMidPoint().x, edge.getMidPoint().y, edge.getMidPoint().z);
			
			scene.add( cube );
			WEBWORKERMANAGER.restart();
			ANIMATIONCONTROL.clearAllSolutions();
			autoSave();
		}
	}
	//Remvoes the node and edges attached to it (sync)
	var removeNode = function(object) {
		var list = GRAPH.removeNode(object.id);
		removeObjects(list);
		WEBWORKERMANAGER.restart();
		ANIMATIONCONTROL.clearAllSolutions();
		autoSave();
	}
	//Removes a single edge (sync)
	var removeEdge = function(eId) {
		var edge = GRAPH.findEdgeObject(eId);
		var list = GRAPH.removeEdge(edge.getNode1(), edge.getNode2());
		removeObjects(list);
		WEBWORKERMANAGER.restart();
		ANIMATIONCONTROL.clearAllSolutions();
		autoSave();
	}
	//Removes everything (sync)
	var clearGraph = function() {
		while(GRAPH.nodes.length > 0) {
			removeNode(scene.getObjectById(GRAPH.nodes[0].getId()));
		}
		WEBWORKERMANAGER.restart();
		ANIMATIONCONTROL.clearAllSolutions();
		autoSave();
	}
	//Actual function to remove the objects from display
	var removeObjects = function(list) {
		for(var i = 0; i < list.length; i++) {
			scene.remove(scene.getObjectById(list[i], true));
		}
	}
	
	var nameNode = function(name, theNodeToBeNamed) {
		theNodeToBeNamed = scene.getObjectById(theNodeToBeNamed);
		
		if(name.length === 0) {
			GRAPH.removeName(theNodeToBeNamed.id);
		}
		else {
			var id = GRAPH.nameNode(theNodeToBeNamed.id, name);
			
			if(id !== null) {
				var label = scene.getObjectById(id);
				label.position.set(theNodeToBeNamed.position.x, theNodeToBeNamed.position.y, LABEL_LAYER);
			}
		}
		
		autoSave();
	}
	
	var createLabel = function(name) {
		var label = UTILS.createLabel(name);
		scene.add(label);
		return label.id;
	}
	
	var repositionEdges = function(nodeObj) {
		var list = GRAPH.findEdges(nodeObj.id);
		
		var object;
		var edge;
				
		for(var i = 0; i < list.length; i++) {
			object = scene.getObjectById(list[i][0]);
			edge = GRAPH.findEdgeObject(list[i][0]);
					
			edge.recalculateLength();
			edge.recalculateRotation();
			edge.recalculateMidPoint();
					
			object.position.set(edge.getMidPoint().x, edge.getMidPoint().y, edge.getMidPoint().z);
			object.scale.x = edge.getLength();
			object.rotation.z = edge.getRotation();
			autoSave();
		}
	}
	
	return {
		addNode : addNode,
		addEdge : addEdge,
		removeNode : removeNode,
		removeEdge : removeEdge,
		clearGraph : clearGraph,
		nameNode : nameNode,
		createLabel: createLabel,
		repositionEdges: repositionEdges
	};
}
////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                        End Graph Drawer                               //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////                           ~Graph Parser~                              //////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
/*
	Handles all the parsing and generating of a graph by user input
	
	Public Methods:
	parseSet - parses out the node and edge set and generates a graph
	parseSeq - parses out the degree sequence and generates a graph
*/

var graphParser = function() {
	//Force Bassed Generation
	const K = 40;
	const REPULSION = 20;
	const DAMP = 0.2;
	const MAXSPEED = 40;
	const M = 50;
	const LENGTH = 50;
	const TIMESTEP = 0.01;
	const ENERGYMIN = 10;
	const CENTERATTRACTION = 50;//Ignore the name, the higher, the weaker
	//Initializing
	const DISTANCEFROMCENTER = 200;
	
	var nodeRegex = /^[\s]*[\w]{1,8}[\s]*$/;
	var nodeSetRegex = /(^[\s]*$)|(^[\s]*[\w]{1,8}[\s]*([,][\s]*[\w]{1,8}[\s]*)*$)/;
	var edgeRegex = /^[\s]*[\w]{1,8}[\s]*[,][\s]*[\w]{1,8}[\s]*$/;
	var edgeSetRegex = /(^[\s*]$)|(^[\s]*[\w]{1,8}[\s]*[,][\s]*[\w]{1,8}[\s]*([;][\s]*[\w]{1,8}[\s]*[,][\s]*[\w]{1,8}[\s]*)*$)/;
	var degRegex = /[\s]*[\d]+[\s]*([,][\s]*[\d]+[\s]*)/;
	
	//Parses the node and edge set
	var parseSet = function(nodeStr, edgeStr) {

		nodeSet = new Set();
		edgeSet = new Set();
		errorMsg = [];
		
		if(!nodeSetRegex.test(nodeStr)) {
			HINTBOX.setErrorMessage("The node set was not in the correct format. Please read in the instructions below.");
			return;
		}
		
		if(nodeStr == "") {
			HINTBOX.setErrorMessage("No nodes were named, so there was no graph to create.");
			return;
		}
		
		//Removes execcesive spaces, and splits into array
		var strArray = (nodeStr.replace(/\s+/,' ').trim()).split(",");
		
		for(var i = 0; i < strArray.length; i++) {
			strArray[i] = strArray[i].trim();
			
			//Ignores blanks
			if(/^\\s*$/.test(strArray[i]) || strArray[i] == "") {
				continue;
			}
			//Stops on an erroneous name
			if(!nodeRegex.test(strArray[i])) {
				HINTBOX.setErrorMessage( "'" + strArray[i] + "' The names for the nodes can only contain numbers, letters, underscores.");
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
		if(strArray !== "" && !edgeSetRegex.test(strArray)) {
			HINTBOX.setErrorMessage("The edge set does not follow the correct format.");
			return;
		}
		
		//Splits into array of pairs
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
				HINTBOX.setErrorMessage(edgeStr.split(";")[i] + "must have two nodes");
			}
			
			strArray[i][0] = strArray[i][0].trim();
			strArray[i][1] = strArray[i][1].trim();
			//Stops when a node was never named
			if(!nodeSet.has(strArray[i][0])) {
				HINTBOX.setErrorMessage(strArray[i][0] + " was not defined as a node.");
			}
			else if(!nodeSet.has(strArray[i][1])) {
				HINTBOX.setErrorMessage(strArray[i][1] + " was not defined as a node.");
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
			HINTBOX.setErrorMessage(str);
		}
		
		nodeSet = Array.from(nodeSet);
		edgeSet = Array.from(edgeSet);
		
		//Generate the graph
		forceBasedGraphGeneration(nodeSet, edgeSet);;
	}

	//Parses degree sequence
	var parseSeq = function(degStr) {
		
		var nodeSet = [];
		var edgeSet = [];
		var errorMsg = "";
		
		var degArray;
		
		if(!degRegex.test(degStr)) {
			errorMsg = "The degree sequence must be a comma separated list of numbers. Leave no excessive/trailing commas";
			HINTBOX.setErrorMessage(errorMsg);
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
			HINTBOX.setErrorMessage(errorMsg);
			return;
		}
		else {
			nodeSet = errorMsg.nodeSet;
			edgeSet = errorMsg.edgeSet;
		}
		
		//Generate the graph
		forceBasedGraphGeneration(nodeSet, edgeSet);
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
			degArray[i];
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
			for(var i = 1; i <= nodeSet[0].degReq; i++) {
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
		
		//Node set needs to be strings for next set
		for(var i = 0; i < nodeSet.length; i++) {
			nodeSet[i] = nodeSet[i].id;
		}
		
		return {nodeSet: nodeSet, edgeSet: edgeSet};
	}
	
	//Forced Based Algorithm to generate a clean graph
	var forceBasedGraphGeneration = function(nodeSet, edgeSet) {
		GRAPHDRAWER.clearGraph();
		
		var points = [];
		initGraph(points, nodeSet, edgeSet);
		
		var matrix = setUpMatrix(points);
		
		do {
			coloumbslaw(points);
			hookeslaw(points, matrix);
			attractToCenter(points);
			updateVelocity(points);
			updatePosition(points);
			for(var i = 0; i < points.length; i++) {
				GRAPHDRAWER.repositionEdges(scene.getObjectById(points[i].id));
			}
			console.log(calculateEnergy(points));			
		} while(calculateEnergy(points) > ENERGYMIN);
	}
	
	var calculateEnergy = function(points) {
		var total = 0;
		for(var i = 0; i < points.length; i++) {
			total += Math.sqrt(points[i].v.x*points[i].v.x + points[i].v.y*points[i].v.y);
		}
		return total;
	}
	
	var updatePosition = function(points) {
		var obj;
		for(var i = 0; i < points.length; i++) {
			obj = scene.getObjectById(points[i].id);
			obj.position.x = points[i].v.x * TIMESTEP + obj.position.x;
			obj.position.y = points[i].v.y * TIMESTEP + obj.position.y;
		}
	}
	
	var updateVelocity = function(points) {
		var v;
		
		for(var i = 0; i < points.length; i++) {
			v = new THREE.Vector3();
			v.copy(points[i].v);
			v.add(new THREE.Vector3(points[i].a.x * TIMESTEP * DAMP, points[i].a.y * TIMESTEP * DAMP, 0));
			
			if(Math.sqrt(v.x*v.x + v.y*v.y) > MAXSPEED) {
				v.copy(v.normalize().multiplyScalar(MAXSPEED));
			}
			points[i].v.copy(v);
			points[i].a = new THREE.Vector3(0,0,0);
		}
	}
	
	//Keep nodes to the center as much as possible
	var attractToCenter = function(points) {
		var position;
		for(var i = 0; i < points.length; i++) {
			position = new THREE.Vector3().copy(scene.getObjectById(points[i].id).position);
			applyForce(position.multiplyScalar(-1*REPULSION/CENTERATTRACTION), points[i]);
		}
	}
	
	//Hooke's Law
	var hookeslaw = function(points, matrix) {
		var distance = new THREE.Vector3();
		var magnitude;
		var dir = new THREE.Vector3();
		
		var obj1;
		var obj2;
		
		for(var i = 0; i < GRAPH.nodes.length; i++) {		
			for(var j = 0; j < GRAPH.nodes.length; j++) {
				if(GRAPH.nodes[i].getId() == GRAPH.nodes[j].getId()) {
					continue;
				}
				if(!matrix[GRAPH.nodes[i].getId()][GRAPH.nodes[j].getId()]) {
					continue;
				}
				
				obj1 = scene.getObjectById(GRAPH.nodes[i].getId());
				obj2 = scene.getObjectById(GRAPH.nodes[j].getId());
				
				distance = new THREE.Vector3(obj1.position.x - obj2.position.x,
					obj1.position.y - obj2.position.y,
					obj1.position.z - obj2.position.z);
				
				dir.copy(distance);
				dir.normalize();
				
				magnitude = Math.sqrt(Math.pow(distance.x, 2) + Math.pow(distance.y, 2));
				
				applyForce(new THREE.Vector3(dir.x, dir.y, 0).multiplyScalar(K*-0.5*(magnitude-LENGTH))
					, getPoint(points, GRAPH.nodes[i].getId()));
				applyForce(new THREE.Vector3(dir.x, dir.y, 0).multiplyScalar(K*0.5*(magnitude-LENGTH))
					, getPoint(points, GRAPH.nodes[j].getId()));
			}
		}
	}
	
	//Coloumb's Law
	var coloumbslaw = function(points) {
		var distance = new THREE.Vector3();
		var magnitude;
		var dir = new THREE.Vector3();
		
		var obj1;
		var obj2;
		
		for(var i = 0; i < GRAPH.nodes.length; i++) {		
			for(var j = 0; j < GRAPH.nodes.length; j++) {
				if(GRAPH.nodes[i].getId() == GRAPH.nodes[j].getId()) {
					continue;
				}
				
				obj1 = scene.getObjectById(GRAPH.nodes[i].getId());
				obj2 = scene.getObjectById(GRAPH.nodes[j].getId());
				
				distance = new THREE.Vector3(obj1.position.x - obj2.position.x,
					obj1.position.y - obj2.position.y,
					0);
				
				dir.copy(distance);
				dir.normalize();
				
				magnitude = Math.sqrt(Math.pow(distance.x, 2) + Math.pow(distance.y, 2));
				
				applyForce(new THREE.Vector3(dir.x * REPULSION, 
					dir.y * REPULSION, 0).divideScalar(magnitude*magnitude*0.5), getPoint(points, GRAPH.nodes[i].getId()));
				applyForce(new THREE.Vector3(dir.x * REPULSION,
					dir.y * REPULSION, 0).divideScalar(magnitude*magnitude*-0.5), getPoint(points, GRAPH.nodes[j].getId()));
			}
		}
	}
	
	var applyForce = function(force, point) {
		point.a.add(new THREE.Vector3(force.x/point.m, force.y/point.m, 0));
	}
	
	var getPoint = function(points, id) {
		for(var i = 0; i < points.length; i++) {
			if(points[i].id == id) {
				return points[i];
			}
		}
	}
	
	//Generate intial positons of nodes.
	var initGraph = function(points, nodeSet, edgeSet) {
		var label;
		var obj;
		
		var mapNodes = {};
		var id;
		var deg;
		
		for(var i = 0; i < nodeSet.length; i++) {
			deg = Math.PI*2/nodeSet.length*i
			id = GRAPHDRAWER.addNode({position: new THREE.Vector3(Math.cos(deg)*DISTANCEFROMCENTER,
				Math.sin(deg)*DISTANCEFROMCENTER, NODE_LAYER)});
			
			if(nodeSet[i][0] !== "_") {
				GRAPH.nameNode(id, nodeSet[i]);
				obj = scene.getObjectById(id);
				label = scene.getObjectById(GRAPH.findNode(id).getLabelId());
				label.position.set(obj.position.x, obj.position.y, LABEL_LAYER);
			}
			
			points.push({id: id, m: M, v: new THREE.Vector3(0,0,0), a: new THREE.Vector3(0,0,0)});
			mapNodes[nodeSet[i]] = id;
		}
		
		for(var i = 0; i < edgeSet.length; i++) {
			GRAPHDRAWER.addEdge({selections: [scene.getObjectById(mapNodes[edgeSet[i][0]]), scene.getObjectById(mapNodes[edgeSet[i][1]])]});
		}
	}
	
	//Adjancency matrix
	var setUpMatrix = function() {
		var matrix = [];
		
		for(var i = 0; i < GRAPH.nodes.length; i++) {
			matrix[GRAPH.nodes[i].getId()] = [];
			
			for(var j = 0; j < GRAPH.nodes.length; j++) {
				matrix[GRAPH.nodes[i].getId()][GRAPH.nodes[j].getId()] = (GRAPH.findEdge(GRAPH.nodes[i].getId(), GRAPH.nodes[j].getId()) != null);
			}
		}
		
		for(var i = 0; i < GRAPH.nodes.length; i++) {
			matrix[GRAPH.nodes[i].getId()][GRAPH.nodes[i].getId()] = null;
		}
		
		return matrix;
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

var UTILS = utils();
var HINTBOX = hintBox();

//Animation
var ANIMATIONCONTROL = animationControl();
var WEBWORKERMANAGER = webWorkerManager();

//Graph
var GRAPH = Graph();
var GRAPHDRAWER = graphDrawer();
var GRAPHPARSER = graphParser();

//Graph Functions
var COMPLEMENT = complement();
var EDGECONTRACTION = edgeContraction();
var EULERIANCYCLE = eulerianCycle();
var EULERIANPATH = eulerianPath();
var HAMILTONIANCYCLE = hamiltonianCycle();
var HAMILTONIANPATH = hamiltonianPath();
var GRAPHCOLOR = graphColor();


$(document).ready(function(){

	init();
	animate();
	
	///////////////////////////////////////////////////////////////////////////////////////
	/////////////// The flip panels outside the graph.     ////////////////////////////////
	/////////////// Modifies hints pending on selection.   ////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////	
	
	//Flip panels
	$("#flip-1").click(function(){
		$("#panel-1").slideToggle("slow");
		$("#panel-2").slideUp("slow");
		$("#panel-3").slideUp("slow");
		$("#panel-4").slideUp("slow");
		$("#panel-5").slideUp("slow");
		HINTBOX.setFormatMessage("Enter a node set and edge set to generate a graph. <br/>" +
			"Node set format: the names can no be longer than 8 characters long. The names can " +
			"include letters, numbers and underscores.<br/>" +
			"Edge set format: pair of nodes are to be separated by a comma, and the list overall is semicolon separated." +
			"e.g. NodeSet: A,B,C EdgeSet: A,B;B,C<br/>" +
			"The list must be comma separated, leave no trailing commas.");
	});
	$("#flip-2").click(function(){
		$("#panel-2").slideToggle("slow");
		$("#panel-1").slideUp("slow");
		$("#panel-3").slideUp("slow");
		$("#panel-4").slideUp("slow");
		$("#panel-5").slideUp("slow");
		HINTBOX.setFormatMessage("Enter a degree sequence to generate a graph. <br/>" +
			"The degree sequence must be a comma separated list, and cannot have trailing comma.<br/>" +
			"e.g. Degree Sequence: 2,1,1,0");
	});
	$("#flip-3").click(function(){
		$("#panel-3").slideToggle("slow");
		$("#panel-1").slideUp("slow");
		$("#panel-2").slideUp("slow");
		$("#panel-4").slideUp("slow");
		$("#panel-5").slideUp("slow");
		HINTBOX.setFormatMessage("");
	});
	$("#flip-4").click(function(){
		$("#panel-4").slideToggle("slow");
		$("#panel-1").slideUp("slow");
		$("#panel-2").slideUp("slow");
		$("#panel-3").slideUp("slow");
		$("#panel-5").slideUp("slow");
		HINTBOX.setFormatMessage("");
	});
	$("#flip-5").click(function(){
		$("#panel-5").slideToggle("slow");
		$("#panel-1").slideUp("slow");
		$("#panel-2").slideUp("slow");
		$("#panel-3").slideUp("slow");
		$("#panel-4").slideUp("slow");
		HINTBOX.setFormatMessage("");
	});
	
	//Submissions
	$("#submit-set").click(function() {
		submitSetMode();
		var nodestr = $("#nodes").val();
		var edgestr = $("#edges").val();
		
		GRAPHPARSER.parseSet(nodestr, edgestr);
	});
	$("#submit-seq").click(function() {
		submitSeqMode();
		var degstr = $("#degree-seq").val();
		
		GRAPHPARSER.parseSeq(degstr);
	});
		
	///////////////////////////////////////////////////////////////////////////////////////
	/////////////// Buttons outside the renderer, and saving                ///////////////
	/////////////// (Why this is seperate from other buttons is just        ///////////////
	/////////////// coincidence)                                            ///////////////
	///////////////////////////////////////////////////////////////////////////////////////	
	
	//Saving
	$('#Save-Form').click(function() {
		if($('#PDF').is(':checked')) { 
		   $("#Filename").val($("#Filename").val().replace(/[.].*/, ".pdf"));
		}
		else if($('#PNG').is(':checked')) { 
		   $("#Filename").val($("#Filename").val().replace(/[.].*/, ".png"));
		}
		else if($('#JPG').is(':checked')) { 
		   $("#Filename").val($("#Filename").val().replace(/[.].*/, ".jpg"));
		}
		e
	});
	$("#save-file").click(function() {
		$('#SaveModal').show();
	});
	$("#save-File-Set").click(function() {
		var filetype = $("input[name=FileType]:checked", "#Save-Form").val();
		var filename = $("#Filename").val();
		
		if(filetype === "PDF") {
			var doc = new jsPDF("l", "mm", "a4");
			var imgData = renderer.domElement.toDataURL("image/jpeg");
			doc.addImage(imgData, 'JPEG', 10, 10, CANVAS_WIDTH_LANDSCAPE, CANVAS_WIDTH_LANDSCAPE*$("#renderer").height()/$("#renderer").width());
			doc.save(filename);
		}
		else if(filetype === "PNG") {
			var imgData = renderer.domElement.toDataURL("image/png");
			download(imgData, filename);
		}
		else if(filetype === "JPG") {
			var imgData = renderer.domElement.toDataURL("image/jpeg");
			download(imgData, filename);
		}
		
		$("#SaveModal").hide();
	});
	$(".close").click(function() {
		$("#SaveModal").hide();
	});
	$("#save-Link").click(function() {		
		
		for(var i = 0; i < GRAPH.nodes.length; i++) {
			obj = scene.getObjectById(GRAPH.nodes[i].getId());
			GRAPH.nodes[i].setPosition(obj.position);
			GRAPH.nodes[i].setColor(obj.material.color.getHex());
		}
			
		GRAPH.camera.setPosition(camera.position);
		GRAPH.camera.setZoom(camera.zoom);
			
		sessionStorage.setItem('graph', GRAPH.toStringJ());
		
		//SOMETHING
	});
	
	///////////////////////////////////////////////////////////////////////////////////////
	/////////////// Maintaining the renderer and proper controls  /////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////	
	
	//Resizing and Locating Mouse
	$(window).resize(function(){
		renderer.setSize( $("#renderer").width()*.98, $("#renderer").height()*.98 );
		camera.left = $("canvas").width() / - 2;
		camera.right = $("canvas").width() / 2;
		camera.top = $("canvas").height() / 2;
		camera.bottom = $("canvas").height() / - 2;
		camera.updateProjectionMatrix();
		ANIMATIONCONTROL.positionButtons();
	});			
	$("canvas").mousemove(function(event){
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
	$("canvas").mouseleave(function() {
		controls.enable = false;
	});
	$("canvas").mouseenter(function() {
		controls.enable = true;
	});
	///////////////////////////////////////////////////////////////////////////////////////
	/////////////// Handlers for when the user actively    ////////////////////////////////
    /////////////// interacts the page.                    ////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////	
	
	//Modes
	$("canvas").click(function(event) {
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
		else if(mode == "edgeContractionMode") {
			contractEdge();
		}
		else if(mode == "renameNodeMode") {
			renameNode(event.pageX, (event.pageY - $(this).offset().top));
		}
		else if(mode == "hamiltonianPathMode"
		|| mode === "hamiltonianCycleMode"
		|| mode === "eulerianCycleMode"
		|| mode === "eulerianPathMode") {
			selectionList();
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
				SELECTED2 = scene.getObjectById(GRAPH.findNode(SELECTED1.id).getLabelId());
			}
			else if(intersects.length > 1 && intersects[1].object.userData == "Node") {
				controls.enable = false;
				SELECTED1 = intersects[1].object;
				SELECTED2 = scene.getObjectById(GRAPH.findNode(SELECTED1.id).getLabelId());
			}
		}
	});

	$("#renderer").mousemove(function(){
		if(mode == "moveNode") {
			if(SELECTED1) {
				var intersects = raycaster.intersectObject( plane );
				SELECTED1.position.set(intersects[0].point.x, intersects[0].point.y, NODE_LAYER);
				if(SELECTED2) {
					SELECTED2.position.set(intersects[0].point.x, intersects[0].point.y, LABEL_LAYER);
				}
				
				GRAPHDRAWER.repositionEdges(SELECTED1);
			}
		}
	});
	$("#renderer").mouseup(function(event){
		switch(event.which) {
			case 1:
				if(mode == "moveNode") {
				controls.enable = true;
				SELECTED1 = null;
				SELECTED2 = null;
				autoSave();
			}
				break;
			case 3:
				plane.position.set(camera.position.x, camera.position.y, PLANE_LAYER);
				break;
		}
		
	});
	
	//Naming a node via input form
	$(window).click(function(){
		cancelConfirmation++;
		
		if(cancelConfirmation == 2) {
			$("#nodeNameInput").hide();
			$("#nodeName").val("");
			cancelConfirmation = 0;
			notToBeNamed = null;
		}
	});
	$("#nodeNameInput").click(function(event){
		event.stopPropagation();
	});
	$("#nodeNameInput").on('keyup', function (e) {
		if(e.keyCode == 13 && $("#nameNodeInput").css("display") !== "none") {
			var name = $("#nodeName").val();
			nameNode(name, nodeToBeNamed);
			nodeToBeNamed = null;
			$("#nodeName").val("");
			$("#nodeNameInput").hide();
			cancelConfirmation = 0;
		}
	});
	
	
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////                               ~Misc~                                                                       ////////////////////////////////////
///////////////////////////  This section handles initializing the renderer, and setting up any other HTML for input over the canvas,  ////////////////////////////////////
/////////////////////////// the function that handles the text in the hint box, loading the graph, autosaving to session storage.      ////////////////////////////////////
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
	renderer.setSize( $("#renderer").width()*.98, $("#renderer").height()*.98 ); 
	renderer.setClearColor( 0xa0f0f0 ); 
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.sortObjects = false;
	$("#renderer").get(0).appendChild(renderer.domElement);
	
	//Control setup
	controls = new THREE.OrbitControls(camera, renderer.domElement);
	controls.target = new THREE.Vector3(0,0,NODE_LAYER);
	controls.enableRotate = false;
	
	//Used to detect where the mouse is
	plane = new THREE.Mesh(new THREE.PlaneBufferGeometry( PLANE_SIZE , PLANE_SIZE ,8,8), new THREE.MeshBasicMaterial({color: 0x000000, alphaTest: 0, visible: false}));
	plane.position.set(camera.position.x, camera.position.y, PLANE_LAYER);
	plane.userData = "Plane";
	scene.add(plane);
	
	//Allow stacking on top of canvas (buttons, inputs, etc.)
	renderer.domElement.style.position = "absolute";
	renderer.domElement.style.zIndex = 0;
	//Every element to be stacked on top the renderer
	$("#nodeNameInput").appendTo("#renderer");
	$("#nodeNameInput").css( "zIndex", 2 );
	$("#nodeNameInput").css( "position", "absolute" );
	
	//Setup of animation buttons, and other 
	ANIMATIONCONTROL.buttonSetup();
	ANIMATIONCONTROL.positionButtons();
	HINTBOX.setErrorMessage("");
	$("#nodeNameInput").hide();
	
	//Auto load anything from session storage
	if(sessionStorage.getItem('graph')) {
		load(sessionStorage.getItem('graph'));
	}
}

//Loading a Graph in
function load(str) {
	var obj = JSON.parse(str);
	var nodeMap = [];
	var newId;

	for(var i = 0; i < obj.nodes.length; i++) {
		newId = GRAPHDRAWER.addNode({load: obj.nodes[i]});
		nodeMap[obj.nodes[i].id] = newId;
	}
		
	for(var i = 0; i < obj.edges.length; i++) {
		GRAPHDRAWER.addEdge({loading: {load: obj.edges[i], nodeMap: nodeMap}});
	}
	
	camera.zoom = obj.camera.zoom;
	camera.position.set(obj.camera.position.x, obj.camera.position.y, obj.camera.position.z);
}

//Autosaving to session storage
function autoSave() {
	var obj;
	
	for(var i = 0; i < GRAPH.nodes.length; i++) {
		obj = scene.getObjectById(GRAPH.nodes[i].getId());
		GRAPH.nodes[i].setPosition(obj.position);
		GRAPH.nodes[i].setColor(DEFAULT_COLOR);
	}
		
	GRAPH.camera.setPosition(camera.position);
	GRAPH.camera.setZoom(camera.zoom);
		
	sessionStorage.setItem('graph', GRAPH.toStringJ());
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
	//Check it interesects node
	if(INTERSECTED !== null && INTERSECTED.userData == "Node") {
		//Check that there isn't already a node selected
		if(SELECTED1 == null) {
			SELECTED1 = INTERSECTED.id;
			highlightSelection();
		} 
		//Node was already selected, deselect it
		else if(INTERSECTED.id == SELECTED1) {
			unHighlightSelection();
			SELECTED1 = null;
		}
		//There is already a node selected, and the user is selecting another
		else {
			SELECTED2 = INTERSECTED.id;
			
			GRAPHDRAWER.addEdge({selections: [scene.getObjectById(SELECTED1, true), 
				scene.getObjectById(SELECTED2, true)]});
			
			unHighlightSelection(SELECTED1.id);
			SELECTED1 = SELECTED2 = null;
		}
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
	if(INTERSECTED != null && INTERSECTED.userData == "Edge") {
		GRAPHDRAWER.removeEdge(INTERSECTED.id);
	}
}
function contractEdge() {
	var intersects = raycaster.intersectObjects( scene.children );	
	if(INTERSECTED !== null && INTERSECTED.userData == "Node") {
		//Check that there isn't already a node selected
		if(SELECTED1 == null) {
			SELECTED1 = INTERSECTED.id;
			highlightSelection();
		} 
		//Node was already selected, deselect it
		else if(INTERSECTED.id == SELECTED1) {
			unHighlightSelection();
			SELECTED1 = null;
		}
		//There is already a node selected, and the user is selecting another
		else {
			SELECTED2 = INTERSECTED.id;
			
			if(GRAPH.findEdge(SELECTED1, SELECTED2) != null) {
				EDGECONTRACTION.main(SELECTED1, SELECTED2);
			} 
			
			unHighlightSelection(SELECTED1.id);
			SELECTED1 = SELECTED2 = null;
		}
	}
}
function renameNode(x, y) {
	//Pop up input box on top
	//Upon submitting, place text in front of node
	var intersects = raycaster.intersectObjects( scene.children );
	if(INTERSECTED != null && INTERSECTED.userData == "Node") {
		nodeToBeNamed = INTERSECTED.id;
		
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
function nameNode(name, nId) {
	GRAPHDRAWER.nameNode(name, nId);
}
function selectionList() {
	var intersects = raycaster.intersectObjects( scene.children );	
	if(INTERSECTED !== null && INTERSECTED.userData == "Node") {
		if(mode === "hamiltonianPathMode") {
			HAMILTONIANPATH.preselect(INTERSECTED.id);
		}
		else if(mode === "hamiltonianCycleMode") {
			HAMILTONIANCYCLE.preselect(INTERSECTED.id);
		}
	}
	else if(INTERSECTED !== null && INTERSECTED.userData == "Edge") {
		if(mode === "eulerianCycleMode") {
			EULERIANCYCLE.preselect(INTERSECTED.id);
		}
		else if(mode === "eulerianPathMode") {
			EULERIANPATH.preselect(INTERSECTED.id);
		}
	}
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////                               ~Modes~                                                                     /////////////////////////////////////
///////////////////////////  Clean up of animation, reseting selections made by the user, changing the modes, changing the hint box,  /////////////////////////////////////
/////////////////////////// and performing graph functions should be done here.                                                       /////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////	
//Drawing/One-time Graph functions/Submit - should clean and hide animation buttons
function submitSetMode() {
	resetSelection();
	cleanUp();
	ANIMATIONCONTROL.skipAnimation();
	ANIMATIONCONTROL.cleanUpAnimation();
	ANIMATIONCONTROL.hideButtons();
	ANIMATIONCONTROL.updateCounter();
	ANIMATIONCONTROL.hideColorPicker();
	ANIMATIONCONTROL.hidePreSelectButton();
	mode = "submitSetMode";
}
function submitSeqMode() {
	resetSelection();
	cleanUp();
	ANIMATIONCONTROL.skipAnimation();
	ANIMATIONCONTROL.cleanUpAnimation();
	ANIMATIONCONTROL.hideButtons();
	ANIMATIONCONTROL.updateCounter();
	ANIMATIONCONTROL.hideColorPicker();
	ANIMATIONCONTROL.hidePreSelectButton();
	mode = "submitSeqMode";
}
function drawNodeMode() {
	HINTBOX.setModeMessage("Left Click to add a node");
	resetSelection();
	cleanUp();
	ANIMATIONCONTROL.skipAnimation();
	ANIMATIONCONTROL.cleanUpAnimation();
	ANIMATIONCONTROL.hideButtons();
	ANIMATIONCONTROL.updateCounter();
	ANIMATIONCONTROL.hideColorPicker();
	ANIMATIONCONTROL.hidePreSelectButton();
	mode = "drawNode";
}
function drawEdgeMode() {
	HINTBOX.setModeMessage("Left click on two node to add an edge between them.<br/>" +
		"Left click on an already selected node to deselect it.");
	resetSelection();
	cleanUp();
	ANIMATIONCONTROL.skipAnimation();
	ANIMATIONCONTROL.cleanUpAnimation();
	ANIMATIONCONTROL.hideButtons();
	ANIMATIONCONTROL.updateCounter();
	ANIMATIONCONTROL.hideColorPicker();
	ANIMATIONCONTROL.hidePreSelectButton();
	mode = "drawEdge";
}
function deleteNodeMode() {
	HINTBOX.setModeMessage("Left click on a node to delete it.");
	resetSelection();
	cleanUp();
	ANIMATIONCONTROL.skipAnimation();
	ANIMATIONCONTROL.cleanUpAnimation();
	ANIMATIONCONTROL.updateCounter();
	ANIMATIONCONTROL.hideButtons();
	ANIMATIONCONTROL.hideColorPicker();
	ANIMATIONCONTROL.hidePreSelectButton();
	mode = "deleteNode";
}
function deleteEdgeMode() {
	HINTBOX.setModeMessage("Left click on an edge to delete it.");
	resetSelection();
	cleanUp();
	ANIMATIONCONTROL.skipAnimation();
	ANIMATIONCONTROL.cleanUpAnimation();
	ANIMATIONCONTROL.updateCounter();
	ANIMATIONCONTROL.hideButtons();
	ANIMATIONCONTROL.hideColorPicker();
	ANIMATIONCONTROL.hidePreSelectButton();
	mode = "deleteEdge";
}
function moveNodeMode() {
	HINTBOX.setModeMessage("Hold left mouse button on the node to drag it.");
	resetSelection();
	ANIMATIONCONTROL.skipAnimation();
	ANIMATIONCONTROL.cleanUpAnimation();
	ANIMATIONCONTROL.updateCounter();
	ANIMATIONCONTROL.hideButtons();
	ANIMATIONCONTROL.hideColorPicker();
	ANIMATIONCONTROL.hidePreSelectButton();
	mode = "moveNode";
}
function renameNodeMode() {
	HINTBOX.setModeMessage("Select a node, and enter the name you would like to give it in the input box that appears.<br/>"+
		"Once done, press enter.<br/>" + 
		"To delete a name or change your mind, leave the input box empty, and hit enter.");
	resetSelection();
	cleanUp();
	ANIMATIONCONTROL.skipAnimation();
	ANIMATIONCONTROL.cleanUpAnimation();
	ANIMATIONCONTROL.updateCounter();
	ANIMATIONCONTROL.hideButtons();
	ANIMATIONCONTROL.hideColorPicker();
	ANIMATIONCONTROL.hidePreSelectButton();
	mode = "renameNodeMode";
}
function clearGraphAct() {
	resetSelection();
	cleanUp();
	ANIMATIONCONTROL.skipAnimation();
	GRAPHDRAWER.clearGraph();
	ANIMATIONCONTROL.cleanUpAnimation();
	ANIMATIONCONTROL.updateCounter();
	ANIMATIONCONTROL.hideButtons();
	ANIMATIONCONTROL.hideColorPicker();
	ANIMATIONCONTROL.hidePreSelectButton();
	mode = "clearGraphMode";
}
function edgeContractionMode() {
	HINTBOX.setModeMessage("Select the two nodes to which the edge connects to contract it.");
	resetSelection();
	cleanUp();
	ANIMATIONCONTROL.skipAnimation();
	ANIMATIONCONTROL.cleanUpAnimation();
	ANIMATIONCONTROL.updateCounter();
	ANIMATIONCONTROL.hideButtons();
	ANIMATIONCONTROL.hideColorPicker();
	ANIMATIONCONTROL.hidePreSelectButton();
	mode = "edgeContractionMode";
}
function complementAct() {
	resetSelection();
	cleanUp();
	ANIMATIONCONTROL.skipAnimation();
	ANIMATIONCONTROL.cleanUpAnimation();
	ANIMATIONCONTROL.updateCounter();
	ANIMATIONCONTROL.hideButtons();
	ANIMATIONCONTROL.hideColorPicker();
	ANIMATIONCONTROL.hidePreSelectButton();
	mode = "complementMode";
	COMPLEMENT.main();
}
//Multi-solution Graph Function - should disaply buttons
function eulerianCycleMode() {
	HINTBOX.setModeMessage("If you would like to narrow the search area, you can partially preselect your own path.<br>" +
		"Click on the nodes in the order you would like them to be in path.<br/>" +
		"Click on an already selected node to remove it from the path.</br>" +
		"When you are ready, click GO, and we will try to build upon the path you have, if you put in any.");
	resetSelection();
	cleanUp();
	ANIMATIONCONTROL.skipAnimation();
	ANIMATIONCONTROL.cleanUpAnimation();
	ANIMATIONCONTROL.updateCounter();
	ANIMATIONCONTROL.showButtons();
	ANIMATIONCONTROL.swapButtons();
	ANIMATIONCONTROL.hideColorPicker();
	ANIMATIONCONTROL.showPreSelectButton();
	mode = "eulerianCycleMode";
}
function eulerianPathMode() {
	HINTBOX.setModeMessage("If you would like to narrow the search area, you can partially preselect your own path.<br>" +
		"Click on the nodes in the order you would like them to be in path.<br/>" +
		"Click on an already selected node to remove it from the path.</br>" +
		"When you are ready, click GO, and we will try to build upon the path you have, if you put in any.");
	resetSelection();
	cleanUp();
	ANIMATIONCONTROL.skipAnimation();
	ANIMATIONCONTROL.cleanUpAnimation();
	ANIMATIONCONTROL.updateCounter();
	ANIMATIONCONTROL.showButtons();
	ANIMATIONCONTROL.swapButtons();
	ANIMATIONCONTROL.hideColorPicker();
	ANIMATIONCONTROL.showPreSelectButton();
	mode = "eulerianPathMode";
}
function hamiltonianCycleMode() {
	HINTBOX.setModeMessage("If you would like to narrow the search area, you can partially preselect your own path.<br>" +
		"Click on the nodes in the order you would like them to be in path.<br/>" +
		"Click on an already selected node to remove it from the path.</br>" +
		"When you are ready, click GO, and we will try to build upon the path you have, if you put in any.<br/>" +
		"Be warned. If you preselect a node, the solutions given so far and currently being calculated will be cleared.");
	resetSelection();
	cleanUp();
	ANIMATIONCONTROL.skipAnimation();
	ANIMATIONCONTROL.cleanUpAnimation();
	ANIMATIONCONTROL.updateCounter();
	ANIMATIONCONTROL.showButtons();
	ANIMATIONCONTROL.swapButtons();
	ANIMATIONCONTROL.hideColorPicker();
	ANIMATIONCONTROL.showPreSelectButton();
	mode = "hamiltonianCycleMode";
}
function hamiltonianPathMode() {
	HINTBOX.setModeMessage("If you would like to narrow the search area, you can partially preselect your own path.<br>" +
		"Click on the nodes in the order you would like them to be in path.<br/>" +
		"Click on an already selected node to remove it from the path.</br>" +
		"When you are ready, click GO, and we will try to build upon the path you have, if you put in any.");
	resetSelection();
	cleanUp();
	ANIMATIONCONTROL.skipAnimation();
	ANIMATIONCONTROL.cleanUpAnimation();
	ANIMATIONCONTROL.updateCounter();
	ANIMATIONCONTROL.showButtons();
	ANIMATIONCONTROL.swapButtons();
	ANIMATIONCONTROL.hideColorPicker();
	ANIMATIONCONTROL.showPreSelectButton();
	mode = "hamiltonianPathMode";
}

function graphColorMode() {
	HINTBOX.setModeMessage("You can select any color you want to color the graph with.<br/>" +
		"The number indicates when that color will be used, if necessary.<br/>" +
		"When you are ready, click GO.");
	resetSelection();
	cleanUp();
	ANIMATIONCONTROL.skipAnimation();
	ANIMATIONCONTROL.cleanUpAnimation();
	ANIMATIONCONTROL.updateCounter();
	ANIMATIONCONTROL.showButtons();
	ANIMATIONCONTROL.swapButtons();
	ANIMATIONCONTROL.showColorPicker();
	ANIMATIONCONTROL.hidePreSelectButton();
	mode = "graphColorMode";
}

//Resets selections
function resetSelection() {
	if(SELECTED1 !== null) {
		unHighlightSelection();
	}
	SELECTED1 = SELECTED2 = SELECTEDEDGE = null;
}
//All functions that clean up animations,input forms, etc. for sepcific functions should go here. 
function cleanUp() {
	$("#nodeName").val("");
	$("#nodeNameInput").hide();
}
function highlightSelection() {
	scene.getObjectById(SELECTED1).material.color.setHex( 0xff0000 );
}
function unHighlightSelection() {
	scene.getObjectById(SELECTED1).material.color.setHex( DEFAULT_COLOR );
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////                               ~Animator/Renderer~                                                         /////////////////////////////////////
///////////////////////////  Functions called to animate and render go here. Also, anything that needs to be checked constantly go    /////////////////////////////////////
/////////////////////////// here, detecting where the mouse is to check for detection.                                                /////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function animate() {
	controls.update();
	plane.position.set(camera.position.x, camera.position.y, PLANE_LAYER)
		
	requestAnimationFrame(animate); 
	renderer.render(scene, camera);
	render();
}

function render() {
	//Detection and Highlighting (only applicable to object with the Lambert material (cubes and nodes))
	raycaster.setFromCamera( mouse, camera );
	var intersects = raycaster.intersectObjects( scene.children );
	if ( intersects.length > 0  && intersects[ 0 ].object.material.hasOwnProperty('emissive') && intersects[0].object.userData !== "text") {
		if ( INTERSECTED != intersects[ 0 ].object ) {
			if ( INTERSECTED ) {
				INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );
			}
			INTERSECTED = intersects[ 0 ].object;
			INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
			INTERSECTED.material.emissive.setHex( 0xff0000 );
		}
	} 
	else if(intersects[0].object.userData === "text" && intersects.length > 1 && intersects[ 1 ].object.material.hasOwnProperty('emissive')) {
		if ( INTERSECTED != intersects[ 1 ].object ) {
			if ( INTERSECTED ) {
				INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );
			}
			INTERSECTED = intersects[ 1 ].object;
			INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
			INTERSECTED.material.emissive.setHex( 0xff0000 );
		}
	}
	else {
		if ( INTERSECTED ) {
			INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );
		}
		INTERSECTED = null;
	}
}
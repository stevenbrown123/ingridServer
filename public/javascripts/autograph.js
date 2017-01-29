function parseSet(nodeStr, edgeStr) {
	var result = {
		nodeSet: new Set(),
		edgeSet: new Set(),
		errorMsg: [],
		createGraph: true
	};
		
	var nodeRegex = /[\s]*[\w][\w\s]*/;
	var edgeSetRegex = /[\s]*[\w][\w\s]*[,][\s]*[\w][\w\s]*([;][\s]*[\w][\w\s]*[,][\s]*[\w][\w\s]*)*/;
	
	if(nodeStr == "") {
		result.errorMsg.push("No nodes were named, so there was no graph to create.");
		result.createGraph = false;
		return result;
	}
	
	var strArray = nodeStr.replace(/\s+/,' ').trim();
	strArray = strArray.split(",");
	
	for(var i = 0; i < strArray.length; i++) {
		strArray[i] = strArray[i].trim();
		
		if(/^\\s*$/.test(strArray[i]) || strArray[i] == "") {
			continue;
		}
	
		if(!nodeRegex.test(strArray[i])) {
			result.errorMsg.push( "'" + strArray[i] + "' The names for the nodes can only contain numbers, letters, underscores. Names cannot start with a space.");
			result.createGraph = false;
		}
		else if(result.nodeSet.has(strArray[i])) {
			result.errorMsg.push(strArray[i] + " was already included. Duplicate names are not allowed.");
		} else {
			result.nodeSet.add(strArray[i]);
		}
		
	}

	if(edgeStr == "") {
		return result;
	}
	
	var strArray = edgeStr.replace(/\s+/,' ').trim();

	if(!edgeSetRegex.test(strArray)) {
		result.errorMsg.push("The edge set does follow the correct format.");
		result.createGraph = false;
		return result;
	}
	
	strArray = strArray.split(";");
	for(var i = 0; i < strArray.length; i++) {
		if(/^\\s*$/.test(strArray[i]) || strArray[i] == "") {
			continue;
		}
		
		strArray[i] = strArray[i].split(",");
		
		if(!(Array.isArray(strArray[i]) && strArray[i].length == 2)) {
			return edgeStr.split(";")[i] + "must have two nodes";
		}
		
		strArray[i][0] = strArray[i][0].trim();
		strArray[i][1] = strArray[i][1].trim();
		
		if(!result.nodeSet.has(strArray[i][0])) {
			result.errorMsg.push(strArray[i][0] + " was not defined as a node.");
			result.createGraph = false;
		}
		else if(!result.nodeSet.has(strArray[i][1])) {
			result.errorMsg.push(strArray[i][1] + " was not defined as a node.");
			result.createGraph = false;
		}
		else if (result.edgeSet.has([strArray[i][0], strArray[i][1]]) || result.edgeSet.has([strArray[i][1], strArray[i][0]])){
			result.errorMsg.push("Edge " + strArray[i][0] + " , " + strArray[i][1] + " was already included. Only simple graphs are allowed.");
		}
		else {
			result.edgeSet.add([strArray[i][0], strArray[i][1]]);
		}
	}
	
	result.nodeSet = Array.from(result.nodeSet);
	result.edgeSet = Array.from(result.edgeSet);
	
	return result;
}

function parseSeq(degStr) {
	var result = {
		nodeSet: new Set(),
		edgeSet: new Set(),
		errorMsg: [],
		createGraph: true
	};
	
	var degRegex = /[\s]*[\d]+[\s]*([,][\s]*[\d]+[\s]*)/;
	var degArray;
	
	if(!degRegex.test(degStr)) {
		result.errorMsg.push("The degree sequence must be a comma separated list of numbers.");
		result.createGraph = false;
		return result;
	}
	
	degArray = degStr.replace(/\s+/,' ').trim();
	degArray = degArray.split(",");
	
	for(var i = 0; i < degArray.length; i++) {
		degArray[i] = Number(degArray[i]);
	}
	
	return degArray;
}
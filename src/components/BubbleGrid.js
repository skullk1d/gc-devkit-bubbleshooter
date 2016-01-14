/*
manages bubbles added or removed from hex grid and both hex & bubbles canvases
Bubbles are Views and the hex grid is underlying canvas serving as a spacial map
*/

import ui.View;

import src.components.Bubble as Bubble;
import src.components.HexagonTools as HT;
import src.components.HexagonTools.Grid;

const HEX_WIDTH = 32;

var BubbleGrid = Class(ui.View, function (supr) {
	this.init = function (opts) {
		opts = merge(opts, {
			/*opts*/
		});

		this.opts = opts;
		this._gridWidth = opts.width; // opts.superview.style.width;
		this._gridHeight = opts.height; // opts.superview.style.height - opts.y;
		this.debugMode = opts.debugMode;

		supr(this, 'init', [opts]);

		this.build();
	};

	this.build = function () {
		// shouldn't need to modify underlying hex grid once created, only update bubbles after
		this.bubbles = {};

		// setup static hexagon properties
		var hexWidth = HEX_WIDTH; // scale for native canvas
		var hexHeight = HEX_WIDTH;

		var gridW = this._gridWidth;
		var gridH = this._gridHeight;

		var y = hexHeight/2.0;

		var a = -3.0; // quadratic
		var b = (-2.0 * hexWidth);
		var c = (Math.pow(hexWidth, 2)) + (Math.pow(hexHeight, 2));

		var z = (-b - Math.sqrt(Math.pow(b,2)-(4.0*a*c)))/(2.0*a);

		var x = (hexWidth - z)/2.0;

		HT.Hexagon.Static.WIDTH = hexWidth;
		HT.Hexagon.Static.HEIGHT = hexHeight;
		HT.Hexagon.Static.SIDE = z;

		// hexagons are now setup, now create the grid
		this._hexGrid = new HT.Grid(gridW, gridH);

		this.reset();

		this.setupEvents();
	};

	this.setupEvents = function () {
	};

	this.fillRows = function (rowFrom, rowTo) {
		// inclusive rows, 1-indexed

		/*var rowFromLetter = LETTERS[rowFrom] || 'A';
		var rowToLetter = LETTERS[rowTo] || rowFromLetter;*/

		rowTo = rowTo || rowFrom; // incl zero

		// visual coords are 1-indexed but grid manages with zero-index
		rowFrom -= 1;

		// 4 stacked, connected offset hexes leave 20% free space, thus:
		var hexesPerWidth = Math.round(this._gridWidth / (HEX_WIDTH * 0.8));

		// use row-col coords to get the proper hex ids to populate
		// note: need to do this because rows based on letter, not number
		// note: odd rows have hexes with odd number ids, same as even
		var i, j;
		for (i = rowFrom; i <= rowTo; i += 1) {
			var colStart = i % 2 === 0 ? 0 : 1; // even or odd (raw cols/rows are zero indexed)
			for (j = colStart; j < hexesPerWidth; j += 2) { // every other
				var hexId = this._hexGrid.GetHexId(i, j); // row, col
				var curHex = this._hexGrid.GetHexById(hexId);
				this.addBubble({ hex: curHex });
			}
		}
	};

	this.addBubble = function (params) {
		params = params || {};
		var hex = params.hex || this._getHex(params);

		// no hex, or hex already has bubble
		if (!hex || this.bubbles[hex.Id]) {
			return console.warn('could not add bubble to hex grid');
		}

		var bubble = new Bubble({
			id: hex.Id,
			x: hex.x,
			y: hex.y,
			width: HEX_WIDTH,
			height: HEX_WIDTH,
			bubType: params.bubType
		});

		// map hex grid with bubble view
		this.bubbles[hex.Id] = bubble;

		return bubble;
	};

	this.removeBubble = function (params) {
		params = params || {};
		var hex = params.hex || this._getHex(params);

		if (!hex) {
			return console.error('could not remove bubble from hex grid');
		}

		var bubble = this.bubbles[hex.Id];
		if (!bubble) {
			return console.error('hex', hex.Id, 'does not contain a bubble');
		}
		bubble.toRemove = true;
	};

	this.getBubbleAt = function (point) {
		var hex = this._getHex({ point: point });
		if (!hex) {
			return console.warn('Requested point outside of hex grid');
		}
		return this.bubbles[hex.Id];
	};

	this.getAdjacentsAt = function (bubble) {
		var neighbors = [];

		var bubHex = this._hexGrid.GetHexById(bubble.id);
		var hexCoord = {
			coOrdX: bubHex.PathCoOrdX,
			coOrdY: bubHex.PathCoOrdY
		};

		// note: letters are horizontal, coOrdY-coOrdXs are num
		// pathCoOrd is coOrdY-coOrdX hex coords
		// hexes exist in clusters of 7, process clockwise, from topleft neighbor
		var transforms = [
			{ coOrdX: -1, coOrdY: -1 },
			{ coOrdX: 0, coOrdY: -1 },
			{ coOrdX: 1, coOrdY: 0 },
			{ coOrdX: 1, coOrdY: 1 },
			{ coOrdX: 0, coOrdY: 1 },
			{ coOrdX: -1, coOrdY: 0 },
		];

		for (var i = 0; i < transforms.length; i += 1) {
			var trans = transforms[i];
			var neighborCoOrd = {
				coOrdX: (hexCoord.coOrdX + trans.coOrdX),
				coOrdY: (hexCoord.coOrdY + trans.coOrdY)
			};

			// get hex Id which matches bubble id, if exists
			var neighborHex = this._hexGrid.GetHexByCoOrd(neighborCoOrd.coOrdX, neighborCoOrd.coOrdY);
			if (!neighborHex) { // reached edge of grid
				continue;
			}

			var neighborBub = this.bubbles[neighborHex.Id];

			if (neighborBub) {
				neighbors.push(neighborBub);
			}
		}

		return neighbors;
	};

	this.getClusterAt = function (bubble) {
		// starting at a bubble, return all bubbles found in a cluster (Match-3)
		var activeType = bubble.bubType;
		var processQueue = [ bubble ].concat(this.getAdjacentsAt(bubble)); // start with self & neighbors
		var cluster = []; // results

		/*
		solution: add neighbors of current bubble to process buffer
		check each bubble type in the queue against the start bubble til match
		if matching neighbor, add that neighbor to [cluster] array, then add that neighbor's adjacents to the process queue
		keep going til there are no more bubbles in the process queue
		*/
		// note: flag processed bubs so if they end up as adjacents to another bub, they aren't double checked

		// loop through clusters recursively until there are no more matches
		var i, j;
		while (processQueue.length) {
			var curBub = processQueue.pop();
			if (curBub.bubType === activeType && !curBub.processed) {
				processQueue = processQueue.concat(this.getAdjacentsAt(curBub));
				cluster.push(curBub);
			}
			curBub.processed = true;
		}

		// reset flags
		for (var id in this.bubbles) {
			this.bubbles[id].processed = false;
		}

		return cluster;
	};

	this.reset = function () {
		for (var id in this.bubbles) {
			this.removeBubble({ id: id });
		}
	};

	this.draw = function (ctx) {
		// pass in context of view in which grid exists
		// draw hexes to hex grid canvas and their bubbles to bubble canvas
		for(var h in this._hexGrid.Hexes) {
			var curHex = this._hexGrid.Hexes[h];
			if (this.debugMode) {
				curHex.draw(ctx);
			}

			var bubble = this.bubbles[curHex.Id];
			if (!bubble) {
				continue;
			}

			if (bubble.toRemove) {
				this.removeSubview(bubble);
				delete this.bubbles[bubble.id];
			} else {
				this.addSubview(bubble);
			}
		}
	};

	this.render = function (ctx) {
		this.draw(ctx);
	};

	// private

	this._getHex = function (params) {
		params = params || {};
		if (params.point) {
			params.point = { X: params.point.x, Y: params.point.y }; // adapted from HT class
		}

		// can retrieve by point or id
		var hex = this._hexGrid.GetHexById(params.id) ||
			this._hexGrid.GetHexAt(params.point) ||
			this._hexGrid.GetNearestHex(params.point);

		return hex;
	};
});

BubbleGrid.Static = {
	HEX_WIDTH: HEX_WIDTH
};

exports = BubbleGrid;
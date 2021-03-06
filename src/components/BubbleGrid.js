/*
manages bubbles added or removed from hex grid and both hex & bubbles canvases
Bubbles are Views and the hex grid is underlying canvas serving as a spacial map
*/
import animate;

import ui.View;

import src.components.Bubble as Bubble;
import src.components.HexagonTools as HT;
import src.components.HexagonTools.Grid;

const HEX_WIDTH = 32;
const GRAVITY = 750;

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
		this.specialBubbles = {}; // objective bubbles etc
		this.hexesPerLetterRow = 0; // letter-based Ids, flush
		this.hexesPerLetterCol = 0;
		this.hexesPerRow = 0; // number based row/cols, staggered
		this.hexesPerCol = 0;

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

		this.sweep();

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

		// 4 stacked, connected offset hexes leave 20% free space for rows, 50% for cols thus:
		this.hexesPerRow = Math.round(this._gridWidth / (HEX_WIDTH * 0.8));
		this.hexesPerCol = Math.floor(this._gridHeight / (HEX_WIDTH * 0.5));

		// use row-col coords to get the proper hex ids to populate
		// note: need to do this because rows based on letter, not number
		// note: odd rows have hexes with odd number ids, same as even
		var bubsToAdd = [];

		var i, j;
		for (i = rowFrom; i <= rowTo; i += 1) {
			var colStart = i % 2 === 0 ? 0 : 1; // even or odd (raw cols/rows are zero indexed)
			for (j = colStart; j < this.hexesPerRow; j += 2) { // every other
				var hexId = this._hexGrid.GetHexId(i, j); // row, col
				var curHex = this._hexGrid.GetHexById(hexId);
				bubsToAdd.push(curHex.Id);
			}
		}

		this.addBubbles(bubsToAdd);

		this.hexesPerLetterRow = Math.floor(this.hexesPerRow / 2);
		this.hexesPerLetterCol = Math.round(this.hexesPerCol / 2);
	};

	this._addBubble = function (params) {
		params = params || {};

		var hex = this._getHex(params);

		// no hex, or hex already has bubble
		if (!hex || this.bubbles[hex.Id]) {
			var existingBub = hex && this.bubbles[hex.Id];
			this.emit('addBubbleFailed', existingBub);
			return console.warn('could not add bubble to hex grid');
		}

		var bubble = new Bubble({
			id: hex.Id,
			x: hex.x,
			y: hex.y,
			coOrdX: hex.PathCoOrdX,
			coOrdY: hex.PathCoOrdY,
			width: HEX_WIDTH,
			height: HEX_WIDTH,
			bubType: params.bubType
		});

		// map hex grid with bubble view
		this.bubbles[hex.Id] = bubble;
		this.addSubview(bubble);

		// objective bubble?
		if (params.isSpecial) {
			this.makeBubbleSpecial(bubble);
		}

		this._animateAdd(bubble);

		return bubble;
	};

	this._removeBubble = function (params) {
		// can remove bubble by bubble, hex id, or point
		params = params || {};

		var self = this;

		function doRemove(bubble) {
			bubble.toRemove = true; // protect from double processing
			delete self.bubbles[bubble.id];

			// notify for special bubbles
			if (bubble.isSpecial) {
				delete self.specialBubbles[bubble.id];
				self.emit('removeBubbleSpecial', bubble);
			}

			if (params.shouldAnimate) {
				self._animateRemove(bubble, function () {
					 // safe to remove after animation
					self.removeSubview(bubble);
				});
			} else {
				self.removeSubview(bubble);
			}
		}

		var bubble = params.bubble || this.bubbles[params.id];
		if (bubble) {
			return doRemove(bubble);
		}

		var hex = params.hex || this._getHex(params);
		if (!hex) {
			return console.error('could not remove bubble from hex grid');
		}

		bubble = this.bubbles[hex.Id];
		if (!bubble) {
			return console.error('hex', hex.Id, 'does not contain a bubble');
		}

		doRemove(bubble);
	};

	this.addBubbles = function (bubblesIdsOrPoints, bubType) {
		// pass in an array of [ point ] or [ bubble ] or [ id ]
		var arr = bubblesIdsOrPoints;
		var addedBubbles = [];
		var i, params;
		for (i = 0; i < arr.length; i += 1) {
			var item = arr[i];
			if (item instanceof Bubble) { // bubble
				params = { bubble: item };
			} else if (typeof item === 'string') { // hex id
				params = { id: item };
			} else { // point
				params = { point: item };
			}

			params.bubType = bubType; // optional

			addedBubbles.push(this._addBubble(params));
		}

		this.emit('addedBubbles', addedBubbles); // return newly created bubbles

		return addedBubbles;
	};

	this.removeBubbles = function (bubblesIdsOrPoints, shouldAnimate) {
		shouldAnimate = shouldAnimate === undefined ? true : shouldAnimate;

		// pass in an array of [ point ] or [ bubble ] or [ id ]
		var arr = bubblesIdsOrPoints;
		var i, params;
		for (i = 0; i < arr.length; i += 1) {
			var item = arr[i];
			if (item instanceof Bubble) { // bubble
				params = { bubble: item };
			} else if (typeof item === 'string') { // hex or bubble id
				params = { id: item };
			} else { // point
				params = { point: item };
			}

			params.shouldAnimate = shouldAnimate;
			this._removeBubble(params);
		}

		this.emit('removedBubbles');
	};

	this.getBubbleAt = function (point) {
		// point or coOrd
		var hex = this._getHex({ point: point });
		if (!hex) {
			return console.warn('Requested point outside of hex grid');
		}
		return this.bubbles[hex.Id];
	};

	this.getAdjacentsAt = function (hexId) {
		// NOTE: bubble ids match hex ids
		var neighborIds = [];

		var bubHex = this._hexGrid.GetHexById(hexId);
		var hexCoord = {
			coOrdX: bubHex.PathCoOrdX,
			coOrdY: bubHex.PathCoOrdY
		};

		// note: letters are horizontal, coOrdY-coOrdXs are num
		// pathCoOrd is coOrdY-coOrdX hex coords
		// hexes exist in clusters of 7, process clockwise, from topleft neighbor
		var transforms = [
			{ coOrdX: -1, coOrdY: -1 }, // top left
			{ coOrdX: 0, coOrdY: -1 }, // top
			{ coOrdX: 1, coOrdY: 0 }, // top right
			{ coOrdX: 1, coOrdY: 1 }, // bot right
			{ coOrdX: 0, coOrdY: 1 }, // bot
			{ coOrdX: -1, coOrdY: 0 } // bot left
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

			neighborIds.push(neighborHex.Id); // results are CW from top left
		}

		return neighborIds;
	};

	this.getClusterAt = function (bubble, matchType, reset) {
		// starting at a bubble, return all bubbles found in a cluster (Match-3)
		var activeType = bubble.bubType;
		var processQueue = [ bubble ]; // start with self & neighbors
		var adjacentIds = this.getAdjacentsAt(bubble.id);
		var cluster = []; // results

		var i, adjBub;

		for (i = 0; i < adjacentIds.length; i += 1) {
			adjBub = this.bubbles[adjacentIds[i]];
			if (adjBub) {
				processQueue.push(adjBub);
			}
		}

		if (reset) {
			this._resetFlags(); // reset algo queue
		}

		/*
		solution: add neighbors of current bubble to process buffer
		check each bubble type in the queue against the start bubble til match
		if matching neighbor, add that neighbor to [cluster] array, then add that neighbor's adjacents to the process queue
		keep going til there are no more bubbles in the process queue
		*/
		// note: flag processed bubs so if they end up as adjacents to another bub, they aren't double checked

		// loop through clusters recursively until there are no more matches
		while (processQueue.length) {
			var curBub = processQueue.pop();
			if (curBub.processed) {
				continue;
			}
			curBub.processed = true;

			if (matchType && (curBub.bubType !== activeType)) {
				continue;
			}

			adjacentIds = this.getAdjacentsAt(curBub.id);

			for (i = 0; i < adjacentIds.length; i += 1) {
				adjBub = this.bubbles[adjacentIds[i]];
				if (adjBub) {
					processQueue.push(adjBub);
				}
			}

			cluster.push(curBub);
		}

		return cluster;
	};

	this.getFloaters = function () {
		// return all bubbles floating in midair
		var floaters = [];

		this._resetFlags();

		/*
		solution: find all assorted clusters,
		if any do NOT have a bubble in the top row, the closter is floating
		iterate through all bubbles, gettin their clusters
		process eacg cluster for at least one bubble attached to top
		if none attached to top, concat whole cluster to [floaters]
		*/

		for (var id in this.bubbles) {
			var curBub = this.bubbles[id];

			// flagged if its own cluster was searched or was found in another's cluster, or tagged for removal
			if (curBub.processed || curBub.toRemove) {
				continue;
			}

			var cluster = this.getClusterAt(curBub);
			var isFloating = true;

			for (var i = 0; i < cluster.length; i += 1) {
				var clusBub = cluster[i];

				// cluster contains at least one top-row bubble
				if (clusBub.style.y <= HEX_WIDTH / 2) {
					isFloating = false;
					break;
				}
			}

			if (isFloating) {
				floaters = floaters.concat(cluster);
			}
		}

		return floaters;
	};

	this.sweep = function (shouldAnimate) {
		this.removeBubbles(Object.keys(this.bubbles), shouldAnimate);
	};

	this.draw = function (ctx) {
		// pass in context of view in which grid exists
		// draw hexes to hex grid canvas
		if (!this.debugMode) {
			return;
		}

		for(var h in this._hexGrid.Hexes) {
			var curHex = this._hexGrid.Hexes[h];
			curHex.draw(ctx);
		}
	};

	this.render = function (ctx) {
		this.draw(ctx);
	};

	this.makeBubbleSpecial = function (bubble, shouldSpecial) {
		shouldSpecial = shouldSpecial === undefined ? true : shouldSpecial;
		bubble.makeSpecial(shouldSpecial);
		if (shouldSpecial) {
			this.specialBubbles[bubble.id] = bubble;
		} else {
			delete this.specialBubbles[bubble.id];
		}
	};

	this.pushNewRow = function () {
		// push row from top, a la survival mode
		var bubsToRemove = []; // top row

		// starting from bottom row, take bubble type of hex above and reassign to hex below it
		var i, j; // col, row
		for (i = this.hexesPerCol - 1; i >= 0; i -= 1) {
			for (j = this.hexesPerRow - 1; j >= 0; j -= 1) {
				// shift down
				var hexId = this._hexGrid.GetHexId(i, j);
				var bubble = this.bubbles[hexId];

				hexId = this._hexGrid.GetHexId(i + 1 + 1, j); // every other letter per staggered row
				if (!this._getHex({ id: hexId })) {
					// on bottom row
					continue;
				}

				// match the below bubble or remove it, depending on above bubble
				var belowBubble = this.bubbles[hexId];
				if (bubble) {
					belowBubble = belowBubble || this.addBubbles([ hexId ])[0];
					belowBubble.setBubType(bubble.bubType);
					if (bubble.isSpecial) {
						this.makeBubbleSpecial(bubble, false);
						this.makeBubbleSpecial(belowBubble);
					}
				} else if (belowBubble) {
					this.removeBubbles([ belowBubble ], false);
				}

				// reached top connected row (staggered rows A & B), remove
				if ((i <= 1) && bubble) {
					bubsToRemove.push(bubble);
				}
			}
		}

		// fill first row
		this.once('removedBubbles', function () {
			this.fillRows(1);
		});
		this.removeBubbles(bubsToRemove, false);
	};

	// private

	this._getHex = function (params) {
		params = params || {};

		var hex;

		// can retrieve by point (xy or coOrdXY) or id
		if (params.point) {
			var point = params.point;
			// point or coOrd
			if (point.x) {
				point = { X: point.x, Y: point.y }; // adapted from HT class
				hex = this._hexGrid.GetNearestHex(point);
			} else if (point.coOrdX) {
				hex = this._hexGrid.GetHexByCoOrd(point.coOrdX, point.coOrdY);
			}
		} else if (params.id) {
			hex = this._hexGrid.GetHexById(params.id);
		}

		/*if (!hex) {
			console.warn('Could not retrieve hex');
		}*/

		return hex;
	};

	this._resetFlags = function () {
		// reset flags
		for (var id in this.bubbles) {
			this.bubbles[id].processed = false;
		}
	};

	// animations for added / removed bubs
	this._animateAdd = function (bubble, cb) {
		/*animate(bubble).now({ y: this.style.height + this.style.y + 100 }, GRAVITY, animate.easeIn).then(function () {
			if (cb) {
				cb();
			}
		});*/
	};

	this._animateRemove = function (bubble, cb) {
		animate(bubble).now({ y: this.style.height + this.style.y + 100 }, GRAVITY, animate.easeIn).then(function () {
			if (cb) {
				cb();
			}
		});
	};
});

BubbleGrid.Static = {
	HEX_WIDTH: HEX_WIDTH
};

exports = BubbleGrid;
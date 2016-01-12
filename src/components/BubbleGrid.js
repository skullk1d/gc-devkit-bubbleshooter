/*
manages bubbles added or removed from hex grid and both hex & bubbles canvases
Bubbles are Views and the hex grid is underlying canvas serving as a spacial map
*/

import device;
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
		this._gridWidth = opts.superview.style.width;
		this._gridHeight = opts.superview.style.height;

		supr(this, 'init', [opts]);

		this.build();
	};

	this.build = function () {
		// shouldn't need to modify underlying hex grid once created, only update bubbles after
		this.bubbles = {};

		// setup static hexagon properties
		var hexWidth = HEX_WIDTH;
		var hexHeight = HEX_WIDTH;

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
		this._hexGrid = new HT.Grid(this._gridWidth, this._gridHeight);

		// setup canvas layers for hex grid and bubble grid
		var Canvas = device.get('Canvas');

		this._canvasGrid = new Canvas({width: this._gridWidth, height: this._gridHeight});
		this._contextGrid = this._canvasGrid.getContext('2d');

		this._canvasBubbles = new Canvas({width: this._gridWidth, height: this._gridHeight});
		this._contextBubbles = this._canvasBubbles.getContext('2d');

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
		var hexesPerWidth = Math.floor(this._gridWidth / (HEX_WIDTH * 0.8));

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

		if (!hex) {
			return console.error('could not add bubble to hex grid');
		}

		var bubble = new Bubble({
			id: hex.Id,
			radius: HEX_WIDTH,
			x: hex.x/2,
			y: hex.y/2,
			width: HEX_WIDTH,
			height: HEX_WIDTH
		});

		// map hex grid with bubble view
		this.bubbles[hex.Id] = bubble;
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

	this.reset = function () {
		for (var id in this.bubbles) {
			this.removeBubble({ id: id });
		}
	};

	this.draw = function (ctx) {
		// pass in context of view in which grid exists
		this._contextGrid.clearRect(0, 0, this._gridWidth, this._gridHeight);

		// draw hexes to hex grid canvas and their bubbles to bubble canvas
		for(var h in this._hexGrid.Hexes) {
			var curHex = this._hexGrid.Hexes[h];
			curHex.draw(this._contextGrid);

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

		ctx.drawImage(this._canvasGrid, 0, 0);
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
		var hex = this._hexGrid.Hexes[params.id] || this._hexGrid.GetHexAt(params.point);
		return hex;
	};
});

exports = BubbleGrid;
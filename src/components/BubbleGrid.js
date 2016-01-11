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
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

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

		this.bubbles = {};

		// log this hexagon on tap
		/*this._canvasGrid.addEventListener('touchend', e => {
			console.log('tapped', e);
		});*/
	};

	this.fillToRow = function (rowNum) {
		this.reset();

		// starting num rows of bubbles
		var rowLetter = LETTERS[rowNum] || 'Z';

		var didInitBubs = false;
		for(var h in this._hexGrid.Hexes) {
			// draw the hexes
			var curHex = this._hexGrid.Hexes[h];

			// populate bubbles only to init num rows
			// note: hex PathCoOrd X Y is this._hexGrid x y, x y is page x y
			if (curHex.Id.indexOf(rowLetter) > -1 || didInitBubs) {
				didInitBubs = true;
				continue;
			}

			this.addBubble({ hex: curHex });
		}
	};

	this.addBubble = function (params) {
		params = params || {};

		var hex = params.hex || this._hexGrid.Hexes[params.id] || this._hexGrid.GetHexAt(params.point);

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

		var hex = params.hex || this._hexGrid.Hexes[params.id] || this._hexGrid.GetHexAt(params.point);

		if (!hex) {
			return console.error('could not remove bubble from hex grid');
		}

		delete this.bubbles[hex.Id];
	};

	this.reset = function () {
		this.bubbles = {};
	};

	this.draw = function (ctx) { // pass in context of view in which grid exists
		// setup canvas layers for hex grid and bubble grid
		var Canvas = device.get('Canvas');

		this._canvasGrid = new Canvas({width: this._gridWidth, height: this._gridHeight});
		this._contextGrid = this._canvasGrid.getContext('2d');

		this._canvasBubbles = new Canvas({width: this._gridWidth, height: this._gridHeight});
		this._contextBubbles = this._canvasBubbles.getContext('2d');

		this._contextGrid.clearRect(0, 0, this._gridWidth, this._gridHeight);

		// draw hexes to hex grid canvas and their bubbles to bubble canvas
		for(var h in this._hexGrid.Hexes) {
			var curHex = this._hexGrid.Hexes[h];
			curHex.draw(this._contextGrid);

			var bubble = this.bubbles[curHex.Id];
			if (bubble) {
				this.addSubview(bubble);
			}
		}

		ctx.drawImage(this._canvasGrid, 0, 0);
	};

	this.render = function (ctx) {
		this.draw(ctx);
	};
});

exports = BubbleGrid;
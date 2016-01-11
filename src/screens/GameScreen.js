import device;
import ui.View;

import src.components.BubbleGrid as BubbleGrid;

/*
 * The game screen is a singleton view that consists of
 * a scoreboard, bubble grid, player's cannon, and bubble queue.
 */

/* Some game constants.
 */
 const VIEW_WIDTH = 320;
 const VIEW_HEIGHT = 480;

/* The GameScreen view is a child of the main application.
 * By adding the scoreboard and the grid as it's children,
 * everything is visible in the scene graph.
 */
exports = Class(ui.View, function (supr) {
	this.init = function (options) {
		options = merge(options, {
			x: 0,
			y: 0,
			width: 320,
			height: 480,
		});

		supr(this, 'init', [options]);

		this.build();
	};

	/*
	 * Layout the scoreboard and grid level design
	 */
	this.build = function () {
		this.on('app:start', this.startGame.bind(this));

		var x_offset = 5;
		var y_offset = 160;
		var y_pad = 25;
		var layout = [[1, 0, 1], [0, 1, 0], [1, 0, 1]]; // TODO: adapt this bubble layout

		this.style.width = VIEW_WIDTH;
		this.style.height = VIEW_HEIGHT;

		this.bubbleGrid = new BubbleGrid({ superview: this });
		this.addSubview(this.bubbleGrid);
	};

	this.startGame = function () {
		// init bubbles
		this.bubbleGrid.fillToRow(8);
	};

	this.render = function (context) {
		this.bubbleGrid.draw(context);
	};
});

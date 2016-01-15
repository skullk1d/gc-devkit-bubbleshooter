import animate;
import device;
import math.geom.Rect as Rect;
import math.geom.intersect as intersect;
import math.geom.Line as Line;

import ui.ImageView;
import ui.resource.Image as Image;
import ui.TextView;
import ui.View;

import src.components.BubbleGrid as BubbleGrid;
import src.components.Shooter as Shooter;
import src.components.soundcontroller as soundcontroller;

import src.enums as Enums;

/*
 * The game screen is a singleton view that consists of
 * a scoreboard, bubble grid, player's cannon, and bubble queue.
 */

// const
 const VIEW_WIDTH = 320;
 const VIEW_HEIGHT = 480;
 const MATCH_BENCH = 3; // match 3 cluster
 const LEVEL_MULTIPLIER = 2;
 const BUBBLE_POINTS = 50;

var skin = Enums.Skins.TOON;
var path = 'resources/images/' + skin;
var bgLvl1 = new Image({ url: path + '/bgLvl1.png' });

/* The GameScreen view is a child of the main application.
 * By adding the scoreboard and the grid as it's children,
 * everything is visible in the scene graph.
 */
exports = Class(ui.View, function (supr) {
	this.init = function (options) {
		options = merge(options, {
			x: 0,
			y: 0,
			width: VIEW_WIDTH,
			height: VIEW_HEIGHT
		});

		supr(this, 'init', [options]);

		this.build();
	};

	/*
	 * Layout the scoreboard and grid level design
	 */
	this.build = function () {
		this.on('app:start', this.startGame.bind(this));

		this._levelLayouts = [
			[1,4],
			[1,6],
			[1,8]
		]; // TODO: staggar fill rows and link at least one bubble between
		this.currentLevel = 0;
		this._isLaunching = false;
		this.score = 0;

		this.style.width = VIEW_WIDTH;
		this.style.height = VIEW_HEIGHT;

		var shooterHeight = BubbleGrid.Static.HEX_WIDTH;
		var bubbleGridOffsetX = BubbleGrid.Static.HEX_WIDTH * 0.2;
		var bubbleGridOffsetY = 68 * 2;

		// bg
		this.background = new ui.ImageView({
			superview: this,
			image: bgLvl1,
			x: 0,
			y: 0,
			width: VIEW_WIDTH,
			height: VIEW_HEIGHT
		});

		// grid
		this.bubbleGrid = new BubbleGrid({
			debugMode: false, // draw visible hex grid
			superview: this,
			width: VIEW_WIDTH - (bubbleGridOffsetX * 2),
			height: VIEW_HEIGHT - shooterHeight - bubbleGridOffsetY,
			x: bubbleGridOffsetX,
			y: bubbleGridOffsetY, // based on bg art
			zIndex: 1
		});

		// shooter
		this.shooter = new Shooter({
			superview: this,
			x: 0,
			y: VIEW_HEIGHT - shooterHeight,
			width: VIEW_WIDTH,
			height: shooterHeight,
			bubbleGrid: this.bubbleGrid, // register
			zIndex: 0 // if arrow or cannon should be under or over next bubble
		});

		// score
		var scoreParams = {
			superview: this,
			x: 0,
			y: 28,
			width: 300,
			height: 28,
			autoSize: false,
			size: 24,
			verticalAlign: 'middle',
			horizontalAlign: 'right',
			wrap: false,
			strokeWidth: '3',
			strokeColor: '#403E3E',
			color: '#fff',
			text: '0'
		};
		this.scoreboard = new ui.TextView(scoreParams);

		scoreParams.y = scoreParams.y - scoreParams.height;
		scoreParams.text = 'Score';
		var scoreLabel = new ui.TextView(scoreParams);

		// animations
		this._animator = animate(this.shooter.activeBubble);

		this.setupEvents();
	};

	this.setupEvents = function () {
		var self = this;

		// DEBUG: add/remove bubbles to hexagon on tap
		// note: keep around for CREATE YOUR OWN LEVEL feature?
		/*var grid = this.bubbleGrid;
		this.onInputSelect = function (e, point) {
			(grid.getBubbleAt(point) ? grid.removeBubbles : grid.addBubbles).call(grid, [ { point: point } ]);
		};*/

		var sound = soundcontroller.getSound();

		var bubbleGrid = this.bubbleGrid;

		// capture touches for aim and launch
		this.onInputStart = function (evt, point) {
			this.shooter.aimAt(point);
		};
		this.onInputMove = function (evt, point) {
			this.shooter.aimAt(point);
		};
		this.onInputSelect = function (evt, point) {
			this.shooter.aimAt(point);
			if (!this._isLaunching) {
				this.shooter.shouldLaunch = true;
				this._isLaunching = true;
				sound.play('shoot');
			}
		};

		this.shooter.on('collided', function (point) {
			sound.play('bubble');

			var cluster = [];
			var floaters = [];

			// attach active bubble to nearest hex
			function doReset() {
				if (!self._isLaunching) {
					return;
				}
				self._isLaunching = false;
				self.shooter.reset();
				return self.emit('resetLaunch');
			}

			var addedBubble = bubbleGrid.addBubbles([ point ], this.activeBubble.bubType)[0];

			if (!addedBubble) {
				// TODO: failed to add, trigger loseGame
				return doReset();
			}

			var i, bub;

			// detect match / clusters
			cluster = bubbleGrid.getClusterAt(addedBubble, true, true);
			if (cluster.length >= MATCH_BENCH) {
				// sound and score
				sound.play('success');
				self.addScore(cluster.length);

				// remove floaters after matches removed
				bubbleGrid.once('removedBubbles', function () {
					floaters = bubbleGrid.getFloaters();
					if (floaters.length) {
						self.addScore(floaters.length);

						// wait til everything done before allowing player to shoot again
						bubbleGrid.once('removedBubbles', function () {
							return doReset();
						});
						bubbleGrid.removeBubbles(floaters);
					} else {
						return doReset();
					}
				});

				// remove all bubs in the cluster
				bubbleGrid.removeBubbles(cluster);
			}

			doReset();
		});

		// game states
		bubbleGrid.on('removeBubbleSpecial', function () {
			self.endGame(Enums.GameStates.WIN);
		});

		bubbleGrid.on('addBubbleFailed', function () {
			// TODO: fix rogue lose state from rogue failed-to-add bubbles
			/*self.endGame(Enums.GameStates.LOSE);*/
		});
	};

	this.startGame = function () {
		var bubbleGrid = this.bubbleGrid;
		var layout = this._levelLayouts[this.currentLevel];
		if (!layout) {
			// no more levels, won the game!
			this.endGame(Enums.GameStates.GAME_OVER_WIN);
		}

		// pass in 2d array of layouts to init bubble
		this.reset(function () {
			// choose a random special "win" bubble within the first 3 rows (A-C)
			bubbleGrid.once('addedBubbles', function () {
				var randBub;
				while (!randBub) {
					var letterIds = ['A', 'B', 'C'];
					var randBubId = letterIds[Math.floor(Math.random() * (letterIds.length))] +
						Math.floor(Math.random() * (bubbleGrid.hexesPerRow) + 1);
					randBub = bubbleGrid.bubbles[randBubId];
				}

				randBub.makeSpecial();
			});

			bubbleGrid.fillRows(layout[0], layout[1]); // rows from, to
		});
	};

	this.endGame = function (state) {
		this.emit('endGame');

		switch (state) {
			case Enums.GameStates.WIN:
				// win level, dispaly feedback, tap to continue
				this.currentLevel += 1;
				this.startGame();
				break;

			case Enums.GameStates.LOSE:
				this.once('InputSelect', this.startGame);
				break;
		}
	};

	this.reset = function (cb) {
		// wait for last launch to complete before moving on
		if (this._isLaunching) {
			return this.once('resetLaunch', function () {
				this.reset(cb);
			});
		}

		this.bubbleGrid.once('removedBubbles', function () {
			if (cb) {
				cb();
			}
		});
		this.bubbleGrid.sweep();
	};

	this.addScore = function (numBubbles) {
		var points = numBubbles * BUBBLE_POINTS + this.currentLevel * LEVEL_MULTIPLIER;
		this.score += points;
		this.scoreboard.setText(this.score.toString());
	};
});

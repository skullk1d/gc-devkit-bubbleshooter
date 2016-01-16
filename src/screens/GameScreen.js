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
 const BUBBLE_POINTS = 50;
 const TURN_BENCH = 6;

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
			[1,8],
			[1,8],
			[1,8]
		]; // TODO: staggar fill rows and link at least one bubble between
		this.currentLevel = 0;
		this._isLaunching = false;
		this.score = 0;
		this._turnCount = 0;

		this.style.width = VIEW_WIDTH;
		this.style.height = VIEW_HEIGHT;

		var shooterHeight = BubbleGrid.Static.HEX_WIDTH;
		var bubbleGridOffsetX = BubbleGrid.Static.HEX_WIDTH * 0.2;
		var bubbleGridOffsetY = 60 * 2;

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

		// collisions
		this.shooter.on('collided', this.processCollision.bind(this));

		// game states
		bubbleGrid.on('removeBubbleSpecial', function () {
			if (!self._isLaunching) {
				return;
			}
			sound.play('cheer');
			if (!Object.keys(bubbleGrid.specialBubbles).length) {
				self.endGame(Enums.GameStates.WIN);
			}
		});
		bubbleGrid.on('addBubbleFailed', function () {
			// TODO: fix rogue lose state from rogue failed-to-add bubbles
			/*self.endGame(Enums.GameStates.LOSE);*/
		});
	};

	this.startGame = function () {
		var self = this;

		var bubbleGrid = this.bubbleGrid;

		// DEBUG: infinite mode, when run out repeat final layout but increase level + multiplier
		var layout = this._levelLayouts[Math.min(this.currentLevel, this._levelLayouts.length - 1)];
		if (!layout) {
			// no more levels, won the game!
			this.endGame(Enums.GameStates.GAME_OVER_WIN);
		}

		// pass in 2d array of layouts to init bubble
		this.reset(function () {
			// bubbles to capture to win level
			bubbleGrid.once('addedBubbles', function () {
				self.createObjectiveBubbles(self.currentLevel);
			});
			bubbleGrid.fillRows(layout[0], layout[1]); // rows from, to

			// DEBUG
			/*setInterval(bubbleGrid.pushNewRow.bind(bubbleGrid), 4000);*/
		});
	};

	this.endGame = function (state) {
		this.emit('endGame');

		switch (state) {
			case Enums.GameStates.WIN:
				// TODO: win level, dispaly feedback, tap to continue
				this.currentLevel += 1;
				this._turnCount = 0;
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
			return this.once('processCollision', function () {
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
		var points = numBubbles * BUBBLE_POINTS * (this.currentLevel + 1); // lvl multiplier
		this.score += points;
		this.scoreboard.setText(this.score.toString());
	};

	this.createObjectiveBubbles = function (numBubbles) {
		// choose random special "win" bubbles within the first several rows (A-H)
		var bubbleGrid = this.bubbleGrid;

		// create obejctive bubbles to get
		for (var i = 0; i <= numBubbles; i += 1) {
			var randBub;
			while (!randBub || randBub.isSpecial) {
				var letterIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
				var randBubId = letterIds[Math.floor(Math.random() * (letterIds.length))] +
					Math.floor(Math.random() * (bubbleGrid.hexesPerLetterRow) + 1);
				randBub = bubbleGrid.bubbles[randBubId];
			}

			bubbleGrid.makeBubbleSpecial(randBub);
		}
	};

	this.processCollision = function (point) {
		var self = this;

		// handle additions, matches, removals
		var sound = soundcontroller.getSound();
		sound.play('bubble');

		var bubbleGrid = this.bubbleGrid;

		var cluster = [];
		var floaters = [];

		// attach active bubble to nearest hex
		function resetShooter() {
			if (!self._isLaunching) {
				return;
			}
			self._isLaunching = false;
			self.shooter.reset();

			// launch over, next turn, reset turn cycle & push new bubbles
			self._turnCount += 1;
			self._turnCount = self._turnCount % TURN_BENCH ? self._turnCount : 0;
			if (!self._turnCount) {
				bubbleGrid.pushNewRow(); // survival element
			}

			return self.emit('processCollision');
		}

		var addedBubble = bubbleGrid.addBubbles([ point ], this.shooter.activeBubble.bubType)[0];

		if (!addedBubble) {
			// TODO: failed to add, trigger loseGame if > bottom row
			return resetShooter();
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
						return resetShooter();
					});
					bubbleGrid.removeBubbles(floaters);
				} else {
					return resetShooter();
				}
			});

			// remove all bubs in the cluster
			bubbleGrid.removeBubbles(cluster);
		}

		resetShooter();
	};
});

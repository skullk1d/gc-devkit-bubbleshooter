/*
manages launch (generation) of new bubbles and vector math for bubble shooter
listens to parent view touches to capture any shot angle
*/

// require
import device;

import math.geom.angle as angle;
import math.geom.Circle as Circle;
import math.geom.intersect as intersect;
import math.geom.Vec2D as Vec2D;

import ui.ImageView;
import ui.View;

import src.components.BubbleGrid as BubbleGrid;
import src.components.Bubble as Bubble;

// const
const BUBBLE_SPEED = 0.4;

// class
var Shooter = Class(ui.View, function (supr) {
	this.init = function (opts) {
		opts = merge(opts, {
			/*opts*/
		});

		this.opts = opts;

		supr(this, 'init', [opts]);

		// props
		this.aimingAtP = {}; // point
		this.activeBubble = {}; // Bubble
		this._centerP = {
			x: opts.width / 2,
			y: opts.height / 2
		};
		this._aimRad = 0;
		this._bubbleGrid = opts.bubbleGrid; // register with a bubble grid

		this.build();
	};

	this.build = function () {
		// target arrow w anchor for rotation
		var arrowHeight = 32;
		this.targetArrow = new ui.View({
			superview: this,
			width: 3,
			height: arrowHeight,
			x: this._centerP.x,
			y: this._centerP.y - arrowHeight,
			anchorX: 2,
			anchorY: arrowHeight,
			backgroundColor: 'red'
		});

		// bubble we shoot at grid
		var bubWidth = BubbleGrid.Static.HEX_WIDTH;
		this.activeBubble = new Bubble({
			superview: this._bubbleGrid, // exists on bubble grid, for hex collisions
			radius: bubWidth / 2,
			width: bubWidth,
			height: bubWidth
		});

		this.setupEvents();

		this.reset();
	};

	this.setupEvents = function () {
	};

	this.aimAt = function (point) {
		if (this.shouldLaunch) {
			return;
		}

		this.aimingAtP = point;

		// rotate aim with vector to point (adapt point for top-left origin)
		var touchVec = new Vec2D(point);
		var centerVec = new Vec2D(this._centerP);
		var aimVec = touchVec.minus(centerVec);

		aimVec = new Vec2D({
			x: point.x - this._centerP.x,
			y: this.getSuperview().style.height - point.y // invert zero Y to bottom
		});

		// starting rad is pi/2 since vertical rect, invert angle from top-left origin
		this._aimRad = (-1 * (aimVec.getAngle() - (Math.PI / 2)));
		this._unitAimRad = this._aimRad + (Math.PI / 2); // readjust

		this.targetArrow.style.r = this._aimRad;

		console.log(this._aimRad);
	};

	this.tick = function (dt) { // ms
		if (!this.shouldLaunch) {
			return;
		}

		var bubble = this.activeBubble;
		var viewWidth = this._bubbleGrid.style.width;

		// bounce off right or left wall
		if ((bubble.style.x + bubble.style.width) >= viewWidth) {
			this._unitAimRad = Math.PI - this._unitAimRad;
			bubble.style.x = viewWidth - bubble.style.width;
		} else if (bubble.style.x <= 0) {
			this._unitAimRad = Math.PI - this._unitAimRad;
			bubble.style.x = 0;
		}

		// move along vector
		bubble.style.x += dt * BUBBLE_SPEED * -1 * Math.cos(this._unitAimRad);
		bubble.style.y += dt * BUBBLE_SPEED * -1 * Math.sin(this._unitAimRad);

		// detect collisions and emit bubble's current location when collided
		var didCollide = false;

		if (bubble.style.y <= 0) {
			didCollide = true;
		}

		// collisions with other bubbles
		if (!didCollide) {
			var bubRect = bubble.getBoundingShape();
			var bubbles = this._bubbleGrid.bubbles; // TODO? reduce class interdependecy
			for (var b in bubbles) {
				var gridBub = bubbles[b];
				var gridBubRect = gridBub.getBoundingShape();
				if (Shooter.Static.circAndCirc(bubRect, gridBubRect)) {
					didCollide = true;
					break;
				}
			}
		}

		if (didCollide) {
			return this.emit('collided', bubble.getCenterP());
		}
	};

	this.reset = function () {
		var bubWidth = this.activeBubble.style.width;
		var bubGrid = this._bubbleGrid;
		this.activeBubble.style.update({
			x: bubGrid.style.x + (bubGrid.style.width / 2) - (bubWidth / 2) - bubGrid.style.x,
			y: bubGrid.style.y + (bubGrid.style.height / 2) - (bubWidth / 2) + bubWidth,
		});
		this.activeBubble.setBubType(); // TODO: have next bubtype ready in queue
		this.shouldLaunch = false;
	};
});

// statics
Shooter.Static = {
	circAndCirc: function (rect1, rect2) {
		// accepts rects to evaluate as circles
		var x1 = rect1.getCenter().x;
		var y1 = rect1.getCenter().y;
		var r1 = rect1.width / 2;

		var x2 = rect2.getCenter().x;
		var y2 = rect2.getCenter().y;
		var r2 = rect2.width / 2;

		// calculate the distance between the centers (via triangles)
		var dx = x1 - x2;
		var dy = y1 - y2;
		var len = Math.sqrt(dx * dx + dy * dy);

		if (len < r1 + r2) {
			return true;
		}

		return false;
	}
};

exports = Shooter;
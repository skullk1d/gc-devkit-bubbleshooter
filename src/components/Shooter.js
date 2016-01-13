/*
manages launch (generation) of new bubbles and vector math for bubble shooter
listens to parent view touches to capture any shot angle
*/

// require
import device;
import math.geom.angle as angle;
import math.geom.Line as Line;
import math.geom.Vec2D as Vec2D;
import ui.ImageView;
import ui.View;

import src.components.Bubble as Bubble;

// const

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

		this._centerP = {
			x: opts.width / 2,
			y: opts.height / 2
		};

		this.build();
	};

	this.build = function () {
		// target arrow w anchor for rotation
		var arrowHeight = 24;
		this.targetArrow = new ui.View({
			superview: this,
			width: 3,
			height: arrowHeight,
			x: this._centerP.x,
			y: this.style.height - arrowHeight,
			anchorX: 2,
			anchorY: arrowHeight,
			backgroundColor: 'red'
		});
		/*targetArrow.style.update({
			layout: 'linear',
			centerAnchor: true,
			centerX: true
		});*/

		this.setupEvents();
	};

	this.setupEvents = function () {
	};

	this.aimAt = function (point) {
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
		var aimRad = (-1 * (aimVec.getAngle() - (Math.PI / 2)));

		this.targetArrow.style.r = aimRad;

		console.log(aimRad);


		// using Lines with relative origin, build triangle
		/*var orthoLine = new Line(this._centerP, {x: this._centerP.x, y: point.y })
		var aimLine = new Line(this._centerP, point);
		var legLine = new Line(orthoLine.end, aimLine.end);

		var aimRad = Math.atan2(legLine.getLength() / orthoLine.getLength());

		this.targetArrow.style.r = aimRad;*/
	};

	this.launchAt = function (point) {
		console.log(point.x, point.y);
	};
});

// statics
Shooter.Static = {
};

exports = Shooter;
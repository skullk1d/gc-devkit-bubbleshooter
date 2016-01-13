import entities.shapes.Circle as Circle;

import ui.ImageView as ImageView;
import ui.resource.Image as Image;
import ui.View;

/*
Provides circular entity visually represented by a circular image
*/

var bubImgs = [
	new Image({url: "resources/images/bubA.png"}),
	new Image({url: "resources/images/bubB.png"}),
	new Image({url: "resources/images/bubC.png"}),
	new Image({url: "resources/images/bubD.png"}),
	new Image({url: "resources/images/bubE.png"})
];

/* Represented by collision circle */
exports = Class(ui.View, function (supr) {
	this.init = function (opts) {
		opts = merge(opts, {
			/*opts*/
		});

		this.opts = opts;
		this.id = opts.id;
		this._bubType = opts.bubType;

		supr(this, 'init', [opts]);

		this.build();
	};

	this.build = function () {
		// collision circle
		this.collisionCirc = new Circle(this.opts);

		if (this.opts.bubType === undefined) {
			this._bubType = Math.floor(Math.random() * (bubImgs.length));
		}

		this._bubImage = new ImageView({
			superview: this,
			image: bubImgs[this._bubType], // TODO: ability to update, use setImage
			x: this.opts.x,
			y: this.opts.y,
			width: this.opts.width,
			height: this.opts.height
		});
	};
});
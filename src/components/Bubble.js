import ui.ImageView as ImageView;
import ui.resource.Image as Image;
import ui.View;

import src.enums as Enums;

var skin = Enums.SKINS.TOON;
var path = 'resources/images/' + skin;
var bubImgs = [
	new Image({url: path + '/bubA.png'}),
	new Image({url: path + '/bubB.png'}),
	new Image({url: path + '/bubC.png'}),
	new Image({url: path + '/bubD.png'}),
	new Image({url: path + '/bubE.png'})
];

/* Represented by collision circle */
exports = Class(ui.View, function (supr) {
	this.init = function (opts) {
		opts = merge(opts, {
			/*opts*/
		});

		this.opts = opts;
		this.id = opts.id;
		this.bubType = opts.bubType;

		supr(this, 'init', [opts]);

		this.build();
	};

	this.build = function () {
		// image
		this._bubImage = new ImageView({
			superview: this,
			image: bubImgs[this.bubType],
			x: 0,
			y: 0,
			width: this.opts.width,
			height: this.opts.height
		});

		// init
		this.setBubType(this.bubType);
	};

	this.setBubType = function (type) {
		type = type === undefined ? Math.floor(Math.random() * (bubImgs.length)) : type;

		// ability to update
		var img = bubImgs[type];
		if (!img) {
			return console.error('Bubble type', type, 'does not exist');
		}
		this._bubImage.setImage(img);
		this.bubType = type;
	};

	this.getCenterP = function () {
		return {
			x: this.style.x + (this.style.width / 2),
			y: this.style.y + (this.style.width / 2)
		};
	};
});
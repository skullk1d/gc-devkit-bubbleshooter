import animate;

import ui.ImageView as ImageView;
import ui.resource.Image as Image;
import ui.View;

import src.enums as Enums;

var skin = Enums.Skins.TOON;
var path = 'resources/images/' + skin;
var bubImgs = [
	new Image({url: path + '/bubA.png'}),
	new Image({url: path + '/bubB.png'}),
	new Image({url: path + '/bubC.png'}),
	new Image({url: path + '/bubD.png'}),
	new Image({url: path + '/bubE.png'})
];
var specialBubImg = new Image({url: path + '/bubSpecial.png'});

/* Represented by collision circle */
exports = Class(ui.View, function (supr) {
	this.init = function (opts) {
		opts = merge(opts, {
			/*opts*/
		});

		this.opts = opts;
		this.id = opts.id;
		this.bubType = opts.bubType;
		this.isSpecial = opts.isSpecial;
		this.coOrdX = opts.coOrdX;
		this.coOrdY = opts.coOrdY;

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

		// special glow
		var overlayWidth = this.opts.width * 1.2;
		var posOffset = 0 - ((overlayWidth - this.opts.width) / 2);
		this._overlayImage = new ImageView({
			image: specialBubImg,
			x: posOffset,
			y: posOffset,
			width: overlayWidth,
			height: overlayWidth
		});

		if (this.isSpecial) {
			this.makeSpecial();
		}

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

	this.makeSpecial = function (shouldSpecial) {
		// make this a glowing "win" or objective bubble
		shouldSpecial = shouldSpecial === undefined ? true : shouldSpecial;
		if (this.isSpecial === shouldSpecial) {
			return;
		}

		if (shouldSpecial) {
			this.addSubview(this._overlayImage);
		} else {
			this.removeSubview(this._overlayImage);
		}

		this.isSpecial = shouldSpecial;
		this._animateSpecial();
	};

	this._animateSpecial = function () {
		if (!this.isSpecial) {
			return;
		}
		var self = this;

		var widthOffset = 4;
		var posOffset = 2;
		var newWidth = this._overlayImage.style.height + widthOffset;
		var newPos = this._overlayImage.style.x - posOffset;
		animate(this._overlayImage).clear().now({
			width: newWidth,
			height: newWidth,
			x: newPos,
			y: newPos,
			opacity: 0.8
		}, 750).then({
			width: newWidth - widthOffset,
			height: newWidth - widthOffset,
			x: newPos + posOffset,
			y: newPos + posOffset,
			opacity: 0.25
		}, 750).then(self._animateSpecial.bind(self));
	};
});
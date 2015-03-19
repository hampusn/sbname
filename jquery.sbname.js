(function($, window, document, undefined) {

/**
 * jQuery.fn.sbname(options);
 *
 * Get a product's name, by it's product number, from systembolaget.se (which is the website
 * of the state-owned company/store for liqour & other alcoholic beverages in Sweden.)
 *
 * Version 0.3.0
 *
 * Comming:
 * -General optimization
 * -Rewritten nameFormat()
 * -Better documentation
 *
 * New features (possibly):
 * -?
 *
 * by Hampus Nordin
 * http://hampusnordin.se/
 * http://github.com/hampusn/sbname/
 *
 * Using Yahoo!'s YQL to get the data from systembolaget.se.
 * http://developer.yahoo.com/yql/
 */

/**
 *		Accepted parameters:
 *
 * 1.	$(selection).sbname();
 * 		Without parameters will fade out the product number and fade in the product name,
 * 		with the default options as seen below.
 *
 * 2.	$(selection).sbname(options);
 *		Takes the options as an object literal.
 *		Default parameters are below this list of accepted parameters.
 *
 *
 * Default options:
 *
 *		speedIn: 		The animation speed to use when the product name is animated in.
 *						-Defaults to 400 (ms).
 *
 *		speedOut: 		The animation speed to use when the product number is animated out.
 *						-Defaults to 500 (ms).
 *
 *		argsIn: 		Extra Arguments to animate In. To skip the opacity,
 *						pass an empty object to argsIn. E.g. $(selector).sbname({argsIn: {} });
 *						-Defaults to { _currentOpacityOfObject_ }.
 *
 *		argsOut: 		Extra Arguments to animate Out. To skip the opacity,
 *						do the same as above, but for argsOut.
 *						-Defaults to {opacity:0}.
 *
 *		dom: 			When it isn't suited to just switch the product number to the product name
 *						due to the html structure, this argument comes in handy. Picture the following
 *						markup:
 *
 *							<p>This is a sentence with a product number like <span>2525</span> which
 *							happens to be Baron de Ley.</p>
 *
 *						This markup allows us to change the span-elements content without any
 *						complications. This is what sbname will do per default. However, the dom argument
 *						comes quite in handy if your markup looks something like this:
 *
 *							<ul>
 *								<li>
 *									<span class="nr">2525</span>
 *									<span class="name"></span>
 *								</li>
 *								<li>...
 *							</ul>
 *
 *						If you got a list with a structure for the list-items like this,
 *						and want to take the number of 'span.nr' and set the product name
 *						on 'span.name' then you'll need to set the dom argument accordingly:
 *
 *						The jQuery selector which sbname was called with (e.g. $('THIS RIGHT HERE').sbname();)
 *						should be the parent/ancestor of both the number and target elements.
 *						It doesn't have to be the closest mutual parent/ancestor, but it helps.
 *						It mustn't be a parent which has more than one descendant/child of either
 *						a number or a target element. In this case it must be the li and not the ul element.
 *						-This is the previous dom.outer.
 *
 *						dom.pNumber = 	This should be set to whatever element to get the product number from.
 *										If it's not a jQuery object, a search will be made for matches inside the jQuery selector.
 *										E.g. pass '.nr' to search for a descendant/child (with the class 'nr') to the jQuery selector.
 *
 *						dom.pName =		Just like pNumber but for the target element which will get the product name inserted.
 *
 *						-Defaults to {pNumber: '', pName: ''}.
 *
 *		nameFormat:		Cropping options of name.
 *						If the product name is longer than nameFormat.cropIf, the name
 *						will be shortened to nameFormat.len characters. If nameFormat.after
 *						is also set, it will be added to the end of the shortened name.
 *						Example:
 *
 *						ProductName = 	'Saintsbury Lee Vineyard Pinot Noir 2007'; (length: 39)
 *						nameFormat = 	{cropIf: 25, len: 20, after: '...'};
 *						result =		'Saintsbury Lee Viney...';
 *
 *						-Defaults to {cropIf: 0, toLen: 0, after: ''}.
 *
 *		error:			Desc. Coming soon...,
 *						....
 *						-Defaults to '' (none).
 *
 *		success:
 *
 *
 */

$.fn.sbname = function(options) {

	//Check if a parameter for direction has ben passed and overwrite defaults with user inputs.
	var options = (typeof options !== 'undefined') ? $.extend({}, $.fn.sbname.defaults, options) : $.extend({}, $.fn.sbname.defaults),
			db;

	//Make sure the used collection is a jQuery collection.
	if (this instanceof jQuery) {

		// sbnameDB uses localStorage.
		var useDB = sbnameDB.hasSupport();

		if (useDB) {
			db = sbnameDB.init();
		}

		//Return the elements for 'chainability'.
		return this.each(function(i, element) {

			//Determine if a dom element or a number was passed and proceed accordingly.
			var artnr = parseArtNr(options.dom.pNumber);
			if (parseArtNr(options.dom.pNumber) == null) {

				//Set the number element which holds the product number.
				var pNumber	=	(options.dom.pNumber != '' && typeof options.dom.pNumber == 'string') ? $(this).find(options.dom.pNumber) :
								(options.dom.pNumber instanceof jQuery) ? options.dom.pNumber :
								$(this);

				//Should we get the product number from the value attribute or the innerhtml?
				var pNumberType = (/^(?:area|input)$/i.test(pNumber[0].tagName)) ? 'value' : 'html';

				//Get the ArtNr/Product number.
				artnr =	(pNumberType == 'html') ? pNumber.html() : pNumber.attr('value');

				//Strip everything but the product number.
				artnr = parseArtNr(artnr);
			}

			//Set the name element which will get the product name if found.
			var pName = 	(options.dom.pName != '' && typeof options.dom.pName == 'string') ? $(this).find(options.dom.pName) :
							(options.dom.pName instanceof jQuery) ? options.dom.pName :
							$(this);

			//Should we set the product name on the value attribute or in the innerhtml?
			var pNameType	= (/^(?:area|input)$/i.test(pName[0].tagName)) ? 'value' : 'html';

			//If ErrorFunc exists, bind it to current item in $.each.
			if (typeof options.error === 'function') $(this).ajaxError(options.error);

			//If artnr is an integer, continue.
			if (artnr == parseInt(artnr)) {

				var YQL = false;

				//Should we use the local storage or YQL?
				if (useDB) {

					//Check if the product exists in the local database
					var nameObj = sbnameDB.getItem(artnr);
					if(nameObj) {

						//Format name according to o.nameFormat.
						var name = nameFormat(Array(nameObj.name, nameObj.extended), options.nameFormat);

						//Animate
						anim(pName, pNameType, options, name);
					} else {

						//Since the product didn't exist in the database, use YQL.
						YQL = true;
					}
				} else {

					//No support for local storage. Use YQL.
					YQL = true;
				}

				//Should we use YQL?
				if (YQL) {
					var uri = '';
					// If we should use YQL or try to get the target directly instead.
					// The reason we (usually) need YQL is to get past the CORS restrictions
					// set on the target domain.
					if (options.useYQL) {
						uri = options.buildYQLResource(options.sbProductSearchResource, {"searchquery": artnr});
					} else {
						// todo
					}

					//Get the name.
					$.get(uri, function(data) {

						// Normalizes if using YQL.
						if (deepTest(data, 'query.results.json')) {
							data = data.query.results.json;
						}

						if (deepTest(data, 'ProductSearchResults')) {
							data = data.ProductSearchResults;
						}

						// Make sure we have some results
						if ($.isArray(data) && data.length) {
							// Todo: Determine which item we should choose if we get multiple in return
							// For now, go with the first one.

							var product = data[0];

							var d1 = product.ProductNameBold;
							var d2 = product.ProductNameThin;

							//Store the name to the database, if local storage is supported.
							if (useDB) {
								sbnameDB.setItem(artnr, d1, d2);
								sbnameDB.update();
							}

							//Format name according to o.nameFormat.
							//var name = (typeof d2 == 'string' && d2 != '') ? d1 +' '+ d2 : d1;
							var name = nameFormat(Array(d1, d2), options.nameFormat);

							//Animate
							anim(pName, pNameType, options, name);
						} else {
							//Trigger Error since no name was found. Prolly bad product number.
							if (typeof options.error === 'function') options.error(pName);
						}
					});
				}
			}else{
				//Trigger Error since the product nr prolly was bad.
				if (typeof options.error === 'function') options.error(pName);
			}
			//Unbind errorFunc.
			if (typeof options.error === 'function') $(this).unbind('ajaxError');
		});

	}
	//Went wrong with the selection. Do nothing and pass the collection on for further chainability.
	return $(this);
};

//Default values for the function call.
$.fn.sbname.defaults = {

	//The animation speed for easeIn.
	speedIn: 400,

	//The animation speed for easeOut.
	speedOut: 500,

	//Extra Arguments to animate In.
	argsIn: {},

	//Extra Arguments to animate Out. To skip the opacity, pass an empty object to argsOut. e.g. $(selector).sbname({argsOut: {} });
	argsOut: {opacity:0},

	//For a description, see above (top).
	dom: {pNumber: '', pName: ''},

	//Argument for formatting of the product name.
	nameFormat: {cropIf: 0, toLen: 0, after: '', extWrap: 'span'},

	error: null,

	success: null,

	useYQL: true,

	sbProductSearchResource: "http://beta.systembolaget.se/api/productsearch/search",

	buildYQLResource: function(url, data) {
		// Build querystring out of data.
		var querystring = $.param(data);
		// Build and encode
		url = encodeURI(url + '?' + querystring);
		return "https://query.yahooapis.com/v1/public/yql?format=json&q=select%20*%20from%20json%20where%20url%3D'" + url + "'";
	}


};

//Helper Funcs

//Filter out irrelevant stuff from the artNr.
//If the passed argument begins with a letter it counts as not a product number and null is returned.
function parseArtNr(artNr) {
	return /^[\d]+/.exec(artNr);
}

//Strips out the product number/article number and then removes all double spaces, newlines and tabs.
//If nothing exists except the product number an empty string is returned.
function cleanName(name) {
	return ((name = /^[^\(]+/i.exec(name)) != null) ? $.trim((String)(name).replace(/[\s]{2,}/g,' ')) : '';
}

//Format name according to format {cropIf,toLen,after,extWrap}.
//Crude 'n' Fugly. Will fix later.
function nameFormat(name,format) {
	var cropIf = parseInt(format.cropIf);
	var toLen = parseInt(format.toLen);
	var fName = '';
	var after = (format.after != '' && typeof format.after == 'string') ? format.after : '';

	if (typeof name == 'string'
		|| (typeof format.extWrap != 'string' || format.extWrap == '')
		|| (typeof name == 'object'
			&& ((typeof format.extWrap != 'string' && format.extWrap != '')
				|| toLen <= name[0].length + 1))
	) {
		if (typeof name == 'object' && name[0] != null) name = name[0] + ' ' + name[1];
		if (cropIf > 0 && name.length > cropIf) {
			fName = (toLen > 0 && toLen < cropIf) ?
					name.substr(0, toLen) :
					name.substr(0, cropIf);

			fName = $.trim(fName) + after;
		} else {
			fName = name;
		}
	} else {
		var extW = new Array('<'+format.extWrap+'>','</'+format.extWrap+'>');

		if (cropIf > 0 && name[0].length + name[1].length + 1 > cropIf) {
			fName = name[0] + ' ' + extW[0] + $.trim(name[1].substr(0, (toLen - (name[0].length + 1)) )) + after + extW[1];
		} else {
			fName = name[0] + ' ' + extW[0] + name[1] + extW[1];
		}
	}

	return fName;
}

function anim(pName, pNameType, o, name) {

	//Set animation args.
	var aOut = $.extend({}, o.argsOut);
	var aIn = $.extend({}, {opacity: pName.css('opacity')}, o.argsIn);

	//Animate Out, Set text, Animate In.
	pName.animate(aOut, o.speedOut, function() {
		if (pNameType == 'html') {
			pName.html(name);
		} else {
			pName.attr('value',name);
		}
		pName.animate(aIn,o.speedIn);
	});
}


/**
 * Checks if deep property exists in object.
 *
 * Example: deepTest(obj, 'foo.bar');
 *
 *
 */
function deepTest(obj, prop) {
	var parts = prop.split('.');
	for(var i = 0, l = parts.length; i < l; i++) {
		var part = parts[i];
		if(obj !== null && typeof obj === "object" && part in obj) {
			obj = obj[part];
		}
		else {
			return false;
		}
	}
	return true;
}

var sbnameDB = {

	//This will be the key for the 'database' (json string) stored in localStorage
	dbname: "sbnameDB",

	//This is the current version of the 'database' scheme
	version: '0.1',

	//This array will contain all names
	names: [],

	//Init local storage.
	init: function() {
		var db;

		//Check if a database doesn't already exists
		if (!localStorage[this.dbname]) {

			//Store initial values / db scheme
			db = {
				"version": this.version,
				"names": this.names
			};
			localStorage[this.dbname] = JSON.stringify(db);
		} else {

			//Get the stored db and update this singleton
			db = JSON.parse(localStorage[this.dbname]);
			this.version = db.version;
			this.names = db.names;
		}
		return db;
	},

	//Check if browser supports local storage.
	hasSupport: function() {
		return 'localStorage' in window && window['localStorage'] !== null;
	},

	//Check if an article already exist in the database
	itemExists: function(artnr) {

		//Pointless to do anything if there aren't any names in the array.
		if (this.names.length < 1)
			return;

		for (var i = 0; i < this.names.length; i++) {

			//If a match was found, return the key.
			if (this.names[i].artnr == artnr)
				return i;
		}

		return false;
	},

	//Get an article based on its article number
	getItem: function(artnr) {
		if (this.names.length < 1)
			return;

		for (var i = 0; i < this.names.length; i++) {

			//If a match was found, return it.
			if (this.names[i].artnr == artnr)
				return this.names[i];
		}

		return false;
	},

	//Store an article or update an existing based on the article number
	setItem: function(artnr, name, extended) {
		if (!this.names)
			return;

		var i = this.itemExists(artnr);
		if (typeof i == "number") {
			this.names[i] = {"artnr": String(artnr), "name": name, "extended": extended};
		} else {
			this.names.push({"artnr": String(artnr), "name": name, "extended": extended});
		}
	},

	//Update 'database'
	update: function() {
		var db = JSON.parse(localStorage[this.dbname]);

		//Doesn't the schemes match? Update.
		if (db.version != this.version) {
			//Update Scheme - later
		}

		//Update database
		localStorage[this.dbname] = JSON.stringify({"version": this.version, "names": this.names});
	}
};

})(jQuery, this, this.document);

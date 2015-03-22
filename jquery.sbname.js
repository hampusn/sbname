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
			db = false;

	//Make sure the used collection is a jQuery collection.
	if (this instanceof jQuery) {
		// sbname.db uses localStorage.
		// getInstance() will return false if the browser
		// doesn't support local storage.
		if (options.cacheResults) {
			db = $.sbname.db.getInstance();
		}

		//Return the elements for 'chainability'.
		return this.each(function(i, element) {
			var articleNumber;

			//Set the number element which holds the product number.
			var pNumber	=	(options.dom.pNumber != '' && typeof options.dom.pNumber == 'string') ? $(this).find(options.dom.pNumber) :
							(options.dom.pNumber instanceof jQuery) ? options.dom.pNumber :
							$(this);

			//Should we get the product number from the value attribute or the innerhtml?
			var pNumberType = (/^(?:area|input)$/i.test(pNumber[0].tagName)) ? 'value' : 'html';

			//Get the ArtNr/Product number.
			articleNumber =	(pNumberType == 'html') ? pNumber.html() : pNumber.val();

			//Strip everything but the product number.
			articleNumber = parseArticleNumber(articleNumber);

			//Set the name element which will get the product name if found.
			var pName = 	(options.dom.pName != '' && typeof options.dom.pName == 'string') ? $(this).find(options.dom.pName) :
							(options.dom.pName instanceof jQuery) ? options.dom.pName :
							$(this);

			//Should we set the product name on the value attribute or in the innerhtml?
			var pNameType	= (/^(?:area|input)$/i.test(pName[0].tagName)) ? 'value' : 'html';

			//If ErrorFunc exists, bind it to current item in $.each.
			if (typeof options.error === 'function') $(this).ajaxError(options.error);

			//If articleNumber is an integer, continue.
			if (articleNumber == parseInt(articleNumber)) {

				var useAjax = false;

				//Should we use the local storage or YQL?
				if (db) {

					//Check if the product exists in the local database
					var nameObj = db.get(articleNumber);
					if(nameObj) {

						//Format name according to o.nameFormat.
						var name = nameFormat(Array(nameObj.name, nameObj.extended), options.nameFormat);

						//Animate
						anim(pName, pNameType, options, name);
					} else {

						//Since the product didn't exist in the database, use YQL.
						useAjax = true;
					}
				} else {

					//No support for local storage. Use YQL.
					useAjax = true;
				}

				//Should we use ajax?
				if (useAjax) {
					var uri = '';
					// If we should use YQL or try to get the target directly instead.
					// The reason we (usually) need YQL is to get past the CORS restrictions
					// set on the target domain.
					if (options.useYQL) {
						uri = options.buildYQLResource(options.sbProductSearchResource, {"searchquery": articleNumber});
					} else {
						// todo
					}

					//Get the name.
					$.ajax({
						'url': uri,
						'dataType': 'json'
					}).done(function(data, textStatus, jqXHR) {
						// Normalizes if using YQL.
						if (deepTest(data, 'query.results.json')) {
							data = data.query.results.json;
						}
						// Reduce to actual search results.
						if (deepTest(data, 'ProductSearchResults')) {
							data = data.ProductSearchResults;
						}
						// Systembolaget's API returns object and not array if the results
						// is only 1 object. Convert to array if the result seems to be a
						// valid product and not an array.
						if (deepTest(data, 'ProductNumber')) {
							data = [data];
						}
						// Check if a success callback exist.
						if (typeof options.done === 'function') {
							// Success callback can return false to halt the rest of the
							// standard execution (replacement and animation of prod name).
							var callbackResults = options.done(data, textStatus, jqXHR);

							if (callbackResults === false) {
								return;
							}
						}

						// Make sure we have some results
						if ($.isArray(data) && data.length) {

							// Systembolaget's API is very greedy. Filter out results which
							// are most likely not the products searched for.
							data = $.grep(data, function(p) {
								return p.ProductNumber.substr(0, articleNumber.length) === articleNumber;
							});

							// Make sure we still have any product to work with since the
							// filtering above could have resulteted in empty array.
							if (data.length) {
								var product = data[0],
										name = '',
										nameExtended = '',
										formattedName = '';

								if (product.ProductNameBold !== 'null') {
									name = product.ProductNameBold;
								}

								if (product.ProductNameThin !== 'null') {
									nameExtended = product.ProductNameThin;
								}

								//Store the name to the database, if local storage is supported.
								if (db) {
									db.set(articleNumber, name, nameExtended);
									db.persist();
								}

								//Format name according to options.textFormat
								if (typeof options.textFormat === 'function') {
									formattedName = options.textFormat(name, nameExtended);
								} else {
									formattedName = name + ' ' + nameExtended;
								}

								//Animate
								anim(pName, pNameType, options, formattedName);
							}
						}
					}).fail(function(jqXHR, textStatus, errorThrown) {
						if (typeof options.fail === 'function') {
							options.fail(jqXHR, textStatus, errorThrown);
						}
					});
				}
			}
		});
	}
	//Went wrong with the selection. Do nothing and pass the collection on for further chainability.
	return $(this);
};

$.sbname = {
	db: (function() {
		var instance;

		var createInstance = function() {
			//This will be the key for the 'database' (json string) stored in localStorage
			var _name = "sbnameDB";

			//This is the current version of the 'database' scheme
			var _version = '0.1';

			//This array will contain all names
			var _names = [];


			var hasSupport = function() {
				return 'localStorage' in window && window['localStorage'] !== null;
			};

			/**
			* Persists the current state of the database to local storage.
			*/
			var persist = function() {
				localStorage[_name] = JSON.stringify({
					"version": _version,
					"names": _names
				});
			};

			var getIndexOfArticle = function(articleNumber) {
				if (_names.length > 0) {
					for (var i = _names.length - 1; i >= 0; i--) {
						if (_names[i].artnr == articleNumber) {
							return i;
						}
					}
				}
				return false;
			}

			var get = function(articleNumber) {
				var i = getIndexOfArticle(articleNumber);
				if (i !== false) {
					return _names[i];
				}
				return false;
			};

			var set = function(articleNumber, name, nameExtended) {
				var i = getIndexOfArticle(articleNumber),
						data = {
							"artnr": articleNumber.toString(),
							"name": name,
							"extended": nameExtended
						};

				if (i !== false) {
					_names[i] = data;
				} else {
					_names[_names.length] = data;
				}
			};

			var remove = function(articleNumber) {
				var i = getIndexOfArticle(articleNumber);
				if (i !== false) {
					// Returns true on successful removal. False if index was not removed.
					return (_names.splice(i, 1).length == 1);
				}
				// Not found in array
				return false;
			};



			// No reason to do anything at all if there isn't any support for
			// local storage.
			if (! hasSupport) {
				return false;
			}

			//Check if a database doesn't already exists
			if (! localStorage[_name]) {
				//Store initial values / db scheme
				localStorage[_name] = JSON.stringify({
					"version": _version,
					"names": _names
				});
			} else {
				//Get the stored db and update this singleton
				persistedData = JSON.parse(localStorage[_name]);

				// TODO: check if Current version is not equal to stored.
				// Do stuff when schemes doesn't match.
				// (_version != persistedData.version)

				_version = persistedData.version;
				_names = persistedData.names;
			}

			// Return public methods
			return {
				"hasSupport": hasSupport,
				"persist": persist,
				"get": get,
				"set": set,
				"remove": remove
			};
		};

		return {
			getInstance: function() {
				if (! instance) {
					instance = createInstance();
				}

				return instance;
			}
		};
	})()
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

	/**
	 * Formatting function which should take two strings and
	 * return a formatted result.
	 */
	textFormat: function(name, nameExtended) {
		if (nameExtended) {
			return name + ' <span>' + nameExtended + '</span>';
		}
		return name;
	},

	/**
	 * Extra callback for jqXHR failure.
	 *
	 * Should be a function with the parameters:
	 * function( jqXHR, textStatus, errorThrown ) {};
	 */
	fail: null,

	/**
	 * Extra callback for jqXHR done.
	 *
	 * Should be a function with the parameters:
	 * function( data, textStatus, jqXHR ) {};
	 */
	done: null,

	// The uri to systembolagets search endpoint/resource
	sbProductSearchResource: "http://beta.systembolaget.se/api/productsearch/search",

	// Wether YQL needs to be used or not. The main reason for using it is to bypass CORS issues on the target site.
	useYQL: true,

	// Wether to cache the results in local storage or not.
	// Will be ignored if local storage isn't supported in the browser.
	cacheResults: true,

	// Callback for building the YQL resource.
	buildYQLResource: function(url, data) {

		// Build querystring out of data.
		var querystring = $.param(data);

		// Build and encode
		url = encodeURI(url + '?' + querystring);
		return "https://query.yahooapis.com/v1/public/yql?format=json&q=select%20*%20from%20json%20where%20url%3D'" + url + "'";
	}
};

//Helper Funcs

//Filter out irrelevant stuff (everything but digits) from the articleNumber.
function parseArticleNumber(articleNumber) {
	return articleNumber.replace(/\D/g, '');
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
			pName.val(name);
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

})(jQuery, this, this.document);

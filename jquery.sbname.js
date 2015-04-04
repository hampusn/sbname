(function($, window, document, undefined) {

/**
 * jQuery.fn.sbname(options);
 *
 * Get a product's name, by it's product number, from systembolaget.se (which is the website
 * of the state-owned company/store for liqour & other alcoholic beverages in Sweden.)
 *
 * Version 1.0.0
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
 * Options:
 *   dom:
 *     When it isn't suited to just switch the product number to the product name
 *     due to the html structure, this argument comes in handy. Picture the following
 *     markup:
 *
 *     <p>This is a sentence with a product number like <span>2525</span> which
 *     happens to be Baron de Ley.</p>
 *
 *     This markup allows us to change the span-elements content without any
 *     complications. This is what sbname will do per default. However, the dom argument
 *     comes quite in handy if your markup looks something like this:
 *
 *     <ul>
 *       <li>
 *         <span class="nr">2525</span>
 *         <span class="name"></span>
 *       </li>
 *       <li>...
 *     </ul>
 *
 *     If you got a list with a structure for the list-items like this,
 *     and want to take the number of 'span.nr' and set the product name
 *     on 'span.name' then you'll need to set the dom argument accordingly:
 *
 *     The jQuery selector which sbname was called with (e.g. $('THIS RIGHT HERE').sbname();)
 *     should be the parent/ancestor of both the number and target elements.
 *     It doesn't have to be the closest mutual parent/ancestor, but it helps.
 *     It mustn't be a parent which has more than one descendant/child of either
 *     a number or a target element. In this case it must be the li and not the ul element.
 *     -This is the previous dom.outer.
 *
 *     dom.pNumber
 *       This should be set to whatever element to get the product number from.
 *       If it's not a jQuery object, a search will be made for matches inside the jQuery selector.
 *       E.g. pass '.nr' to search for a descendant/child (with the class 'nr') to the jQuery selector.
 *
 *     dom.pName
 *       Just like pNumber but for the target element which will get the product name inserted.
 *
 *     -Defaults to {pNumber: '', pName: ''}.
 *
 *   textFormat:
 *     function(name, nameExtended) returns string
 *     A function which formats the product name with the two arguments
 *     name and nameExtended and returns formatted html.
 *
 *   fail:
 *     function(jqXHR, textStatus, errorThrown) returns jqXHR
 *     Extra callback for jqXHR failure.
 *
 *   done:
 *     function(data, textStatus, jqXHR) returns jqXHR
 *     Extra callback for jqXHR done.
 *
 *   animate:
 *     function(animOut, animIn, nameHolder, name) returns void
 *
 *
 */
$.fn.sbname = function(options) {
	var db = false;

	// Merge defaults with options passed in parameter.
	if (typeof options !== 'undefined') {
		options = $.extend({}, $.fn.sbname.defaults, options);
	} else {
		options = $.extend({}, $.fn.sbname.defaults);
	}

	// Make sure the used collection is a jQuery collection.
	if (this instanceof jQuery) {
		// sbname.db uses localStorage.
		// getInstance() will return false if the browser
		// doesn't support local storage.
		if (options.cacheResults) {
			db = $.sbname.db.getInstance();
		}

		// Return the elements for 'chainability'.
		return this.each(function(i, element) {
			var articleNumber, $numberHolder, $nameHolder, numberType,
				$element = $(element);

			// Set the number element which holds the article number 
			// based on the passed options.
			$numberHolder = findHolder($element, options.dom.pNumber);

			// Get the article number from the number holder.
			numberType = $numberHolder.prop('tagName');
			if (numberType === 'INPUT' || numberType === 'TEXTAREA') {
				articleNumber = $numberHolder.val(); // From value
			} else {
				articleNumber = $numberHolder.text(); // From content (text/html)
			}

			// Strip everything but the product number.
			articleNumber = parseArticleNumber(articleNumber);

			// Set the name holder element which will hold the product name if found.
			$nameHolder = findHolder($element, options.dom.pName);

			// If articleNumber is an integer, continue.
			if (articleNumber == parseInt(articleNumber)) {

				var useAjax = false;

				// Should we use the local storage or YQL?
				if (db) {

					// Check if the product exists in the local database
					var nameObj = db.get(articleNumber);
					if(nameObj) {
						var formattedName = '';
						// Format name according to options.textFormat
						if (typeof options.textFormat === 'function') {
							formattedName = options.textFormat(nameObj.name, nameObj.extended);
						} else {
							formattedName = nameObj.name + ' ' + nameObj.extended;
						}

						// Animate
						if (typeof options.animate === 'function') {
							var animOut = options.animation.out || {},
								animIn  = options.animation.in || {};

							options.animate(animOut, animIn, $nameHolder, formattedName);
						}
					} else {
						// Since the product didn't exist in the database, use YQL.
						useAjax = true;
					}
				} else {
					// No support for local storage. Use YQL.
					useAjax = true;
				}

				// Should we use ajax?
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

					// Get the name.
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

								// Store the name to the database, if local storage is supported.
								if (db) {
									db.set(articleNumber, name, nameExtended);
									db.persist();
								}

								// Format name according to options.textFormat
								if (typeof options.textFormat === 'function') {
									formattedName = options.textFormat(name, nameExtended);
								} else {
									formattedName = name + ' ' + nameExtended;
								}

								// Animate
								if (typeof options.animate === 'function') {
									var animOut = options.animation.out || {},
										animIn  = options.animation.in || {};

									options.animate(animOut, animIn, $nameHolder, formattedName);
								}
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
	// Went wrong with the selection. Do nothing and pass the collection on for further chainability.
	return $(this);
};

$.sbname = {
	db: (function() {
		var instance;

		var createInstance = function() {
			// This will be the key for the 'database' (json string) stored in localStorage
			var _name = "sbnameDB";

			// This is the current version of the 'database' scheme
			var _version = '0.1';

			// This array will contain all names
			var _names = [];

			/**
			 * Check if browser supports local storage.
			 */
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

			/**
			 * Get index of article from names collection.
			 */
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

			/**
			 * Get name by article number from names collection.
			 */
			var get = function(articleNumber) {
				var i = getIndexOfArticle(articleNumber);
				if (i !== false) {
					return _names[i];
				}
				return false;
			};

			/**
			 * Set name for article number.
			 */
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

			/**
			 * Remove name by article number.
			 */
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
	//For a description, see above (top).
	dom: {pNumber: '', pName: ''},

	/**
	 * Animation options.
	 *
	 * @see http://api.jquery.com/animate/#animate-properties-options
	 */
	animation: {
		// When animating out (usually a fade out).
		out: {
			// What properties to animate.
			properties: {
				"opacity": 0
			},
			// Additional options to pass to the animate function
			options: {
				"duration": 500
			}
		},
		// When animating in (usually a fade in).
		in: {
			properties: {
				"opacity": 1
			},
			options: {
				"duration": 400
			}
		}
	},

	/**
	 * Standard animate callback. Fades out, changes text and fades in again.
	 */
	animate: function(animOut, animIn, $nameHolder, name) {
		// Complete callback run when out animation has finished.
		var outComplete = function() {
			//Should we set the product name on the value attribute or in the innerhtml?
			var holderType = $nameHolder.prop('tagName');
			if (holderType === 'INPUT' || holderType === 'TEXTAREA') {
				$nameHolder.val(name);
			} else {
				$nameHolder.html(name);
			}
			// Animate in again
			$nameHolder.animate(animIn.properties, animIn.options);
		};
		// Merge in current opacity state of nameHolder
		// so we know what to animate back to.
		animIn.properties = $.extend({'opacity': $nameHolder.css('opacity')}, animIn.properties);
		// Use our own complete callback above.
		animOut.options.complete = outComplete;
		// Animate out
		$nameHolder.animate(animOut.properties, animOut.options);
	},

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

	/**
	 * The uri to systembolagets search endpoint/resource
	 */
	sbProductSearchResource: "http://beta.systembolaget.se/api/productsearch/search",

	/**
	 * Wether YQL needs to be used or not. The main reason
	 * for using it is to bypass CORS issues on the target site.
	 */
	useYQL: true,

	/**
	 * Wether to cache the results in local storage or not.
	 * Will be ignored if local storage isn't supported in the browser.
	 */
	cacheResults: true,

	/**
	 * Callback for building the YQL resource.
	 */
	buildYQLResource: function(url, data) {
		// Build querystring out of data.
		var querystring = $.param(data);
		// Build and encode
		url = encodeURI(url + '?' + querystring);
		// select * from json where url=' URL '
		return "https://query.yahooapis.com/v1/public/yql?format=json&q=select%20*%20from%20json%20where%20url%3D'" + url + "'";
	}
};

//Helper Funcs

/**
 * Helper function to find a holder object based on the 
 * domOption (options.dom).
 */
function findHolder($element, domOption) {
	// If a jQuery object was passed in domOptions, use it.
	if (domOption instanceof $) {
		return domOption;
	}
	// If a string was passed in domOptions, try to find it 
	// inside of $element.
	if (typeof domOption === 'string' && domOption) {
		return $element.find(domOption);
	}
	// Default to $element.
	return $element;
}

/**
 * Filter out irrelevant stuff (everything but digits)
 * from the articleNumber.
 */
function parseArticleNumber(articleNumber) {
	return articleNumber.replace(/\D/g, '');
}

/**
 * Checks if deep property exists in object.
 *
 * Example: deepTest(obj, 'foo.bar');
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

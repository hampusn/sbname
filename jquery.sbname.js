(function($,undefined) {

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
	var o = (typeof options !== 'undefined') ? $.extend({}, $.fn.sbname.defaults, options) : $.extend({}, $.fn.sbname.defaults);

	//Make sure the used collection is a jQuery collection.
	if (this instanceof jQuery) {
		
		var useDB = (sbnameDB.hasSupport()) ? true : false;
		
		if (useDB)
			var db = sbnameDB.init();
				
		//Return the elements for 'chainability'.
		return this.each(function() {
		
			//Determine if a dom element or a number was passed and proceed accordingly.
			var artnr = parseArtNr(o.dom.pNumber);
			if (parseArtNr(o.dom.pNumber) == null) {
				
				//Set the number element which holds the product number.
				var pNumber	=	(o.dom.pNumber != '' && typeof o.dom.pNumber == 'string') ? $(this).find(o.dom.pNumber) :
								(o.dom.pNumber instanceof jQuery) ? o.dom.pNumber :
								$(this);
		
				//Should we get the product number from the value attribute or the innerhtml?
				var pNumberType = (/^(?:area|input)$/i.test(pNumber[0].tagName)) ? 'value' : 'html';
				
				//Get the ArtNr/Product number.
				artnr =	(pNumberType == 'html') ? pNumber.html() : pNumber.attr('value');

				//Strip everything but the product number.
				artnr = parseArtNr(artnr);
			}

			//Set the name element which will get the product name if found.
			var pName = 	(o.dom.pName != '' && typeof o.dom.pName == 'string') ? $(this).find(o.dom.pName) :
							(o.dom.pName instanceof jQuery) ? o.dom.pName :
							$(this);
		
			//Should we set the product name on the value attribute or in the innerhtml?
			var pNameType	= (/^(?:area|input)$/i.test(pName[0].tagName)) ? 'value' : 'html';
		
			//If ErrorFunc exists, bind it to current item in $.each.
			if (typeof o.error === 'function') $(this).ajaxError(o.error);
		
			//If artnr is an integer, continue.
			if (artnr == parseInt(artnr)) {
				
				var YQL = false;
				
				//Should we use the local storage or YQL?
				if (useDB) {
					
					//Check if the product exists in the local database
					var nameObj = sbnameDB.getItem(artnr);
					if(nameObj) {
						
						//Format name according to o.nameFormat.
						var name = nameFormat(Array(nameObj.name, nameObj.extended), o.nameFormat);
						
						//Animate
						anim(pName, pNameType, o, name);
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
				
					//Get the name.
					$.get(YQLstring(artnr), function(data) {
				
						//If a name was found, continue.
						if (data != '' && data.query.results.results != null) {
						
							//Makes it shorter below. We don't need the rest anyways.
							data = data.query.results.results.h1.span;
						
							//Select string with the name.
							//Filter out the product number and also all whitespaces and random newlines which SB seems to like.
							//d1 contains the name (span.rubrikstor).
							//And d2 contains the extended part (span.rubrikstortunn).
							var d1 = cleanName(data[0].content);
							var d2 = (typeof data[1].content != 'undefined') ? cleanName(data[1].content) : '';
						
							//Store the name to the database, if local storage is supported.
							if (useDB) {
								sbnameDB.setItem(artnr, d1, d2);
								sbnameDB.update();
							}
						
							//Format name according to o.nameFormat.
							//var name = (typeof d2 == 'string' && d2 != '') ? d1 +' '+ d2 : d1;
							var name = nameFormat(Array(d1,d2),o.nameFormat);
							
							//Animate
							anim(pName, pNameType, o, name);
						}else{
							//Trigger Error since no name was found. Prolly bad product number.
							if (typeof o.error === 'function') o.error(pName);
						}
					});
				}
			}else{
				//Trigger Error since the product nr prolly was bad.
				if (typeof o.error === 'function') o.error(pName);
			}
			//Unbind errorFunc.
			if (typeof o.error === 'function') $(this).unbind('ajaxError');
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
	
	success: null
	
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

//The heart of this plugin. I let Yahoo! do all the hard work :)
//YQL gets the h1-element within the div that has the class 'beverageProperties'. (for some reason there are 2 h1-elements on the product page.)
//This h1 contains the product name.
function YQLstring(artNr) {
	return "http://query.yahooapis.com/v1/public/yql?q=use%20%22http%3A%2F%2Fyqlblog.net%2Fsamples%2Fdata.html.cssselect.xml%22%3B%20select%20*%20from%20data.html.cssselect%20where%20url%3D%22http%3A%2F%2Fsystembolaget.se%2FSok-dryck%2FDryck%2F%3FvaruNr%3D"+artNr+"%22%20and%20css%3D%22div.beverageProperties%20h1%22&format=json&callback="
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

})(jQuery);

/*

YQL:

	XPATH:
	select * from html where url="http://systembolaget.se/SokDrycker/Produkt?VaruNr=2525" and xpath='//span[@class="rubrikstor"]/text() | //span[@class="rubrikstortunn"]/text()'
	http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D%22http%3A%2F%2Fsystembolaget.se%2FSokDrycker%2FProdukt%3FVaruNr%3D"+artnr+"%22%20and%20xpath%3D'%2F%2Fspan%5B%40class%3D%22rubrikstor%22%5D%2Ftext()%20%7C%20%2F%2Fspan%5B%40class%3D%22rubrikstortunn%22%5D%2Ftext()'&format=json&callback=

	CSS-STYLE:
	use "http://yqlblog.net/samples/data.html.cssselect.xml"; select * from data.html.cssselect where url="http://systembolaget.se/SokDrycker/Produkt?VaruNr=2525" and css="span.rubrikstor"
	http://query.yahooapis.com/v1/public/yql?q=use%20%22http%3A%2F%2Fyqlblog.net%2Fsamples%2Fdata.html.cssselect.xml%22%3B%20select%20*%20from%20data.html.cssselect%20where%20url%3D%22http%3A%2F%2Fsystembolaget.se%2FSokDrycker%2FProdukt%3FVaruNr%3D2525%22%20and%20css%3D%22span.rubrikstor%22&format=json&callback=

NEW YQL:

	XPATH: --
	
	CSS-STYLE:
	use "http://yqlblog.net/samples/data.html.cssselect.xml"; select * from data.html.cssselect where url="http://systembolaget.se/Sok-dryck/Dryck/?varuNr=90060" and css="div.beverageProperties h1"
	http://query.yahooapis.com/v1/public/yql?q=use%20%22http%3A%2F%2Fyqlblog.net%2Fsamples%2Fdata.html.cssselect.xml%22%3B%20select%20*%20from%20data.html.cssselect%20where%20url%3D%22http%3A%2F%2Fsystembolaget.se%2FSok-dryck%2FDryck%2F%3FvaruNr%3D90060%22%20and%20css%3D%22div.beverageProperties%20h1%22&format=json&callback=
	

*/
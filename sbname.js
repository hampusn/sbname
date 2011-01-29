(function($,undefined) {

/*
 * jQuery.fn.sbname(options,ajaxErrorFunc);
 * 
 * Get a product's name, by it's product number, from systembolaget.se (which is the website 
 * of the state-owned company/store for liqour & other alcoholic beverages in Sweden.)
 * 
 * Version 0.1.2
 * 
 * 
 * by Hampus Nordin
 * http://labs.hampusnordin.se/sbname/
 * 
 * Using Yahoo!'s YQL to get the data from systembolaget.se.
 * http://developer.yahoo.com/yql/
*/

/* Accepted parameters:
 * 
 * 1.	$(selection).sbname();
 * 		Without parameters will fade out the product number and fade in the product name,
 * 		with the default options as seen below.
 * 
 * 2.	$(selection).sbname(options);
 *		Takes the options as an object literal.
 *		Default parameters are below this list of accepted parameters.
 *
 * 3.	$(selection).sbname(options,ajaxErrorFunc);
 * 		An error function can be passed...
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
 *						pass an empty object to argsIn. ie $(selector).sbname({argsIn: {} });
 *						-Defaults to { _currentOpacityOfObject_ }.
 *
 *		argsOut: 		Extra Arguments to animate Out. To skip the opacity,
 *						do the same as above, but for argsOut.
 *						-Defaults to {opacity:0}.
 *
 *		dom: 			Desc. Coming soon...,
 *						....
 *						If outer is set, the selection which $.sbname was called with will 
 *						practically be ignored, except from if there's a selection error with 
 *						outer. If that's the case, the original selection will be passed on 
 *						for chainability reasons.
 *						-Defaults to {outer: '', pNumber: '', pName: ''}.
 *
 *		nameFormat:		Cropping options of name. 
 *						
 *						-Defaults to {cropIf: 0, toLen: 0, after: ''}.
 *
 *		ajaxErrorFunc:	Desc. Coming soon...,
 *						....
 *						-Defaults to '' (none).
 *
 *		
*/

$.fn.sbname = function(options,ajaxErrorFunc) {
	
	//Check if a parameter for direction has ben passed and overwrite defaults with user inputs.
	var o = (typeof options !== 'string' && typeof options !== 'undefined') ? $.extend({}, $.fn.sbname.defaults, options) : $.extend({}, $.fn.sbname.defaults);
	
	//Set correct collection to loop through. If nothing has been passed. Use default, ie: whatever selection .sbname() was called with.
	var collection =	(o.dom.outer != '' && typeof o.dom.outer == 'string') ? $(o.dom.outer) :
						(o.dom.outer instanceof jQuery) ? o.dom.outer :
						this;

	//Make sure collection is a jQuery collection.
	if (collection instanceof jQuery) {
	
		//Return the elements for 'chainability'.
		return collection.each(function() {
			
			//Set the number element which holds the product number.
			var pNumber	=	(o.dom.pNumber != '' && typeof o.dom.pNumber == 'string') ? $(this).find(o.dom.pNumber) :
							(o.dom.pNumber instanceof jQuery) ? o.dom.pNumber :
							$(this);
			
			//Should we get the product number from the value attribute or the innerhtml?
			var pNumberType = (/^(?:area|textarea|input)$/i.test(pNumber[0].tagName)) ? 'value' : 'html';

			//Set the name element which will get the product name if found.
			var pName = 	(o.dom.pName != '' && typeof o.dom.pName == 'string') ? $(this).find(o.dom.pName) :
							(o.dom.pName instanceof jQuery) ? o.dom.pName :
							$(this);
			
			//Should we set the product name on the value attribute or in the innerhtml?
			var pNameType	= (/^(?:area|textarea|input)$/i.test(pName[0].tagName)) ? 'value' : 'html';
			
			//Get the ArtNr/Product number.
			var artnr =		(pNumberType == 'html') ? pNumber.html() : pNumber.attr('value');
			
			//Strip everything but the product number.
			var regex = /^[\d]+/;
			var artnr = regex.exec(artnr);
			
			//If ErrorFunc exists, bind it to current item in $.each.
			if (typeof ajaxErrorFunc === 'function') $(this).ajaxError(ajaxErrorFunc);
			
			//If artnr is an integer, continue.
			if (artnr == parseInt(artnr)) {
				
				//The heart of this plugin. I let Yahoo! do all the hard work :)
				//YQL which gets the span-element with the product name from systembolaget.se.
				var url = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D%22http%3A%2F%2Fsystembolaget.se%2FSokDrycker%2FProdukt%3FVaruNr%3D"+artnr+"%22%20and%20xpath%3D'%2F%2Fspan%5B%40class%3D%22rubrikstor%22%5D%2Ftext()%20%7C%20%2F%2Fspan%5B%40class%3D%22rubrikstortunn%22%5D%2Ftext()'&format=json&callback=";
				
				//Get the name.
				$.get(url, function(data) {
					
					//If a name was found, continue.
					if (data != '' && data['query']['results'] != null) {
						
						//Select string with the name.
						var d = data['query']['results'];
						
						//Filter out the product number and also all whitespaces and random newlines which SB seems to like.
						var regex2 = /[^\(]+/i;
						var r = regex2.exec(d);
						var name = $.trim(r[0]).replace(/[\s]{1,}/g,' ');
						
						//Format name according to o.nameFormat.
						var cropIf = parseInt(o.nameFormat.cropIf);
						var toLen = parseInt(o.nameFormat.toLen);
						name = 	(cropIf > 0 && name.length > cropIf) ?
									(toLen > 0 && toLen < cropIf) ?
									name.substr(0, toLen) :
									name.substr(0, cropIf) :
								name;
						
						//If o.nameFormat.after is set. Add that. Yep.
						if (o.nameFormat.after != '' && typeof o.nameFormat.after == 'string') name += o.nameFormat.after;
						
						//Set animation args.
						var opac = {opacity: pName.css('opacity')};
						var aOut = $.extend({}, o.argsOut);
						var aIn = $.extend({}, opac, o.argsIn);
						
						//Animate Out, Set text, Animate In.
						pName.animate(aOut,o.speedOut, function() {
							if (pNameType == 'html') {
								pName.html(name);
							} else {
								pName.attr('value',name);
							}
							pName.animate(aIn,o.speedIn);
						});
					}else{
						//Trigger Error since no name was found. Prolly bad product number.
						if (typeof ajaxErrorFunc === 'function') ajaxErrorFunc();
					}
				});
			}else{
				//Trigger Error since the product nr prolly was bad.
				if (typeof ajaxErrorFunc === 'function') ajaxErrorFunc();
			}
			//Unbind errorFunc.
			if (typeof ajaxErrorFunc === 'function') $(this).unbind('ajaxError');
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
	
	//Extra Arguments to animate In. To skip the opacity, pass an empty object to argsIn. ie $(selector).sbname({argsIn: {} });
	argsIn: {},
	
	//Extra Arguments to animate Out. To skip the opacity, do the same as above, but for argsOut.
	argsOut: {opacity:0},
	
	//Args... description coming in due time...
	dom: {outer: '', pNumber: '', pName: ''},
	
	//If name is longer than cropIf then crop to len and then add after.
	//Example:
	//Name = 'Saintsbury Lee Vineyard Pinot Noir 2007'; (length: 39)
	//nameFormat = {cropIf: 25, len: 20, after: '...'}
	//newName = 'Saintsbury Lee Viney...'
	nameFormat: {cropIf: 0, toLen: 0, after: ''}
	
};

})(jQuery);

/*

YQL:

select * from html where url="http://systembolaget.se/SokDrycker/Produkt?VaruNr=2525" and xpath='//span[@class="rubrikstor"]/text() | //span[@class="rubrikstortunn"]/text()'

New SB site will have this product url structure:

http://www.systembolaget.se/Sok-dryck/Dryck/?varuNr=2525

Dont forget to find new stuff to filter by (instead of span.rubrikstor etc.)




*/
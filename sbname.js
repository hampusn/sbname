(function($,undefined) {
	
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
 *
 * Default options:
 *		
 *		speedIn: 	The animation speed to use when the product name is animated in.
 *					Defaults to 400 (ms).
 *
 *		speedOut: 	The animation speed to use when the product number is animated out.
 *					Defaults to 500 (ms).
 *
 *		argsIn: 	Extra Arguments to animate In. To skip the opacity,
 *					pass an empty object to argsIn. ie $(selector).sbname({argsIn: {} });
 *					Defaults to { _currentOpacityOfObject_ }.
 *
 *		argsOut: 	Extra Arguments to animate Out. To skip the opacity,
 *					do the same as above, but for argsOut.
 *					Defaults to {opacity:0}.
 *
 *		
*/

$.fn.sbname = function(options) {
	
	//Store jQuery selection into a variable. Not really necessary but I tend to prefer this when $(this) doesn't
	//point to the incoming jQuery selection deeper down in the functions hierarchy.
	var collection = this;
	
	//Check if a parameter for direction has ben passed and overwrite defaults with user inputs.
	var o = (typeof options !== 'string' && typeof options !== 'undefined') ? $.extend({}, $.fn.sbname.defaults, options) : $.extend({}, $.fn.sbname.defaults);
	
		//Do stuff with each element if they have been initiated, else skip it.
		//Return the elements for 'chainability'.
		return collection.each(function() {
			var e = $(this);
			var artnr = e.html();
			
			//Strip everything but the product number.
			var regex = /^[\d]+/;
			artnr = regex.exec(artnr);
			
			//If artnr is an integer, continue.
			if (artnr == parseInt(artnr)) {
				
				//YQL which gets the span-element with the product name from systembolaget.se.
				var url = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D%22http%3A%2F%2Fsystembolaget.se%2FSokDrycker%2FProdukt%3FVaruNr%3D"+artnr+"%22%20and%20xpath%3D'%2F%2Fspan%5B%40class%3D%22rubrikstor%22%5D%2Ftext()%20%7C%20%2F%2Fspan%5B%40class%3D%22rubrikstortunn%22%5D%2Ftext()'&format=json&callback=";
				
				//Get the name.
				$.get(url, function(data) {
					
					//If a name was found, continue.
					if (data != '') {
						
						//Select string with the name.
						var d = data['query']['results'];
						
						//Filter out the product number and also all whitespaces and random newlines which SB seems to like.
						var regex2 = /[^\(]+/i;
						var r = regex2.exec(d);
						var name = $.trim(r[0]).replace(/[\s]{1,}/g,' ');
						
						//Set animation args.
						var opac = {opacity: e.css('opacity')};
						var aOut = $.extend({}, o.argsOut);
						var aIn = $.extend({}, opac, o.argsIn);
						
						//Animate Out, Set text, Animate In.
						e.animate(aOut,o.speedOut, function() {
							e.html(name);
							e.animate(aIn,o.speedIn);
						});
					}
				});
			}
		});
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
	argsOut: {opacity:0}
	
};

})(jQuery);
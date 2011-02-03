/* Author: 

*/
//  function initialize() {
//  }

var foodz = {
  //Search defaults:
  search_location_text: "Oakland, CA",
  search_location_lat: "37.804444",
  search_location_long: "-122.270833",
  search_terms: 'beer',
  user: false,
  //search_category: "bars"
  search_category: "restaurant",
  auth: {
    consumerKey: "k2ZeH3UcgrEAyOl9Lsj_uQ",
    consumerSecret: "Qgi9bHpW0dwRS5SIVApf41sr8Cs",
    accessToken: "zKxICRR4jvtfEAmVAI9T0E9wasybnf2m",
    accessTokenSecret: "ukYvDSh9euPlRFB73IRpqr4zcfQ",
    serviceProvider: {
      signatureMethod: "HMAC-SHA1"
    },
    accessor_info: {
      consumerSecret: "Qgi9bHpW0dwRS5SIVApf41sr8Cs",
      tokenSecret: "ukYvDSh9euPlRFB73IRpqr4zcfQ"
    }
  }
};
foodz = foodz;
foodz.yelp = {};
foodz.yelp.businesses = {};
foodz.yelp.markers = {};
foodz.draw_map = function(){
  foodz.latlng = new google.maps.LatLng(foodz.search_location_lat, foodz.search_location_long);
  foodz.myMapOptions = {
    zoom: 14,
    center: foodz.latlng,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  foodz.map = new google.maps.Map(document.getElementById("map_canvas"), foodz.myMapOptions);
};

//  DRAW THE MAP!! 
foodz.draw_map();

foodz.yelp_data_callback = function(data){ 
  console.log(data);
  foodz.search_results = data;
  for( i=0; i < data.businesses.length ; i++)
  {
    foodz.add_yelp_marker_to_map(data.businesses[i]);
    foodz.yelp.businesses[data.businesses[i].id] = data.businesses[i];
  }
  //add event listeners to all map search results
  for( marker_id in foodz.yelp.markers)
  {
    console.log(foodz.yelp.markers[marker_id].title);
    google.maps.event.addListener( foodz.yelp.markers[marker_id], 'click', foodz.handleMapItemClick);
  }
};

foodz.find = function( mode, params ) 
{
  parameters = [];
  parameters.push(['oauth_consumer_key', foodz.auth.consumerKey]);
  parameters.push(['oauth_consumer_secret', foodz.auth.consumerSecret]);
  parameters.push(['oauth_token', foodz.auth.accessToken]);
  parameters.push(['oauth_signature_method', 'HMAC-SHA1']);
  parameters.push(['category', foodz.search_category]);
  parameters.push(['callback', 'cb']);
  
  message = { 
    'action': 'http://api.yelp.com/v2/search',
    'method': 'GET',
    'parameters': parameters 
  };
  
  if( mode == 'terms' )
  {
    foodz.search_category = params;
    parameters.push(['location', foodz.search_location_text]);
    parameters.push(['term', foodz.search_category]);
  }
  else if( mode == 'location')
  {
    parameters.push(['location', foodz.search_location_text]);
  }
  else if( mode == 'id')
  {
    message.action = 'http://api.yelp.com/v2/business/' + params;
  }
  else
  {
    mode = 'location';
    foodz.search_location_text = 'oakland, ca';
    parameters.push(['location', foodz.search_location_text]);
  }

  this.dev_mode = true;
  //this.dev_mode = false;
  if( this.dev_mode === true ){ 
    $.ajax({
      'url': 'http://localhost:3000/js/beerbar_results.json',
      'dataType': 'json',
      'success': function(data, textStats, XMLHttpRequest) {
        foodz.yelp_data_callback(data);
      }
    });
  }
  else
  {
    OAuth.setTimestampAndNonce(message);
    OAuth.SignatureMethod.sign(message, this.auth.accessor_info);
    parameterMap = OAuth.getParameterMap(message.parameters);
    console.log(parameterMap);

    $.ajax({
      'url': message.action,
      'data': parameterMap,
      'dataType': 'jsonp',
      'jsonpCallback': 'cb',
      'success': function(data, textStats, XMLHttpRequest) {
        foodz.yelp_data_callback(data);
      }
    });
  }
};

foodz.find_by_term_and_location = function( search_terms, location_text )
{
  this.search_location_text = location_text;
  this.find_by_term( search_terms );
};

foodz.find_by_term = function( search_terms )
{
  //update our current search terms
  this.search_terms = search_terms;
  // clear current map pins
  this.clear_markers();
  //search by term
  this.find('term', search_terms);
};

foodz.find_by_location = function( location_text )
{
  //update our current search terms
  this.search_terms = location_text;
  this.search_location_text = location_text;
  // clear current map pins
  this.clear_markers();
  this.find('location', location_text);
};

foodz.yelp_find_by_id = function( id )
{
  foodz.find( 'id', id);
};

foodz.add_yelp_marker_to_map = function( yelp ){
  //convert yelp business to a google map marker
  if( this.dev_mode === true )
  { 
    latt = yelp.latitude;
    lngt = yelp.longitude;
  }
  else
  {
    latt = yelp.location.coordinate.latitude;
    lngt = yelp.location.coordinate.longitude;
    
  }
  marker = {
    position: new google.maps.LatLng(latt, lngt),
    title: yelp.id,
    map: foodz.map,
    animation: google.maps.Animation.DROP
  };
  //*TODO: pan and focus the map on each marker after dropping it
  foodz.yelp.markers[yelp.id] = new google.maps.Marker( marker );
};

foodz.handleMapItemClick = function(e){
  console.log( 'clicked on: ' + e.currentTarget.title);
  foodz.toggleMarkerBounce( foodz.yelp.markers[ e.currentTarget.title ] );
};

foodz.toggleMarkerBounce = function( marker ){
  if (marker.getAnimation() != null) {
    marker.setAnimation(null);
  } else {
    marker.setAnimation(google.maps.Animation.BOUNCE);
  }
  foodz.restaurant_detail_view(marker.title);
};

foodz.clear_markers = function( )
{ 
  for( i in foodz.yelp.markers){ foodz.yelp.markers[i].setMap(null) };
  this.yelp = {};
  //reset businesses array
  this.yelp.businesses = {};
  //reset marker array
  this.yelp.markers = {};
};

foodz.user_detail_view = function(id){
  //get user detail html by facebook_id
  //user = foodz.get('user', id);
  //html = '<div>user</div>';
  //html.showzizzle();

  //Logged-In only?  load login prompt?
  alert('detail view of user ' + id);
};
foodz.restaurant_detail_view = function(id){
  //get restaurant / favorite detail html by yelp_id
  //print favorite_count
  console.log('detail view of ' + foodz.yelp.businesses[id].name );
};
foodz.fav_user_list_view = function(id){
  //get user list html by yelp_id
  //Logged-In only?  load login prompt?
  alert('list view of users per restaurant' + id);
};
foodz.user_fav_list_view = function(id){
  //get restaurant list html by facebook_id
  //Logged-In only?  load login prompt?
  alert('list view of favorites per user ' + id);
}
foodz.mark_favorite = function(user_id, yelp_id)
{
  //
  //this.favorites.users[user_id].append(yelp_id);
  //this.users.favorites[yelp_id].append(user_id);
};





///SAMMY routes:
;(function($) {
  var app = $.sammy('#main', function() {
    this.debug = true;
    //this.use(Sammy.Cache);
    this.use(Sammy.Template, 'erb');

    var db = null;
    var db_loaded = false;

    this.before(function() {
      if (!db_loaded) {
        //this.redirect('#/connecting');
        //return false;
      }
    });

    // write! - should this be a put or post?  or *not* bookmarkable?
    this.post('#/favorites/', function(context) {
      //must be logged in!
      // TODO: if not logged in redirect to login page

      //FB.ui popup publish offer on fave()/save()?
      context.log('mark a restaurant as a favorite');

      var favorite  = {
        yelp_id: this.params['id'],
        //TODO: SET THE USER ID!

        // foodz.user_id
        user_id: foodz.user_id,
        created_at: Date()
      };
      db.collection('favorites').create(favorite, {
        success: function(favorite) {
         // context.partial('/templates/task.html.erb', {task: task}, function(task_html) {
         //   $('#tasks').prepend(task_html);
         // });
         //// clear the form
         // $('.entry').val('');
        },
        error: function() {
          context.trigger('error', {message: 'Sorry, could not save your task.'})
        }
      });
    });

    // read-only urls:
    this.get('#/restaurant/:id/', function(context) {
      //include favorite count if any
      foodz.restaurant_detail_view(id);
      //this.task = db.collection('tasks').get(this.params['id']).json();
      //this.partial('/templates/task_details.html.erb')

      //provide a link to '#/favorite/:id/users/' list view
      //FB.ui popup publish offer on fave()/save()?
    });
    this.get('#/favorite/:id/users/', function(context) {
      //ask the user to log in!!
      context.log('all users who consider this restaurant a favorite');
    });
    this.get('#/favorites/', function(context) {
      //  TODO: visually cycle through the 20 most recent favorites
      //  pan/zoom the map, fade in overlay info
      foodz.find('term', 'Beer');
      context.log('recent favorites');
    });
    this.get('#/search/', function(context) {
      context.log('search');
    });
    this.get('#/settings/', function(context) {
      context.log('app settings');
    });
    this.get('#/user/:id/favorites/', function(context) {
      context.log('favorite list view, per user');
    });
    this.get('#/user/:id/', function(context) {
      //include favorite count if any
      //only available to logged in users?

      //this.task = db.collection('tasks').get(this.params['id']).json();
      //this.partial('/templates/task_details.html.erb')
      context.log('user detail view');
    });
    this.get('#/about/', function(context) {
      //welcome / about this app
      context.log('about');
    });

    this.get('#/', function(context) {
      //default view:
      //*TODO: attempt to auto locate the search (if possible)
      //*HACK: for now, redirect to the favorites page, get straight to the action.
      this.redirect('#/favorites/');
      //this.redirect('#/about/');
      //popup location search box
      //this.redirect('#/search/');
    });


  this.get('#/connecting', function() {
    //*TODO: welcome message, tos?
    //  $('#main').html('<span class="loading">... Loading ...</span>');
  });

//    this.bind('task-toggle', function(e, data) {
//      this.log('data', data)
//      var $task = data.$task;
//      this.task = db.collection('tasks').get($task.attr('id'));
//      this.task.attr('completed', function() { return (this == true ? false : true); });
//      this.task.update({}, {
//        success: function() {
//          $task.toggleClass('completed');
//        }
//      });
//    });

    this.bind('run', function() {
      var context = this;
//      db = $.cloudkit;
//      db.boot({
//        success: function() {
//          db_loaded = true;
//          context.trigger('db-loaded');
//        },
//        failure: function() {
//          db_loaded = false;
//          context.trigger('error', {message: 'Could not connect to CloudKit.'})
//        }
//      });
//
//      $('li.task :checkbox').live('click', function() {
//        var $task = $(this).parents('.task');
//        context.trigger('task-toggle', {$task: $task});
//      });
    });

  this.bind('db-loaded', function() {
    this.redirect('#/welcome/');
  });

  this.bind('error', function(e, data) {
    $('#error').text(data.message).show();
  });

  //app.foodz = foodz;
    });

  $(function() {
    app.run('#/');
  })

})(jQuery);


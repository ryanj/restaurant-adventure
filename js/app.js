//TODO: build a Yelp sammy plugin
var YelpLib = function(app) {
  this.helpers({
    yelp_by_term_and_location: function( search_terms, location_text ){
      this.find_by_term( search_terms );
    }
  });
};

// A google maps plugin
var GoogleMapsLib = function(app) {
  this.helpers({
    draw_map: function( lat, long ){

      foodz.latlng = new google.maps.LatLng(foodz.search_location_lat, foodz.search_location_long);
      foodz.myMapOptions = {
        zoom: 14,
        center: foodz.latlng,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };
      foodz.map = new google.maps.Map(document.getElementById("map_canvas"), foodz.myMapOptions);
      this.trigger('map-and-fb-loaded');
    }
  });
};

// A connect-js plugin / wrapper
var FBConnect = function(app) {
  this.helpers({
    login_check: function(){FB.getLoginStatus(this.handleSessionResponse);},
    
    fb_init: function( app_id ){
      FB.init({appId: app_id, status: true, cookie: true, xfbml: true});
      $('#login').show().bind('click', function() {
        FB.login();
      });
      $('#logout').bind('click', function() {
        FB.logout();
      });
      FB.Event.subscribe('auth.sessionChange', this.handleSessionResponse );
      FB.Event.subscribe('auth.login', function(){ $('#main').dialog('close');} );
      FB.getLoginStatus(this.handleSessionResponse);
      this.trigger('map-and-fb-loaded');
    },

    // handle a session response from any of the auth related calls
    handleSessionResponse: function(response) {
      if (!response.session) {
        foodz.user = false;
        foodz.hide_user();
        return;
      }
      else if(response.session.uid != 0){
        this.user_id = response.session.uid;
        foodz.app.db.openDoc(this.user_id, {
          success: function(response) {
            //welcome back!
            foodz.user = response;
            foodz.display_user();
          },
          error: function(response) {
            FB.api(
              {
                method: 'fql.query',
                query: 'SELECT id, name, pic FROM profile WHERE id=' + FB.getSession().uid
              },
              function(response) {
                this.user['_id'] = this.user.id;
                this.user['type'] = 'user';
                foodz.app.db.saveDoc( this.user );
                foodz.user = this.user;
                log('created a new user account for: ' + this.user.name);
                foodz.display_user();
                $('#main').dialog("close");
              }
            );
          } 
        });
      }
    },

    get_current_user_id : function() {
      return FB.getSession().uid;
    },

    get_fb_user: function( id ) {
      FB.api(
        {
          method: 'fql.query',
          query: 'SELECT id, name, pic FROM profile WHERE id=' + id
        },
        function(response) {
          response[0]['_id'] = id;
          return response[0];
        }
      );
    },
  });
};

var foodz = {
  //Search defaults:
  search_location_text: "San Francisco, CA",
  search_location_lat: "37.804444",
  search_location_long: "-122.270833",
  search_terms: 'beer',
  user: false,
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
foodz.yelp = {};
foodz.yelp.businesses = {};
foodz.yelp.markers = {};

foodz.yelp_data_callback = function(data){ 
  console.log(data);
  if(!data.businesses){
    // this is a single result, not a list
    foodz.yelp.businesses[data.id] = data;
    if(!data.type == 'favorite'){
      foodz.yelp.businesses[data.id]['_id'] = data.id;
      foodz.yelp.businesses[data.id]['type'] = "favorite";
      foodz.yelp.businesses[data.id]['lat'] = data['location']['coordinate']['latitude'];
      foodz.yelp.businesses[data.id]['long'] = data['location']['coordinate']['longitude'];
      foodz.yelp.businesses[data.id]['location'] = data['location']['city'] + ', ' + data['location']['state_code'];
    }
    foodz.add_marker_to_map(foodz.yelp.businesses[data.id]);
  }else{
    foodz.search_results = data;
    for( i=0; i < data.businesses.length ; i++)
    {
      foodz.yelp.businesses[data.businesses[i].id] = data.businesses[i];
      foodz.yelp.businesses[data.businesses[i].id]['type'] = "favorite";
      foodz.yelp.businesses[data.businesses[i].id]['_id'] = data.businesses[i]['id'];
      foodz.yelp.businesses[data.businesses[i].id]['lat'] = data.businesses[i]['location']['coordinate']['latitude'];
      foodz.yelp.businesses[data.businesses[i].id]['long'] = data.businesses[i]['location']['coordinate']['longitude'];
      foodz.yelp.businesses[data.businesses[i].id]['location'] = data.businesses[i]['location']['city'] + ', ' + data.businesses[i]['location']['state_code'];
      foodz.add_marker_to_map(foodz.yelp.businesses[data.businesses[i].id]);
    }
  }
};

foodz.hide_user = function(){ 
  $('#user-info').hide('fast');
  $('#login').show('fast');
  $('#logout').hide('fast');
};

foodz.display_user = function(){ 
  $('#login').hide('fast');
  $('#user-info').html('<a style="text-decoration:none;" href="#/user/' + this.user.id + '/"><img style="width:76px;" src="' + this.user.pic + '">' + this.user.name + '</a>' ) .show('fast');
  $('#logout').hide('fast');
  $('#user-info').show('fast');
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
  
  if( mode == 'term' )
  {
    foodz.search_category = params;
    message.parameters.push(['location', foodz.search_location_text]);
    message.parameters.push(['term', params]);
  }
  else if( mode == 'location')
  {
    foodz.search_location_text = params;
    message.parameters.push(['location', foodz.search_location_text]);
  }
  else if( mode == 'id')
  {
    message.action = 'http://api.yelp.com/v2/business/' + params;
  }
  else
  {
    log('oh noes!, this is a bad error!');
    log('What did you intend to search for? Search params are missing...  sending results for coffee locations.');
    mode = 'term';
    message.parameters.push(['term', 'coffee']);
  }

  //if( this.dev_mode === true ){ 
  //  $.ajax({
  //    'url': 'js/beerbar_results.json',
  //    'dataType': 'json',
  //    'success': function(data, textStats, XMLHttpRequest) {
  //      foodz.yelp_data_callback(data);
  //    }
  //  });
  //  return;
  //}
  OAuth.setTimestampAndNonce(message);
  OAuth.SignatureMethod.sign(message, foodz.auth.accessor_info);
  parameterMap = OAuth.getParameterMap(message.parameters);

  $.ajax({
    'url': message.action,
    'data': parameterMap,
    'dataType': 'jsonp',
    'jsonpCallback': 'cb',
    'success': function(data, textStats, XMLHttpRequest) {
      foodz.yelp_data_callback(data);
    }
  });
};

foodz.find_by_term_and_location = function( search_terms, location_text )
{
  if( location_text != '' ){ this.search_location_text = location_text;};
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

foodz.add_marker_to_map = function( yelp ){
  //convert yelp business to a google map marker
  marker = {
    position: new google.maps.LatLng(yelp.lat, yelp.long),
    title: yelp.id,
    map: foodz.map,
    animation: google.maps.Animation.DROP
  };

  if( foodz.user && foodz.user.favorites && foodz.user.favorites[ yelp.id ] )
  {
    marker.animation = google.maps.Animation.BOUNCE;
  }
  foodz.yelp.markers[yelp.id] = new google.maps.Marker( marker );
  foodz.map.setCenter( marker.position );
  google.maps.event.addListener( foodz.yelp.markers[yelp.id], 'click', foodz.handleMapItemClick);
};

foodz.handleMapItemClick = function(e){
  console.log( 'clicked on: ' + e.currentTarget.title);
  //trigger 
  app = Sammy.apps['#main'];
  app.trigger('load-restaurant', { id: e.currentTarget.title } );
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


//             ^^     MAP AND YELP INTERACTION ABOVE     ^^

///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////

//        Sammy - couchdb models: { user, restaurant }, controllers, views, events


///SAMMY app:
;(function($) {
  var app = $.sammy('#main', function() {
    //  INITIALIZE OUR LOCAL STATE:
    this.debug = true;
    this.foodz = foodz;
    var db = null;
    var db_loaded = false;

    // APPLICATION PLUGINS:
    //this.use(Sammy.Cache);
    this.use('Template', 'erb');
    this.use('Couch');
    //this.use(YelpLib);
    this.use(GoogleMapsLib);
    this.use(FBConnect);
    //this.use('NestedParams');

    // a BEFORE FILTER for routes    .. (just for routes, right?)
    this.before(function() {
      //if (!db_loaded) {
        //this.redirect('#/connecting');
        //return false;
          //if (!js_loaded) {
      //}
    });

    // CONTROLLER ACTIONS

    // POST - write!
    this.post('#/favorite/:id/', function(context) {
      //must be logged in!
      //TODO: move this to a before filter
      if( foodz.user == false )
      {
        context.redirect('#/login/');
        return;
      }

      // TODO: FB.ui popup publish offer on fave()/save()?
      context.log('mark a restaurant as a favorite');

      yelp_id = this.params['id'];
      user_id = foodz['user']['id'];
      user_name = foodz.user.name;

      this.db.openDoc(yelp_id, {
        success: function(response) {
          favorite = response;
          //update record
          favorite.users[ foodz.user.id ] = foodz.user.name;
          foodz.app.db.saveDoc( favorite );
          foodz.yelp.businesses[yelp_id] = favorite;
        },
        error: function(response) {
          favorite = {
            '_id': yelp_id,
            'type': "favorite",
            'name': foodz.yelp.businesses[yelp_id]['name'], 
            'rating_img_url': foodz.yelp.businesses[yelp_id]['rating_img_url'], 
            'url': foodz.yelp.businesses[yelp_id]['url'],
            'location': foodz.yelp.businesses[yelp_id]['location'],
            'lat' : foodz.yelp.businesses[yelp_id]['lat'],
            'long' : foodz.yelp.businesses[yelp_id]['long'], 
          };
          favorite.users = {};
          favorite.users[foodz.user.id] = foodz.user.name;
          foodz.app.db.saveDoc( favorite );
          foodz.yelp.businesses[yelp_id] = favorite;
        }
      });
      
      // store fave_user and user_fave
      this.db.openDoc( foodz.user.id, {
        success: function(response) {
          foodz.user = response;
          //update record
          if( !foodz.user.favorites ){ 
            foodz.user.favorites = {}; 
          }
          foodz.user.favorites[yelp_id] = favorite; 
          foodz.app.db.saveDoc( foodz.user );
        }
      });
      foodz.yelp.markers[ yelp_id ].setAnimation(google.maps.Animation.BOUNCE);
      foodz.map.setCenter( foodz.yelp.markers[ yelp_id ]['position'] );
      this.redirect('#/');
    }); 

    // submit our search form:
    this.post('#/search/', function(context) {
      log(context);
      log(this.params.search_term);
      foodz.find_by_term_and_location(this.params.search_term, this.params.search_location);
      $('#main').dialog('close');
    });

    // read-only urls:
    this.get('#/search/', function(context) {
      $('#ui-dialog-title-main').html('Search');
      new_html = '<div><form action="#/search/" method="post"><label width="40px;">';
      new_html += 'Search Restaurants:</label><br/><input name="search_term" id="search_term" style="color:#CCC;" type="text"/><br/>';
      new_html += '<label>Location:</label><br/>';
      new_html += '<input name="search_location" id="search_location" placeholder="' + foodz.search_location_text + '" style="color:#CCC;" type="text"/>';
      new_html += '<br/><input value="Search" type="submit" /></div>';
      $('#main').html(new_html);
      $('#main').dialog('open');
    });

    //restaurant detail view:
    this.get('#/restaurant/:id/', function(context) {
      //get restaurant / favorite detail html by yelp_id
      id = this.params['id'];
      this.restaurant = false;
      this.db.openDoc( id, {
        success: function(response) {
          foodz.yelp.businesses[id] = response;
        },
        error: function(response) {
          if(!foodz.yelp.businesses[id]){ foodz.find('id', id); }
          this.restaurant = foodz.yelp.businesses[id];
        }
      });
      this.restaurant = foodz.yelp.businesses[id];
      log('detail view of ' + foodz.yelp.businesses[id].name );
      this.restaurant['is_favorite'] = false;
      this.restaurant.user_count = 0;
      this.restaurant.users_html = '';
      if(this.restaurant.users){
        for(user in this.restaurant.users){
          this.restaurant.users_html += '<p><a href="#/user/' + user +'/">' + this.restaurant.users[user] + '</a></p>';
          this.restaurant.user_count = this.restaurant.user_count + 1;
          if( foodz.user && foodz.user.id && foodz.user.id == user ){ 
            this.restaurant['is_favorite'] = true; 
          }
        }
      }
      $('#ui-dialog-title-main').html('Restaurant');
      sometext = this.partial('templates/restaurant.html.erb');
      $('#main').dialog('open');
    });

    //user detail view
    this.get('#/user/:id/', function(context) {
      //only available to logged in users?  load login prompt?
      this.id = this.params['id'];
      context.log("user detail view: " + this.id);
      if( foodz.user !== false && foodz.user.id == this.id){
        this.user = foodz.user;
      }else{
        this.user = foodz.app.db.loadDoc(this.id); 
      }
      this.user.favorite_count = 0;
      if(this.user.favorites){
        this.user.favorites_html = '';
        for (fave in this.user.favorites){
          this.user.favorites_html += '<p><a href="#/restaurant/' + fave +'/">' + this.user.favorites[fave]['name'] + '</a></p>';
          this.user.favorite_count += 1;
        }
      }
      $('#ui-dialog-title-main').html('User Profile');
      //context.render( 'templates/user.html.erb', user );
      this.partial('templates/user.html.erb');
      $('#main').dialog('open');
    });

    //restaurant list view (group_by user):
    this.get('#/user/:id/favorites/', function(context) {
      //clear map markers
      foodz.clear_markers();
      //get our list of restaurants
      this.db.openDoc(this.params['id'], {
        success: function(user){
          if( user.favorites ) {
            for( fave in user.favorites){
              //load them and attach markers to the map
              foodz.app.db.openDoc(fave, {success: foodz.yelp_data_callback});
            }
          }
        }
      });
    });

    //restaurant list, view all or view recent / popular
    this.get('#/favorites/', function(context) {
      //  TODO: visually cycle through the 20 most recent favorites
      //  pan/zoom the map, fade in overlay info
      this.db.allDocs({
        success: function(docs){
          for( i=0; i < docs.total_rows ; i++ ){
            foodz.app.db.openDoc( docs.rows[i].key, {
              success: function(doc){
                if(doc.type == 'favorite'){ foodz.yelp_data_callback(doc); }
              }
            });
          }
        }
      });
      $('#ui-dialog-title-main').html('Top Favorites');
      new_html = '<div><p>Recent favorites are being added to the map.</p></div>'; 
      $('#main').html(new_html);
      $('#main').dialog('open');
    });

    //user list, view all or view recent / popular
    this.get('#/users/', function(context) {
      //must be logged in!
      //TODO: move this validation to a before filter
      if( foodz.user == false )
      {
        context.redirect('#/login/');
        return;
      }
      $('#ui-dialog-title-main').html('Users');
      $('#main').html('');
      this.db.allDocs({
        success: function(docs){
          for( i=0; i < docs.total_rows ; i++ ){
            foodz.app.db.openDoc( docs.rows[i].key, {
              success: function(doc){
                if(doc.type == 'user'){
                  $('#main').append("<p><a href='#/user/" + doc.id + "/'>" + doc.name +"</a></p>");
                }
              }
            }); 
          }
        }
      });
      $('#main').dialog('open');
    });

    //options menu
    this.get('#/menu/', function(context) {
      $('#ui-dialog-title-main').html('MENU');
      new_html = "<p><a href='#/search/'>Search</a></p><p><a href='#/favorites/'>Top Favorites</a></p>";
      if( foodz.user !== false){ 
        new_html += "<p><a href='#/user/"+foodz.user.id+"/'>My Profile</a></p>"; 
      }else{
        new_html += "<p><a href='#/login/'>My Profile</a></p>";
      }
      new_html += "<p><a href='#/users/'>Users</a></p><p><a href='#/about/'>About</a></p>";
      $('#main').html(new_html);
      $('#main').dialog('open');
    }); 

    //login page
    this.get('#/login/', function(context) {
      //login?
      $('#ui-dialog-title-main').html('Would you like to login?');
      new_html = "<p>Sorry, some features of this site require account access.</p<p>Please try logging in to enable more advanced features.</p><br/><br/><p><button id='login_button'>Login with Facebook</button> &nbsp; &nbsp; or &nbsp; &nbsp; <button id='continue_button'>Continue anonymously</button></p>";
      $('#main').html(new_html);
      $('#main').dialog('open');
      $('#continue_button').bind('click', function() {
        $('#main').dialog('close');
      });
      $('#login_button').bind('click', function() {
        FB.login();
      });
    });

    //setting page
    this.get('#/settings/', function(context) {
      // logout / disconnect
      //<button style='display:none;' id="disconnect">Disconnect</button>
      //<button style='display:none;' id="logout">Logout</button>
      $('#main').dialog('open');
      context.log('app settings');
    });

    // About / Welcome page
    this.get('#/about/', function(context) {
      //welcome / about this app
      $('#ui-dialog-title-main').html('Welcome');
      new_html = "<p>This couchdb demo app is currently under development.<br/>It should allow you to sign in via facebook and mark yelp restaurants / reviews as favorites. Users should also be able to see content that has been marked as a favorite by others.<br/><br/>You can find more info on github:<br/><a href='https://github.com/ryanjarvinen/restaurant-adventure'>https://github.com/ryanjarvinen/restaurant-adventure</a>.</p><br/><p>Just click the 'MENU' button to get started.</p>";
      $('#main').html(new_html);
      $('#main').dialog('open');
    });

    //main map view
    this.get('#/', function(context) {
      if( $('#main').dialog('isOpen'))
      { $('#main').dialog('close');}
    });

    this.bind('run', function() {
      var context = this;
      // initialize our map
      this.draw_map();
      //initialize facebook api
      app_id = '0501aae0be4cc61f8b2bc429c994b7a0'; // production:
      //app_id = 'e0e601064838428368f05fe285c14e41'; // development
      this.fb_init(app_id);

      //load a handler to our database
      this.db = $.couch.db("restaurant_adventure");

      $('#main').dialog({modal:true, autoOpen: false, width: 500, close: function(event, ui) { context.redirect('#/'); }});
      
      $('#menu_button').bind('click', function() {
        context.redirect('#/menu/');
      });
    });

    // EVENT TRIGGERS
    this.bind('load-restaurant', function( e, data) {
      this.redirect('#/restaurant/' + data.id + '/');
    });

    //this.bind('map-and-fb-loaded', function( e, data) {
    //  if( foodz.user && foodz.map ){
    //    if(foodz.user.favorites) {
    //      for( fave in foodz.user.favorites){
    //        foodz.app.db.openDoc(fave).then(function(data){foodz.yelp_data_callback(data);});
    //      }
    //    }
    //  }
    //});

    //this.bind('error', function(e, data) {
    //  $('#error').text(data.message).show();
    //});
  });

  $(function() {
    app.run('#/about/');
  })

})(jQuery);

foodz.app = Sammy.apps['#main'];

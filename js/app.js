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
      this.latlng = new google.maps.LatLng( lat, long );
      this.myMapOptions = {
        zoom: 14,
        center: this.latlng,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };
      this.map = new google.maps.Map(document.getElementById("map_canvas"), this.myMapOptions);
    }
  });
};

// A connect-js wrapper?
var FBConnect = function(app) {
  this.helpers({
    fb_init: function( app_id ){
      FB.init({appId: app_id, status: true, cookie: true, xfbml: true});

      FB.getLoginStatus(this.handleSessionResponse);

      $('#login').bind('click', function() {
        FB.login(this.handleSessionResponse);
      });

      $('#logout').bind('click', function() {
        FB.logout(this.handleSessionResponse);
      });
    },

    login_click_handler: function(){FB.login(this.handleSessionResponse);},

    // handle a session response from any of the auth related calls
    handleSessionResponse: function(response) {
      console.log(response.session);
      if (!response.session) {
        $('#user-info').hide('fast');
        foodz.user = false;
        foodz.user.id = 0;
        $('#login').show('fast');
        $('#logout').hide('fast');
        return;
      }
      else if(response.session.uid != 0){
        this.user_id = response.session.uid;
        this.fb_session = response.session.uid;

        foodz.app.db.openDoc(this.user_id, {
          success: function(response) {
            foodz.user = response;
            $('#user-info').html('<a style="text-decoration:none;" href="#/user/' + foodz.user.id + '/"><img style="width:76px;" src="' + foodz.user.pic + '">' + foodz.user.name + '</a>' ).show('fast');
            //$('#user-info').show('fast');
            //log(response);
            $('#main').dialog("close");
          },
          error: function(response) {
            FB.api(
              {
                method: 'fql.query',
                query: 'SELECT id, name, pic FROM profile WHERE id=' + FB.getSession().uid
              },
              function(response) {
                // .then save user to db
                this.user = response[0];
                this.user['_id'] = this.user.id;
                $('#user-info').html('<a style="text-decoration:none;" href="#/user/' + this.user.id + '/"><img style="width:76px;" src="' + this.user.pic + '">' + this.user.name + '</a>' ) .show('fast');
                $('#login').hide('fast');
                $('#logout').hide('fast');
                $('#user-info').show('fast');
                this.user['type'] = 'user';
                foodz.user = this.user;
                foodz.app.db.saveDoc( this.user );
                log('created a new user account for: ' + this.user.name);
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
  search_location_text: "Oakland, CA",
  search_location_lat: "37.804444",
  search_location_long: "-122.270833",
  search_terms: 'beer',
  user: false,
  dev_mode: true,
  //dev_mode: false,
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

  if( this.dev_mode === true ){ 
    $.ajax({
      'url': 'js/beerbar_results.json',
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
  //trigger 
  app = Sammy.apps['#main'];
  app.trigger('load-restaurant', { id: e.currentTarget.title } );

  //foodz.toggleMarkerBounce( foodz.yelp.markers[ e.currentTarget.title ] );
  //foodz.toggleMarkerBounce( foodz.yelp.markers[ e.currentTarget.title ] );
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
    //this.use(GoogleMapsLib);
    this.use(FBConnect);
    //this.use('NestedParams');

    // a BEFORE FILTER for routes    .. (just for routes, right?)
    this.before(function() {
      if (!db_loaded) {
        //this.redirect('#/connecting');
        //return false;
          //if (!js_loaded) {
      }
    });

    // CONTROLLER ACTIONS

    // POST - write!
    this.post('#/favorite/:id/', function(context) {
      //must be logged in!
      // TODO: if not logged in redirect to login page
      //this.favorites.users[user_id].append(yelp_id);
      //this.users.favorites[yelp_id].append(user_id);
      if( foodz.user == false )
      {
        context.redirect('#/login/');
      }

      //FB.ui popup publish offer on fave()/save()?
      context.log('mark a restaurant as a favorite');

      yelp_id = this.params['id'];
      user_id = foodz['user']['id'];
      user_name = foodz.user.name;

      this.db.openDoc(yelp_id, {
        success: function(response) {
          favorite = response;
          if(!foodz.yelp.businesses[yelp_id]){
            foodz.yelp.businesses[yelp_id] = favorite;
          }
          //update record
          favorite.users[user_id] = user_name; 
          foodz.app.db.saveDoc( favorite );
        },
        error: function(response) {
          if(foodz.yelp.businesses[yelp_id]){
            favorite = {
              'yelp_id': yelp_id,
              'type': "favorite",
              'name': foodz.yelp.businesses[yelp_id]['name'], 
              'rating': foodz.yelp.businesses[yelp_id]['rating_img_url'], 
              'href': foodz.yelp.businesses[yelp_id]['url'],
              'location': foodz.yelp.businesses[yelp_id]['city'],
              'state': foodz.yelp.businesses[yelp_id]['state'],
              'users': { user_id: user_name },
              'lat' : foodz.yelp.businesses[yelp_id]['latitude'],
              'long' : foodz.yelp.businesses[yelp_id]['longitude'], 
            };
            foodz.app.db.saveDoc( favorite );
          }else{
            //TODO: look this up via yelp
            record = foodz.find('id', yelp_id);
            favorite  = {
              'yelp_id': yelp_id,
              'type': "favorite",
              'name': record.businesses[yelp_id]['name'], 
              'rating': record.businesses[yelp_id]['rating_img_url'], 
              'href': record.businesses[yelp_id]['url'],
              'location': record.businesses[yelp_id]['city'] + ", " + record.businesses[yelp_id]['state'],
              'users': { user_id: user_name }
            };
            if( this.dev_mode === true ) {
              favorite['lat'] = record.businesses[yelp_id]['latitude']; 
              favorite['long'] = record.businesses[yelp_id]['longitude']; 
            } else {
              favorite['lat'] = record.businesses[yelp_id]['location']['coordinate']['latitude'];
              favorite['long'] = record.businesses[yelp_id]['location']['coordinate']['longitude']; 
            }
            foodz.app.db.saveDoc( favorite );
          }
        }
      });
      // fave_user and user_fave
      this.db.openDoc( foodz.user.id, {
        success: function(response) {
          foodz.user = response;
          //update record
          if( !foodz.user.favorites)
          { foodz.user.favorites = {}; }
          foodz.user.favorites[yelp_id] = favorite; 
          foodz.app.db.saveDoc( foodz.user );
        }
      });
      this.redirect('#/restaurant/' + yelp_id + '/');
    }); 

    this.post('#/search/', function(context) {
      foodz.find('term', 'Beer');
      $('#main').dialog('close');
    });

    // read-only urls:
    this.get('#/restaurant/:id/', function(context) {
      //get restaurant / favorite detail html by yelp_id
      id = this.params['id'];
      log('detail view of ' + foodz.yelp.businesses[id].name );
      $('#ui-dialog-title-main').html('Restaurant');
      this.restaurant = foodz.yelp.businesses[id];
      this.restaurant['favorite'] = false;
      this.restaurant['user_count'] = 0;
      sometext = this.partial('templates/restaurant.html.erb');
      $('#main').dialog('open');

      //print favorite_count
      //FB.ui popup publish offer on fave()/save()?

      //this.favorite = db.collection('favorites').get(this.params['id']).json();
      //this.partial('/templates/task_details.html.erb')
      //provide a link to '#/favorite/:id/users/' list view

    });
    this.get('#/favorite/:id/users/', function(context) {
      //ask the user to log in!!
        //get user list html by yelp_id
        //Logged-In only?  load login prompt?
        alert('list view of users per restaurant' + id);
        context.log('all users who consider this restaurant a favorite');
    });
    this.get('#/favorites/', function(context) {
      if(foodz.dev_mode === true ){
        foodz.find('term', 'Beer');
      }else{
        //  TODO: visually cycle through the 20 most recent favorites
        //  pan/zoom the map, fade in overlay info
        foodz.find('term', 'Beer');
      }
      $('#ui-dialog-title-main').html('Top Favorites');
      new_html = '<div><p>add a text-based list here as well?</p></div>'; 
      $('#main').html(new_html);
      $('#main').dialog('open');
    });
    this.get('#/search/', function(context) {
      $('#ui-dialog-title-main').html('Search');
      new_html = '<div><form action="#/search/" method="post"> <label>Search:</label> <br/>';
      new_html += '<input name="search_term" id="search_term" style="color:#CCC;" type="text"/><input value="Search" type="submit" /></div>'; 
      $('#main').html(new_html);
      $('#main').dialog('open');
    });
    this.get('#/settings/', function(context) {
      // logout / disconnect
      //<button style='display:none;' id="disconnect">Disconnect</button>
      //<button style='display:none;' id="logout">Logout</button>
      $('#main').dialog('open');
      context.log('app settings');
    });
    this.get('#/user/:id/favorites/', function(context) {
      context.log('favorite list view, per user');
      //get restaurant list html by facebook_id
      //Logged-In only?  load login prompt?
      alert('list view of favorites per user ' + id);
    });

    this.get('#/menu/', function(context) {
      $('#ui-dialog-title-main').html('MENU');
      new_html = "<p><a href='#/search/'>search</a></p><p><a href='#/favorites/'>favorites</a></p>";
      new_html += "<p><a href='#/users/'>users</a></p><p><a href='#/about/'>about</a></p>";
      if( foodz.user !== false){ new_html += "<p><a href='#/user/"+foodz.user.id+"/'>my_profile</a></p>"; }
      $('#main').html(new_html);
      $('#main').dialog('open');
    }); 

    this.get('#/users/', function(context) {
      $('#ui-dialog-title-main').html('Users');
      new_html = "<p>loading...</p>";
      $('#main').html(new_html);
      //only available to logged in users?  load login prompt?
      //this.id = this.params['id'];
      //context.log("user detail view: " + this.id);
      //if( foodz.user !== false && foodz.user.id == this.id){
      //  this.user = foodz.user;
      //}else{
      //  this.user = foodz.app.db.loadDoc(this.id); 
      //}
      //include favorite count if any
      //context.render( 'templates/user.html.erb', user );
      //this.partial('templates/user.html.erb');
      $('#main').dialog('open');
    });

    this.get('#/user/:id/', function(context) {
      //only available to logged in users?  load login prompt?
      this.id = this.params['id'];
      context.log("user detail view: " + this.id);
      if( foodz.user !== false && foodz.user.id == this.id){
        this.user = foodz.user;
      }else{
        this.user = foodz.app.db.loadDoc(this.id); 
      }
      $('#ui-dialog-title-main').html(this.user.name);
      //include favorite count if any
      //context.render( 'templates/user.html.erb', user );
      this.partial('templates/user.html.erb');
      $('#main').dialog('open');
    });

    this.get('#/login/', function(context) {
      //login?
      $('#ui-dialog-title-main').html('Would you like to login?');
      new_html = "<p>Sorry. Some features of this site require an authorized account in order to work.  Please try logging in to enable more advanced features.</p><p><button id='login_button'>Login with Facebook</button></p>";
      $('#main').html(new_html);
      //context.login_click_handler();
      //log(context.login_click_handler());
      //$('#login_button').bind('click', this.login_click_handler());
      //this.login_click_handler('#login_button');
      //log(this.login_click_handler());
      //this.login_click_handler();
      //login_click_handler('#login_button');
      $('#main').dialog('open');
      $('#login_button').bind('click', this.login_click_handler );
    });

    this.get('#/about/', function(context) {
      //welcome / about this app
      $('#ui-dialog-title-main').html('About');
      new_html = "<p>Welcome!  This couchdb demo app is currently under development.  you can find more info on <a href='https://github.com/ryanjarvinen/restaurant-adventure'>https://github.com/ryanjarvinen/restaurant-adventure</a>.</p>";
      $('#main').html(new_html);
      $('#main').dialog('open');
    });

    this.get('#/', function(context) {
      if( $('#main').dialog('isOpen'))
      { $('#main').dialog('close');}
      //default view:
      //*TODO: attempt to auto locate the search (if possible)
      //*HACK: for now, redirect to the favorites page, get straight to the action.
      //this.redirect('#/favorites/');
      //this.redirect('#/menu/');
      //this.redirect('#/menu/');
      //popup location search box
      //this.redirect('#/search/');
    });

    this.bind('run', function() {
      var context = this;
      // initialize our map
      foodz.draw_map();
      //initialize facebook api
      app_id = '0501aae0be4cc61f8b2bc429c994b7a0'; // production:
      if( foodz.dev_mode === true){ app_id = 'e0e601064838428368f05fe285c14e41'; } // development
      this.fb_init(app_id);

      //load a handler to our database
      this.db = $.couch.db("restaurant_adventure");

      $('#main').dialog({modal:true, autoOpen: false, width: 500, close: function(event, ui) { context.redirect('#/'); }});
      
      $('#menu_button').bind('click', function() {
        context.redirect('#/menu/');
      });
      
      //var xhr = this.db.request("GET", "/doc1", {
      //  body: JSON.stringify({"foo":"bar"}),
      //  headers: {"Content-Type": "application/json"}
      //});
      //var resp = JSON.parse(xhr.responseText);
      //console.log(resp);
      //context.log(resp);
    });

    this.bind('load-restaurant', function( e, data) {
      this.redirect('#/restaurant/' + data.id + '/');
    });

    //this.bind('error', function(e, data) {
    //  $('#error').text(data.message).show();
    //});
  });

  $(function() {
    app.run('#/');
  })

})(jQuery);

foodz.app = Sammy.apps['#main'];

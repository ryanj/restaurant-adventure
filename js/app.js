///SAMMY app
(function($) {
  var app = $.sammy('#main', function() {

    //routes:
    // write! - should this be a put or post?  or *not* bookmarkable?
    this.post('#/favorite/:id/', function(context) {
      //must be logged in!
      //FB.ui popup publish offer on fave()/save()?
      context.log('mark a restaurant as a favorite');
    });
    // read-only urls:
    this.get('#/restaurant/:id/', function(context) {
      //include favorite count if any
      foodz.restaurant_detail_view(id);
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
      context.log('user detail view');
    });
    this.get('#/about/', function(context) {
      //welcome / about this app
      context.log('about');
    });

    this.get('#/', function(context) {
      //default view:
      //*TODO: attempt to auto locate the search (if possible)
      //*TODO: welcome message, tos?
      //*HACK: for now, redirect to the favorites page, get straight to the action.
      this.redirect('#/favorites/');
      //this.redirect('#/about/');
    });

  });
  app.foodz = foodz;

  $(function() {
    app.run('#/');
  });

})(jQuery);



// foodz.find('term', 'Beer' );
//try asking the broswer
//popup location search box
//pan and zoom to browse (visual search)

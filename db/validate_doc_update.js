function(newDoc, oldDoc, userCtx) {

    function require(field, message) {
        message = message || "Document must have a " + field;
        if (!newDoc[field]) throw({forbidden : message});
    }

    if (newDoc.type == 'user') {
        require('name');
        require('pic');
        //favorites
    }
    
    if (newDoc.type == 'favorite') {
        require('name');
        require('lat');
        require('long');
        require('rating_img_url');
        require('url');
        //users
    }
}

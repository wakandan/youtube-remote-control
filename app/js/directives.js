'use strict';

/* Directives */


angular.module('myApp.directives', []).
directive('appVersion', ['version', function(version) {
  return function(scope, elm, attrs) {
    elm.text(version);
  };
}])
.directive('triggerYoutube', [function() {
  return {
    restrict: 'A',
    link: function(scope, elem, attr, ctrl) {
        // elem is a jquery lite object if jquery is not present,
        // but with jquery and jquery ui, it will be a full jquery object.        
      scope.$watch('searchquery', function(){
        $.ajax({
            type: "GET",
            url: 'http://gdata.youtube.com/feeds/api/videos?q=' + encodeURIComponent(scope.searchquery) + '&format=5&max-results=18&v=2&alt=jsonc',
            dataType: "jsonp",
            success: function (responseData, textStatus, XMLHttpRequest) {
                if (responseData.data.items) {
                    // var videos = responseData.data.items;
                    // playlistArr = [];
                    // playlistArr.push(videos);
                    // updateVideoDisplay(videos);
                    // pendingDoneWorking = true;
                    scope.videos = responseData.data.items;
                } else {
                    // updateSuggestedKeyword('No results for "' + keyword + '"');
                    // doneWorking();
                }
            }
        });
      }, true);	      
    }
  };
}]).directive('autoCheckPlaylist', ['$timeout', function($timeout){
    return {
        restrict: 'A',
        link: function(scope, elem , attr, ctrl){
            var timeoutId; 
            function updatePlaylist(){
                $.ajax({
                    url: "http://192.168.0.21:8080/playlist",
                    type: 'GET',
                    success: function(response){
                        if(response.playlist.length>0){
                            scope.songs = [];
                            scope.playing = response.playing;
                        }
                        //check if current playlist is the same in the server
                        //if yes, then ignore
                        if(response.playlist.length==scope.songs.length){
                            var allTheSame=true;
                            for(var i=0; i<response.playlist.length; i++){                            
                                if(response.playlist[i]!=scope.songs.id){
                                    allTheSame = false;                            
                                    break;
                                }                                    
                            }
                            if(allTheSame){
                                return;
                            }
                        }

                        //get video info for those id, synchronously
                        for(var i=0; i<response.playlist.length; i++){
                            var songid = response.playlist[i];
                            $.ajax({
                                url: 'https://gdata.youtube.com/feeds/api/videos/'+songid+'?v=2&alt=json',
                                type:'get',
                                async: false,
                                success: function(response){
                                    scope.songs.push({
                                        id: songid,
                                        title: response.entry.title.$t,
                                        thumbnail:{
                                            small: response.entry["media$group"]["media$thumbnail"][0].url,
                                            mq: response.entry["media$group"]["media$thumbnail"][1].url,
                                            hq: response.entry["media$group"]["media$thumbnail"][2].url
                                        }
                                    });                                        
                                                                
                                }
                            });
                        }
                        scope.$digest();  
                    }, 
                    error: function(jqXHR, textStatus, errorThrown ) {
                        console.log(textStatus);
                        console.log(errorThrown);
                    }
                  });
            }

             // schedule update in one second
            function updateLater() {
                // save the timeoutId for canceling
                timeoutId = $timeout(function() {
                    updatePlaylist(); // update DOM
                    updateLater(); // schedule another update
                }, 5000);
            }
             
            // listen on DOM destroy (removal) event, and cancel the next UI update
            // to prevent updating time after the DOM element was removed.
            elem.bind('$destroy', function() {
                $timeout.cancel(timeoutId);
            });
             
            updateLater(); // kick off the UI update process.
        }
    }
}]);


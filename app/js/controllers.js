'use strict';

/* Controllers */
function extract_video_id(link){
  console.log(link);
	var re = new RegExp("youtube\\.com/watch\\?v=(.{11})", "gi");
	var result = re.exec(link);
	if(result!=null){
    return result[1];
  } else {
    return null;
  }
}

var suggestedSource = [];
var handleResponse = function(data){  
  suggestedSource = [];
  for(var i=0; i<data[1].length; i++){
    suggestedSource.push(data[1][i][0]);
  }
}

angular.module('myApp.controllers', ['ui.autocomplete']).
  controller('MyCtrl1', ['$scope', '$http', '$timeout', 'socket', function($scope, $http, $timeout, socket) {       
    $scope.videos = [];    
    $scope.songsIdMapping = {};
    $scope.currentSong = 0;
    $scope.status = 'Not playing'; 
    $scope.currentSongName = "";   
    $scope.songs = [];
    $scope.playing = '';
    $scope.playlist = [];
    
    //get the initial playlist
    socket.emit('addsong', null)

    //actual search function
    $scope.search = function(){
        if($scope.searchquery){
          $.ajax({
            type: "GET",
            url: 'http://gdata.youtube.com/feeds/api/videos?q=' + encodeURIComponent($scope.searchquery) + '&format=5&max-results=18&v=2&alt=jsonc',
            dataType: "jsonp",
            success: function (responseData, textStatus, XMLHttpRequest) {
                if (responseData.data.items) {
                    // var videos = responseData.data.items;
                    // playlistArr = [];
                    // playlistArr.push(videos);
                    // updateVideoDisplay(videos);
                    // pendingDoneWorking = true;
                    console.log('search result '+responseData.data.items.length);
                    $scope.videos = responseData.data.items;
                    $scope.$digest();
                } else {
                  console.log('no result');
                    // updateSuggestedKeyword('No results for "' + keyword + '"');
                    // doneWorking();
                }
            }
          });
        }
    }

  	$scope.play = function(video){
  		// var id = extract_video_id(link);
      console.log("playing video id: "+video.id);
      $.ajax({
        url: 'http://192.168.0.21:8080/play/'+video.id,
        type: 'GET',
        success: function(){
          $scope.status = 'Playing';
          $scope.songsIdMapping[video.id] = video;
        }
      });
  	}    

    $scope.play = function(video){
        socket.emit('play', video);
    }

    $scope.stop = function(){
      $http.get('http://192.168.0.21:8080/stop')
        .success(function(data, status, headers, config){
          $scope.status = 'stopped';
        }).error(function(){
          $scope.status = 'error';
        });
    }

    $scope.next = function(){
      $http.get('http://192.168.0.21:8080/next')
        .success(function(data, status, headers, config){
          $scope.status = 'nexted';
        }).error(function(){
          $scope.status = 'error';
        });
    } 

    $scope.previous = function(){
      $http.get('http://192.168.0.21:8080/prev')
        .success(function(data, status, headers, config){
          $scope.status = 'preved';
        }).error(function(){
          $scope.status = 'error';
        });
    }    

    $scope.addplaylist = function (video) {
        socket.emit('addsong', video);
    }

    socket.on('songs', function(songs){
        $scope.playlist = songs;
    })

    $scope.fast_play = function(video_id){
      $.ajax({
        url: 'http://192.168.0.21:8080/play/'+video_id,
        type: 'GET',
        success: function(){
          $scope.status = 'Playing';
        }
      });
    }

    $scope.myOption = {
      options: {
        html: true,
        focusOpen: true,
        source: function (request, response) {
          $.ajax({
            url: "http://suggestqueries.google.com/complete/search",
            dataType: "jsonp",
            data: {
              hl: "en",
              ds: "yt",
              client: "youtube",
              hjson: 't',
              q: request.term
            },
            success: function( data ) {
              response($.map(data[1], function(item){
                return {
                  label: item[0],
                  value: item[0]
                }
              }))
            }
        });
      }
    }
  };

  }]);

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
  controller('MyCtrl1', ['$scope', '$http', '$timeout', function($scope, $http, $timeout) {
    
    $scope.songs = [];
    $scope.songsIdMapping = {};
    $scope.currentSong = 0;
    $scope.status = 'Not playing'; 
    $scope.currentSongName = "";   
  	$scope.play = function(video){
  		// var id = extract_video_id(link);
      console.log("playing video id: "+video.id);
      $.ajax({
        url: 'http://192.168.0.21:8080/play/'+video.id,
        type: 'GET',
        success: function(){
          $scope.status = 'Playing';
          $scope.currentSongName = video.title;
          $scope.songs.push(video);
          $scope.songsIdMapping[video.id] = video;
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

    $scope.stop = function(){
      $http.get('http://192.168.0.21:8080/stop')
        .success(function(data, status, headers, config){
          $scope.status = 'stopped';
        }).error(function(){
          $scope.status = 'error';
        });
    }

    $scope.next = function(){
      $scope.currentSong += 1;
      $scope.play($scope.songs[$scope.currentSong].id);
    } 

    $scope.previous = function(){
      $scope.currentSong -= 1;
      $scope.play($scope.songs[$scope.currentSong].id);
    }    

    $scope.canPrevious = function(){
      return $scope.currentSong>0;
    }

    $scope.canNext = function(){
      return $scope.currentSong<$scope.songs.length;
    }
      
    // $(function(){
    //   $('#textSearchQuery').autocomplete({
    //     source: function(request, response){
           
    //       });
    //     },
    //     minLength: 2
    //   });
    // });    

  }])
  .controller('MyCtrl2', [function() {

  }]);
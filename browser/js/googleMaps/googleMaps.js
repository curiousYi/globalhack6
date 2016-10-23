app.config(function ($stateProvider) {

    $stateProvider.state('jobsMap', {
        url: '/jobs-map',
        templateUrl: './js/googleMaps/googleMaps.html',
        controller: 'jobsMapCtrl',
        resolve: {
            jobs: function(jobLocsFactory){
                return jobLocsFactory.getJobs();
            },
        }
    });

});


app.controller( 'jobsMapCtrl', function($scope, jobLocsFactory, jobs){
     angular.extend($scope, {
        map: {
            center: {
                latitude: 38.627,
                longitude:-90.197
            },
            zoom: 12,
            markers: [],
            events: {
                click: function (map, eventName, originalEventArgs) {
                    var e = originalEventArgs[0];
                    var lat = e.latLng.lat(),lon = e.latLng.lng();
                    var marker = {
                        id: Date.now(),
                        coords: {
                            latitude: lat,
                            longitude: lon
                        },
                    };
                    $scope.map.markers.push(marker);
                }
            }
        }
    });

    markerInit(jobs);

    function markerInit (jobs) {
        jobs.forEach(job => {
            var marker = {
                id: Date.now(),
                coords: {
                    latitude: job.latitude,
                    longitude: job.longitude
                },
            };
            $scope.map.markers.push(marker);
        })
    }
})

app.factory('jobLocsFactory', function($http){
    var jobLocsFactory = {};

    jobLocsFactory.getJobs = function(){
        return $http.get('/api/jobLocs')
        .then(res => res.data)
    }

    jobLocsFactory.postNewJob = function(){
        return $http.post('/api/jobLocs')
    }
    return jobLocsFactory;
})
// app.factory('SecretStash', function ($http) {

//     var getStash = function () {
//         return $http.get('/api/members/secret-stash').then(function (response) {
//             return response.data;
//         });
//     };

//     return {
//         getStash: getStash
//     };

// });


app.config(function(uiGmapGoogleMapApiProvider) {
    uiGmapGoogleMapApiProvider.configure({
        key: 'AIzaSyAdN3TfE13kxOFBRcgOQiRSsSs1_TFly8s',
        v: '3.20', //defaults to latest 3.X anyhow
        libraries: 'weather,geometry,visualization'
    });
})

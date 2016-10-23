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
    var idCounter = 0;
    $scope.infoWindowArrays = [];

     angular.extend($scope, {
        map: {
            center: {
                latitude: 38.627,
                longitude:-90.197
            },
            zoom: 12,
            markers: [],
            events: {
                click: function (map, eventName, model, originalEventArgs, $scope) {
                    // console.log('hey there');
                    // console.log('Marker was clicked' + map)
                    //                     console.log('eventName' + eventName)
                    //                     console.log('model' + model)
                    //                     console.log('originalEventArgs' + originalEventArgs)

                    // var e = originalEventArgs[0];
                    // var lat = e.latLng.lat(),lon = e.latLng.lng();
                    // var marker = {
                    //     id: Date.now(),
                    //     coords: {
                    //         latitude: lat,
                    //         longitude: lon
                    //     },
                    // };
                    // $scope.map.markers.push(marker);
                }
            }
        }
    });

    markerInit(jobs, idCounter, $scope);

    function markerInit (jobs, idCounter, $scope) {
        console.log('heres the $scope', $scope);
        var infoWindowsArrays = $scope.infoWindowArrays;

        jobs.forEach(job => {
            var newInfoWindow = new google.maps.InfoWindow({
                content: '<div id="content"> <b>'+
                'Name of Employer: </b>' + job.employer +
            '</div>'+'<div ><b>'+
                'Description: </b>' + job.description +
            '</div>'+'<div > <b>'+
                'Industry: </b>' + job.industry +
            '</div>'
            ,
                maxWidth: 200
            })
            // console.log('heres the var infoWindowsArrays ', infoWindowsArrays)
            infoWindowsArrays.push(newInfoWindow)

            var marker = {
                id: idCounter,
                coords: {
                    latitude: job.latitude,
                    longitude: job.longitude
                },
                markerEvents: {
                    click: function (marker, eventName, model, originalEventArgs) {
                        // console.log('hey there');
                        console.log('heres infoWindowArrays ,', infoWindowsArrays[model.idKey])
                        infoWindowsArrays[model.idKey].open(model.map,marker);
                        console.log('Marker was clicked', marker)
                        console.log('heres this ', this)
                        console.log('eventName', eventName)
                        console.log('model', model)
                        console.log('originalEventArgs', originalEventArgs)
                        console.log('heres the var infoWindowsArrays click event in marker', infoWindowsArrays)
                    }
                },
                // infowindow: new google.maps.InfoWindow({
                //     content: 'Hey there',
                //     maxWidth: 200
                // })
            };
            $scope.map.markers.push(marker);
            idCounter++;
        })
    }

    $scope.seeInfo = function(marker){
        console.log('here is the marker you clicked', marker)
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
